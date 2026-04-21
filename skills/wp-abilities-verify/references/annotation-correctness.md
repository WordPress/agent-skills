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
and `idempotent: true` ("same input, same result, same effect").

## The three claims

| Annotation | What it promises | What to check |
|---|---|---|
| `readonly: true` | No writes. GET-style side-effect-free. | No `wpdb->insert/update/delete`, `update_option`, `wp_insert_*`, non-GET delegates, etc. |
| `destructive: false` | Won't irreversibly destroy data or forfeit money. | No `wp_delete_*`, `wp_trash_post`, `->refund`, `->cancel`, `->close_dispute`. |
| `idempotent: true` | Same input always produces same effect. | No `rand()`, nonce generation, sequence increments, timestamps-in-response. Runtime: twin invocations byte-identical. |

These overlap but are not redundant: `readonly` is the strictest,
`destructive: false` is weaker (updates that don't destroy are OK), and
`idempotent` is orthogonal (a POST that writes the same row twice is both
"writes" and "idempotent").

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
grep -nE '\bdelete_user_data\s*\(' <file>
grep -nE '\bwp_delete_user\s*\(' <file>
```

### Step 4 — idempotent-but-nondeterministic check

Against callbacks annotated `idempotent: true`:

```bash
# Randomness.
grep -nE '\b(rand|mt_rand|random_int|random_bytes|wp_rand)\s*\(' <file>
grep -nE '\bwp_generate_(uuid4|password|auth_cookie)\s*\(' <file>

# Nonce generation (per-call, non-deterministic by design).
grep -nE '\bwp_create_nonce\s*\(' <file>

# Time-based payloads — time() in the response means twin calls differ.
# Flag as WARN, not FAIL: many legitimate read callbacks include a
# `generated_at` field. Runtime byte-comparison catches the real violations.
grep -nE '\b(time|microtime|current_time|date|wp_date)\s*\(' <file>

# Sequence increments.
grep -nE '\+\+\s*;|\$[a-z_]+\s*\+=\s*1\b' <file>
```

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
| `wp_remote_post` / `wp_remote_delete` | FAIL | WARN |
| `set_transient` / `delete_transient` | WARN (caching is ambiguous) | OK |
| `rand()` / `wp_create_nonce` | N/A | N/A |
| `time()` in response | N/A | N/A |

Severity is deliberately sharp on the patterns that matter (deletion,
money-moving verbs, non-GET delegates) and soft on ambiguous patterns
(transients, time-in-response) to preserve signal quality.

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

| Pattern | Why it's legitimate on a readonly ability |
|---|---|
| `set_transient($cache_key, $data, ...)` after a cache-miss | Read-through cache populating on fetch. Side-effect, but not a semantic write. Suppress with `// verify-ignore: readonly`. |
| `update_user_meta( $user_id, 'last_read_at', time() )` | Tracking that the user read something. Arguably a write, but doesn't change the data the ability returns. WARN, not FAIL. |
| `do_action( 'my_plugin_after_read', ... )` | Emitting an event. If a listener writes, that's on the listener, not the ability. OK. |
| `$logger->info(...)` or similar logging | Diagnostic, not a semantic write. OK. |

Anything not in this list should be reviewed case-by-case. Don't add
entries speculatively — only add one after hitting a real false positive
in a real audit.

## Runtime check complement

When runtime mode is on, add one more check that static cannot do:
**twin-invocation diff for `idempotent: true` abilities**.

```bash
# Via wp-cli (substitute the plugin's env-up + wp-cli invocation per AGENTS.md).
<env-cli> wp --user=admin eval '
$a = wp_get_ability( "<plugin>/<ability>" );
$r1 = $a->execute( [ <same-input> ] );
$r2 = $a->execute( [ <same-input> ] );
echo var_export( $r1 === $r2, true ) . PHP_EOL;  // should print "true"
echo md5( serialize( $r1 ) ) . PHP_EOL;
echo md5( serialize( $r2 ) ) . PHP_EOL;
'
```

Expected output: `true` followed by two identical hashes. Differ → FAIL
with the two serialized payloads as evidence.

Note: `idempotent: true` abilities that legitimately embed a timestamp
(e.g. `generated_at` in the response) will fail this strict check. Either
remove the timestamp (preferred — it's never load-bearing for the agent)
or loosen the annotation to `idempotent: false`.

## Report format

Each adversarial check finding gets one row in the run's
"Annotation correctness" table:

```markdown
| Ability | Claim | Result | Evidence |
|---|---|---|---|
| woopayments/get-disputes | readonly=true | OK | no write patterns detected |
| woopayments/get-transactions | readonly=true | FAIL | `src/Abilities/Transactions.php:142`: `$wpdb->update( $table, ... )` |
| woopayments/submit-dispute-evidence | destructive=false | OK | no destructive patterns detected |
| woopayments/submit-dispute-evidence | idempotent=false | N/A | not claimed idempotent |
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
