# Annotation Correctness

The adversarial core of this skill: verify what the annotation claims
by reading the callback. A `readonly: true` ability that actually
writes is a security and UX disaster, and unit tests don't catch it
because the mock looks just like the real writer.

## Why this matters

Agents plan actions on the basis of the annotations they introspect.
If an ability is annotated `readonly: true`, an orchestrator will
confidently invoke it in a dry-run, speculative exploration, or
multi-agent fan-out without thinking twice — because `readonly` means
"can't break anything".

A `readonly: true` ability that actually writes is therefore:

1. **A security hazard** — agents will invoke it in contexts where
   side effects are forbidden.
2. **A UX disaster** — the agent's mental model of what happened
   diverges silently from reality.
3. **Undetectable at the annotation layer** — the annotation says
   `readonly: true`; nothing in the registration forces it to be true.

Unit tests won't catch this class of bug because the mock the test
constructs looks just like the real writer. What catches it is reading
the execute callback body and comparing what it does against what the
annotation says it does.

## What each annotation promises

| Annotation | What it promises (from core) |
|---|---|
| `readonly: true` | No durable writes to user / business state. GET-style side-effect-free. |
| `destructive: false` | Won't irreversibly destroy data or forfeit money. |
| `idempotent: true` | Repeated calls with the same arguments produce no additional effect on the environment (per the `idempotent` annotation's docblock in `class-wp-ability.php`). |

`readonly: true` prohibits durable writes to user or business state.
Read-through cache writes (e.g. `set_transient`) and observability
timestamps (e.g. `last_read_at`) are acceptable when explicitly
annotated with `verify-ignore` — see the "Suppressing legitimate
exceptions" section below. The static check treats unannotated writes
as FAILs; annotated ones pass with the reason recorded as evidence.

These overlap but are not redundant: `readonly` is the strictest;
`destructive: false` is weaker (updates that don't destroy are OK);
`idempotent` is orthogonal (a POST that writes the same row twice is
both "writes" and "idempotent").

The Abilities REST run controller operationalizes annotations into
HTTP method routing (`readonly: true` → GET, `destructive && idempotent`
→ DELETE, otherwise POST — see
`WP_REST_Abilities_V1_Run_Controller::validate_request_method()`). That
mapping is the load-bearing semantic; verify checks that each
callback's behavior is consistent with how the routing will treat it.

## How to verify

For each ability, locate the `execute_callback` body (see
`static-enumeration.md` step 4), then:

1. **Read the callback end-to-end.** Form a model of what it actually
   does. Don't rely on pattern-matching alone.
2. **Compare to the claim.** A `readonly: true` callback that writes
   anywhere — the database via `$wpdb`, options / post / user / term /
   comment writes, filesystem, cron schedules, or non-GET HTTP/REST
   delegates — FAILs readonly. A `destructive: false` callback that
   deletes, refunds, voids, cancels, or trashes FAILs destructive. An
   `idempotent: true` callback whose environmental effect *accumulates*
   per call (counters, append-only logs, per-call cron schedules) FAILs
   idempotent.
3. **Record evidence.** Cite file + line of the offending pattern so a
   reviewer can jump straight to it.

Use grep or ripgrep to surface *candidates*. Common writes worth
looking for:

```text
$wpdb->update / insert / delete / replace
update_option / add_option / delete_option
wp_insert_post / wp_update_post / wp_delete_post
update_post_meta / update_user_meta / update_term_meta
->save / ->delete / ->set_status / ->add_*
wp_remote_post / wp_remote_delete
file_put_contents / wp_upload_bits / unlink / rename
wp_schedule_event / wp_schedule_single_event
```

Treat the list as a starting set, not a checklist. Plugin vocabularies
vary — domain-specific verbs (`->markAsPaid`, `->commit`, `->refund`)
and framework patterns (Doctrine `->persist`, queue `->dispatch`) won't
appear above. Once you've grepped for candidates, read the callback to
confirm whether each hit is actually a write and whether it
contradicts the annotation in context.

## Known blind spots

Static reading + grep can't reach every write. A static-mode PASS
means "no obvious-shape violations," not "verified write-free."

| Blind spot | Why static misses it | Mitigation |
|---|---|---|
| Indirected service writes — `$repo->persist()`, `$service->commit()`, custom verbs. | Any finite verb list drifts; domain vocabulary varies. | Inspect callbacks that touch custom services or repositories. |
| `do_action()` whose listeners write. | Provenance ambiguity: ability looks clean; system mutates state in a listener. | Audit listeners on the action. If any writes, downgrade or split. |
| Implicit core hooks fired by WP API calls — `wp_insert_post()` fires `save_post`; `update_option()` fires `updated_option`; `wp_create_user()` fires `user_register`; etc. | The WP API call IS the write; the hooks fire automatically as a side effect. Agents looking for `do_action()` won't see this. | Treat any WP write-API call as a write regardless of whether the callback also calls `do_action()`. |
| Action Scheduler / deferred writes — `as_schedule_single_action()`, `WC()->queue()->schedule_single()`, custom job dispatchers. | The callback returns cleanly with no immediately visible DB mutation; the durable write lands later in the AS tables. A static grep for `$wpdb->insert` won't catch it. | Treat scheduler dispatches as writes. The "no additional effect on the environment" promise of `idempotent: true` is violated by accumulating queued jobs even if the immediate return value is constant. |
| Variable-built HTTP methods on delegate helpers. | Static can't follow runtime values. | Treat callers of helpers whose default method isn't `GET` as suspect. |
| Tautological capability gates — `current_user_can('read')` on a "private" ability. | The cap looks valid; subscribers happen to hold it. | Cross-reference the permission roundtrip — subscribers should be denied. |

For high-stakes plugins, run runtime mode (see `runtime-harness.md`)
before landing — it catches some blind spots via twin-invocation diff
and live state inspection.

## Suppressing legitimate exceptions

When a pattern that looks like a write is semantically a read (e.g.
populating a read-through cache via `set_transient`, updating a
`last_read_at` timestamp for tracking, diagnostic logging), suppress
with an inline comment on the offending line:

```php
// verify-ignore: readonly -- writes to read-through cache; semantically a read.
set_transient( $cache_key, $data, HOUR_IN_SECONDS );
```

Format: `// verify-ignore: <annotation> -- <reason>`. Legal annotation
names: `readonly`, `destructive`, `idempotent`, `all`. Narrower is
better than `all`.

## Runtime check complement

For `idempotent: true` abilities, runtime mode adds a heuristic: invoke
twice with the same input and compare. See `runtime-harness.md`
Check 6. Differing returns are a *signal* to inspect, not a verdict —
under core's definition, the question is whether the *environment*
changed, not whether the *return value* matches. A response that
embeds a per-call timestamp / nonce / random ID is fine; a response
that reflects a counter that grew between calls is not.

## Report format

Each finding gets one row in the run's "Annotation correctness" table:

```markdown
| Ability | Claim | Result | Evidence |
|---|---|---|---|
| myplugin/get-things | readonly=true | OK | callback reads only |
| myplugin/get-things-with-counts | readonly=true | FAIL | `src/Abilities/Things.php:142`: `$wpdb->update( $table, ... )` |
| myplugin/submit-thing | destructive=false | OK | no destructive patterns |
| myplugin/submit-thing | idempotent=false | OK | check only applies when idempotent=true; false annotation acknowledged |
```

The evidence column MUST cite file + line so a reviewer can jump
straight to the issue.
