# Annotation Correctness

The adversarial core of this skill. This is what makes `wp-abilities-verify`
a distinct skill rather than a thin wrapper around "run the tests".

## Why this matters

Agents plan actions on the basis of the annotations they introspect. If an
ability is annotated `readonly: true`, an orchestrator will confidently
invoke it in a dry-run, speculative exploration, or multi-agent fan-out
without thinking twice — because `readonly` means "can't break anything".

A `readonly: true` ability that actually writes is therefore:

1. **A security hazard** — agents will invoke it in contexts where side
   effects are forbidden.
2. **A UX disaster** — the agent's mental model of what happened diverges
   silently from reality. The human operator can't reason about what
   state the system is in.
3. **Undetectable at the annotation-layer** — the annotation says
   `readonly: true`; nothing in the registration forces it to be true.

Unit tests won't catch this class of bug because the mock the test
constructs looks just like the real writer. What catches it is reading the
execute callback body and comparing what it does against what the
annotation says it does. That's this file.

The same logic applies to `destructive: false` ("won't delete anything")
and `idempotent: true` ("repeated calls with the same arguments produce
no additional effect on the environment" — core's docblock at
`class-wp-ability.php` lines 47-48).

## The three claims

| Annotation | What it promises | What to check |
|---|---|---|
| `readonly: true` | No writes. GET-style side-effect-free. | No `wpdb->insert/update/delete`, `update_option`, `wp_insert_*`, non-GET delegates, etc. |
| `destructive: false` | Won't irreversibly destroy data or forfeit money. | No `wp_delete_*`, `wp_trash_post`, `->refund`, `->cancel`, `->close_dispute`. |
| `idempotent: true` | Repeated calls with the same arguments produce no additional environmental effect (core's definition). | No counter writes that grow per call, no per-call cron schedules, no sequence increments writing back to durable state. Runtime twin-invocation diff is a heuristic to flag candidates, not a verdict. |

These overlap but are not redundant: `readonly` is the strictest,
`destructive: false` is weaker (updates that don't destroy are OK), and
`idempotent` is orthogonal (a POST that writes the same row twice is both
"writes" and "idempotent").

The run controller operationalizes annotations into HTTP method routing
(`readonly: true` → GET, `destructive && idempotent` → DELETE, otherwise
POST — see `class-wp-rest-abilities-v1-run-controller.php` lines 110-116).
That's the load-bearing semantic — verify checks that the callback's
behavior matches what the routing assumes.

## Static adversarial checks

These grep-based checks run against the plugin checkout with no env.
They're the heart of the skill.

### Step 1 — locate the execute callback body

For each ability in the static inventory, resolve its `execute_callback`:

```bash
# 1. Find the ability registration.
grep -rn "wp_register_ability( *'<plugin>/<ability-name>'" <plugin-root>/

# 2. Find the execute_callback => key in the same array literal.
#    Usually a few lines below the name.

# 3. The callback value is either:
#    a) [ ClassName::class, 'method' ] — look in ClassName for `public function method` or `public static function method`.
#    b) [ $this, 'method' ] — look in the current class.
#    c) 'function_name' — look for `function function_name` top-level.
#    d) An anonymous function — the body is literally there.
```

Record the file + starting line + ending line of the callback. All
subsequent greps target that byte range.

### Step 2 — readonly-but-writes check

Against callbacks annotated `readonly: true`, run these patterns. ANY hit
means the annotation is a lie and the ability FAILs the adversarial check.

```bash
# Direct $wpdb writes.
grep -nE '\$wpdb->(update|insert|delete|replace)\b' <file> | awk -v s=<start> -v e=<end> '$1 >= s && $1 <= e'

# Raw SQL with write verbs.
grep -nE '\$wpdb->query\s*\([^)]*(UPDATE|INSERT|DELETE|REPLACE|TRUNCATE|ALTER)' <file>

# Options API writes.
grep -nE '\b(update_option|add_option|delete_option|update_site_option|add_site_option|delete_site_option)\s*\(' <file>

# Post and post-meta writes.
grep -nE '\bwp_(insert|update|delete|trash)_post\s*\(' <file>
grep -nE '\b(update|add|delete)_post_meta\s*\(' <file>

# User writes.
grep -nE '\bwp_(insert|update|delete)_user\s*\(' <file>
grep -nE '\b(update|add|delete)_user_meta\s*\(' <file>

# Term writes.
grep -nE '\bwp_(insert|update|delete)_term\s*\(' <file>
grep -nE '\b(update|add|delete)_term_meta\s*\(' <file>

# Comment writes.
grep -nE '\bwp_(insert|update|delete|trash|spam)_comment\s*\(' <file>

# Method-name write-verb patterns on controllers / services.
grep -nE '->(create|insert|update|delete|remove|save|store|write|destroy|purge|archive|restore|disable|enable|activate|deactivate|revoke|grant)_' <file>

# Non-GET HTTP delegations.
grep -nE '\bwp_remote_(post|request|delete)\b' <file>
grep -nE "delegate_to_rest_controller\s*\([^)]*(POST|PUT|DELETE|PATCH)" <file>

# Inline non-GET WP_REST_Request construction (without the delegate helper).
grep -nE "new\s+\\\\?WP_REST_Request\s*\(\s*['\"](POST|PUT|DELETE|PATCH)" <file>

# Filesystem writes — durable state changes that tools/list cannot describe.
grep -nE '\b(file_put_contents|wp_upload_bits|fwrite|fputs|unlink|rename|mkdir|rmdir|copy|move_uploaded_file)\s*\(' <file>
grep -nE 'WP_Filesystem(_Direct)?\s*->\s*(put_contents|delete|move|copy|mkdir|rmdir)' <file>

# Cron and scheduler writes — mutate the cron options table even on "readonly" abilities.
grep -nE '\bwp_(schedule_event|schedule_single_event|reschedule_event|unschedule_event|clear_scheduled_hook)\s*\(' <file>

# Transients — may be legitimate read-path caching; flag as WARN not FAIL.
# See "False-positive allow-list" below.
grep -nE '\b(set_transient|delete_transient|set_site_transient|delete_site_transient)\s*\(' <file>
```

### Step 3 — destructive-but-says-false check

Against callbacks annotated `destructive: false`:

```bash
# Deletion verbs.
grep -nE '\bwp_(delete|trash)_(post|user|term|comment|attachment)\s*\(' <file>
grep -nE '->(delete|destroy|purge|revoke|forfeit|cancel|refund|chargeback|close_dispute|void|terminate)_' <file>

# Payment-system destructive verbs.
grep -nE '->(refund|cancel|void|dispute|chargeback)\s*\(' <file>

# Data-removal verbs.
grep -nE '\bwp_delete_user\s*\(' <file>
```

### Step 4 — idempotent-but-non-idempotent check

Against callbacks annotated `idempotent: true`. Idempotency in core
means *repeated calls with the same arguments have no additional effect
on the environment* — it's about environmental writes, not return-value
determinism. The patterns to catch are per-call writes whose effect
accumulates:

```bash
# Counter or sequence-style writes — value grows per call.
grep -nE '\b(update_option|update_post_meta|update_user_meta)\s*\([^)]*get_(option|post_meta|user_meta)' <file>

# Per-call cron schedules — wp_schedule_event creates a new timer each
# call; wp_schedule_single_event is non-idempotent unless the call site
# explicitly checks for an existing scheduled hook first.
grep -nE '\bwp_schedule_(single_)?event\s*\(' <file>

# Append-only inserts on a per-call basis (logs, audit trails).
grep -nE '\$wpdb->insert\s*\(' <file>

# Sequence increments visible in callback scope.
grep -nE '\+\+\s*;|\$[a-z_]+\s*\+=\s*1\b' <file>
```

Patterns that *don't* violate core's idempotent (do not auto-FAIL — kept
here so the check doesn't snare them):

- `rand()`, `wp_rand()`, `wp_generate_uuid4()`, `wp_create_nonce()` —
  produce a different return value per call, but the environment is
  unchanged. Idempotent under core's reading.
- `time()`, `current_time()`, `microtime()` — read-only clock access.
  Embedding the result in the response is fine; only flag if the value
  is *written* into per-call growing state.

## Precedence and severity

Not every hit is equal weight.

| Pattern | Severity on `readonly: true` | Severity on `destructive: false` |
|---|---|---|
| `wpdb->update/insert/delete` | FAIL | FAIL (delete) / WARN (update) |
| `update_option` / `update_post_meta` | FAIL | WARN |
| `wp_insert_*` / `wp_update_*` | FAIL | WARN (unless delete) |
| `wp_delete_*` / `wp_trash_*` | FAIL | FAIL |
| `->refund`, `->cancel`, `->close_dispute` | FAIL | FAIL |
| Non-GET `delegate_to_rest_controller` | FAIL | depends on method |
| Inline `new WP_REST_Request('POST', ...)` | FAIL | depends on method |
| `wp_remote_post` / `wp_remote_delete` | FAIL | WARN |
| `file_put_contents`, `wp_upload_bits`, `WP_Filesystem->put_contents`, `unlink`, `rename` | FAIL | FAIL (delete) / WARN (write) |
| `wp_schedule_event` / `wp_schedule_single_event` / `wp_clear_scheduled_hook` | FAIL | WARN |
| `set_transient` / `delete_transient` | WARN (caching is ambiguous) | OK |
| `rand()` / `wp_create_nonce` | N/A | N/A |
| `time()` in response | N/A | N/A |

Severity is deliberately sharp on the patterns that matter (deletion,
money-moving verbs, non-GET delegates) and soft on ambiguous patterns
(transients, time-in-response) to preserve signal quality.

## Known blind spots

Grep cannot reach every write. Static-mode PASS is "no obvious-shape
violations," not "verified write-free." When verifying a high-stakes
ability, run runtime mode and inspect the callback by hand for these
patterns:

| Blind spot | Why grep misses it | Mitigation |
|---|---|---|
| **Indirected service writes** — `$repo->persist()`, `$service->commit()`, `$model->flush()`, `->markAsPaid()` (camelCase), `->set()` (Doctrine), `->put()` (key-value), `->push()` (queue), `->dispatch_job()` | The verb list is finite and excludes domain-specific or framework-specific mutating verbs. | Inspect the callback when the ability touches any custom service/repository. Add the verb to the regex if it's recurring. |
| **`do_action()` whose listeners write** | The ability itself emits an event; the write happens in a registered listener. Provenance ambiguity: the readonly-by-design ability is conceptually clean but the system mutates state. | Audit registered listeners on the action. If any write, downgrade the ability to `readonly: false` or split the event-emission out of the read path. |
| **Variable-built or default HTTP method on `delegate_to_rest_controller`** — `$method = $is_write ? 'POST' : 'GET'; delegate_to_rest_controller(..., $method);` | The regex matches a literal token, not a variable. | When the helper signature defaults `$http_method` to anything other than `'GET'`, treat all callers as suspect. |
| **WP-CLI invocations from inside an ability** — `WP_CLI::runcommand('option update foo bar')` | Not in any pattern list. | Rare in production; if present, treat as a destructive escape hatch and require explicit annotation. |
| **Tautological capability gates** — `permission_callback` whose body returns `current_user_can('read')` (a cap every logged-in user holds) | Static mode records cap as `read`; subscribers pass. Runtime catches it because subscriber assertions fail. | Cross-reference the permission roundtrip step; flag any cap that all logged-in users hold. |

The blind-spot list is the reason the skill lists `readonly: true` as
the *strongest* claim and `destructive: false` as a *weaker* one. A
plugin that registers everything as `destructive: true` and
`idempotent: false` and lets `readonly` be the only annotated promise
gets the most value out of the static checks.

## False-positive allow-list

Some legitimate patterns trip these checks. Two suppression mechanisms:

### Inline suppression — per-line

Add a comment immediately before or on the offending line:

```php
// verify-ignore: readonly -- writes to read-through cache; semantically a read.
set_transient( $cache_key, $data, HOUR_IN_SECONDS );
```

Suppression format: `// verify-ignore: <annotation-name> -- <one-line reason>`.

Legal annotation names: `readonly`, `destructive`, `idempotent`, `all`.

The grep-scanner skips any line with a matching `verify-ignore` comment.
`// verify-ignore: all` suppresses every check on that line; narrower is
better.

### File-level allow-list — in this reference

Patterns that recur across many plugins get listed here so agents don't
re-invent the suppression rationale:

| Pattern | Why it's legitimate on a readonly ability | Caveat |
|---|---|---|
| `set_transient($cache_key, $data, ...)` after a cache-miss | Read-through cache populating on fetch. Side-effect, but not a semantic write. Suppress with `// verify-ignore: readonly`. | Don't allow when the transient is a rate-limit counter or a write-counter — that's a real state mutation. Reviewers should check what's actually being cached before rubber-stamping the suppression. |
| `update_user_meta( $user_id, 'last_read_at', time() )` | Tracking that the user read something. Arguably a write, but doesn't change the data the ability returns. WARN, not FAIL. | — |
| `do_action( 'my_plugin_after_read', ... )` with no known write-listener | Emitting an event. If no registered listener writes, the ability stays clean. | Check listeners. If any listener writes, the ability is no longer cleanly readonly; either downgrade the annotation or move the action emission outside the read path. |
| `$logger->info(...)` or similar logging | Diagnostic, not a semantic write. OK. | — |

Anything not in this list should be reviewed case-by-case. Don't add
entries speculatively — only add one after hitting a real false positive
in a real audit.

## Runtime check complement

When runtime mode is on, add a heuristic for `idempotent: true`
abilities: invoke twice with the same input, then inspect what changed.

```bash
# Via wp-cli (substitute the plugin's env-up + wp-cli invocation per AGENTS.md).
<env-cli> wp --user=admin eval '
$a = wp_get_ability( "<plugin>/<ability>" );
$r1 = $a->execute( [ <same-input> ] );
$r2 = $a->execute( [ <same-input> ] );
echo var_export( $r1 === $r2, true ) . PHP_EOL;
echo md5( serialize( $r1 ) ) . PHP_EOL;
echo md5( serialize( $r2 ) ) . PHP_EOL;
'
```

Interpretation:

- Hashes match → cheap PASS. Same input produced the same response, and
  any environmental writes (write abilities) were the same on both calls.
- Hashes differ → *signal*, not verdict. Per core's definition, idempotent
  means "no additional effect on the environment" — return-value equality
  is neither necessary nor sufficient. Inspect what changed:
  - Response embeds a per-call timestamp / nonce / random ID → environment
    unchanged. Still idempotent. Optionally remove the field if the agent
    doesn't need it.
  - Response reflects a counter or sequence that grew between calls →
    real environmental change. FAIL: drop the `idempotent: true`
    annotation or fix the underlying write to be input-determined.

For ambiguous cases (response varies but no obvious counter), supplement
with a state diff: snapshot a representative table or option before call
1, snapshot after call 2, diff. If state changed by more than what the
input writes would explain, the ability is non-idempotent.

## Report format

Each adversarial check finding gets one row in the run's
"Annotation correctness" table:

```markdown
| Ability | Claim | Result | Evidence |
|---|---|---|---|
| myplugin/get-things | readonly=true | OK | no write patterns detected |
| myplugin/get-things-with-counts | readonly=true | FAIL | `src/Abilities/Things.php:142`: `$wpdb->update( $table, ... )` |
| myplugin/submit-thing | destructive=false | OK | no destructive patterns detected |
| myplugin/submit-thing | idempotent=false | N/A | not claimed idempotent |
```

The evidence column MUST cite the file + line number of the offending
pattern, so a reviewer can jump straight to the lie and either fix the
code or add a suppression.

## Why grep and not a full PHP parser

A full AST parser (`nikic/php-parser`) would catch more edge cases —
method-chain writes via variable indirection, for instance. But:

1. It requires Composer + a PHP environment just to run the static check.
2. It slows down the check from <1s to tens of seconds on a large plugin.
3. It adds a dependency verify has to maintain.

Grep catches 90%+ of real violations with no dependencies. The 10% that
slip through surface in runtime mode via the twin-invocation diff or via
code review. A future contribution can add an opt-in AST-based variant if
we hit enough false-negatives to justify the complexity.

## Escalation

If verify trips a false positive on a pattern that's genuinely common
across plugins (not a plugin-specific quirk), add it to the "File-level
allow-list" above in a focused PR. Include the rationale. Don't loosen
the regex patterns — narrower with an explicit allow-list is easier to
audit than broader regexes.
