---
name: wp-abilities-verify
description: "Verify a WordPress plugin's Abilities API registrations: enumerate abilities via REST, check annotation correctness including the adversarial readonly-but-writes detection, validate permissions and schemas, and validate audit documents produced by wp-abilities-audit."
compatibility: "Targets WordPress 6.9+ plugins (PHP 7.2.24+). Requires a runnable environment (wp-env, docker-based dev stack, or equivalent) for runtime mode; static mode runs entirely from the plugin checkout with no env. Filesystem-based agent with bash + node."
---

# WP Abilities Verify

Verify a WordPress plugin's Abilities API registrations. The centerpiece is
the **adversarial annotation-correctness check**: a `readonly: true` ability
that actually writes (via `wpdb->update`, `update_option`, `wp_insert_*`, a
non-GET delegate, etc.) is a security and UX disaster because agents plan
actions on the basis of the annotations they introspect. This skill catches
those lies.

The skill also validates audit docs produced by `wp-abilities-audit`,
runs permission and schema lints, and optionally executes each ability
against a live environment.

## When to use

- After abilities have been registered in the plugin but before a PR lands.
- As a health-check on an already-shipped plugin (catch regressions where a
  refactor turned a readonly ability into a writing one).
- To validate an audit document before handing it to an implementer.

## Two modes

- **Static mode** — runs from the plugin checkout. No env. Enumerates via
  source grep, runs the adversarial readonly-but-writes checks, runs schema
  and permission lints, and validates audit docs.
- **Runtime mode** — requires a running env. Does everything static does
  PLUS: `wp_get_abilities()` for authoritative enumeration, executes each
  ability with curated inputs, confirms permission roundtrip against real
  users, and runs a twin-invocation heuristic on `idempotent: true`
  abilities to flag candidates for review (return-value equality is a
  signal, not a verdict — core defines idempotent as "no additional
  effect on the environment").

Both modes produce the same structured report format.

### Static-mode coverage caveats

Static mode is grep-driven. It catches the high-leverage bug class
(`readonly: true` ability that obviously writes via `$wpdb`, options API,
`wp_insert_*`, or non-GET delegate) but does NOT detect every possible
write. Known blind spots:

- **Indirected service writes** — `$service->commit()`, `$repo->persist()`,
  camelCase verbs (`->markAsPaid()`), or any custom-named mutating method
  that doesn't match the documented verb list.
- **Hooks-as-writes** — `do_action()` whose listeners write. The ability
  itself looks readonly; the side effect happens in a registered listener.
- **Cron / scheduling writes** — `wp_schedule_event` and friends mutate
  the cron options table.
- **Filesystem writes** — `file_put_contents`, `wp_upload_bits`,
  `WP_Filesystem->put_contents`, `fwrite`, `unlink`, `rename`.
- **Method-default in delegate helpers** — a `delegate_to_rest_controller`
  whose HTTP method is built from a variable or a default-changed
  signature won't trip the literal-method regex.
- **Inline `new WP_REST_Request('POST', ...)`** without going through
  the delegate helper.

Treat a static-mode PASS as "no obvious-shape violations," not "verified
write-free." Runtime mode catches some of these via the twin-invocation
diff (a `readonly: true` ability that mutates state will return different
data on second call). For high-stakes plugins, run runtime mode before
landing.

## Inputs required

1. **Plugin checkout path** — working tree to verify.
2. **Mode** — `static` or `runtime`. Default to static if unspecified.
3. **(Runtime only) Env-up command** — read the plugin's `AGENTS.md`.
   Common patterns: `npm run wp-env start`, `jetpack docker up`, or a
   composer-based bring-up. Do NOT assume `npm run wp-env` works.
4. **(Optional) Audit doc path** — enables cross-checks between the audit
   and the registered abilities, and validates the audit itself.
5. **Report output path** — explicit path, typically the user's vault.

## Prerequisites

- `wp-project-triage` has been run on the plugin.
- The plugin has at least one registered ability in source. If
  `wp_register_ability(` returns zero hits, there is nothing to verify —
  return a clear "no abilities registered" report, not an empty PASS.

## Procedure

### 1. (If audit provided) Validate the audit doc

Read `references/audit-schema-validation.md`. Validate the audit against
the canonical schema owned by `wp-abilities-audit`. Surface missing
required top-level fields, missing per-ability fields, or more than one
ability with `reference_ability: true`. `backing: null` is a WARN, not
a FAIL — it's intentional gap output, paired with a `surfaced_gaps`
entry.

### 2. Enumerate abilities statically

Read `references/static-enumeration.md`. Scan for `wp_register_ability(`
calls, extract names and annotation blocks. Handle fluent builders,
variable-indirected `input_schema` values, multi-line arrays, and heredoc
callbacks. Record ability-name → source-file + line + annotations.

### 3. (Runtime only) Enumerate via REST + wp-cli

Read `references/runtime-harness.md`. Bring up the env using the command
from AGENTS.md, then enumerate via `wp_get_abilities()` over wp-cli and
cross-check against the static inventory. Source-only → FAIL (registration
not firing). Runtime-only → WARN (dynamic registration path).

### 4. Annotation-correctness checks (the adversarial core)

Read `references/annotation-correctness.md`. This is what makes verify a
distinct skill rather than just "run the tests". Three claims:

- `readonly: true` → callback must not write. The reference covers grep
  patterns for direct `$wpdb` writes, options API, post/user/term/comment
  writes, write-verb method names on services, non-GET HTTP delegations
  (including inline `new WP_REST_Request('POST', ...)`), filesystem
  writes, and cron-scheduling calls. It also flags hooks-as-writes
  (`do_action` whose listeners write) and indirected service mutators
  (`->commit`, `->persist`, camelCase verbs) as known blind spots that
  require runtime confirmation.
- `destructive: false` → callback must not delete, refund, cancel, close
  disputes, or trash content.
- `idempotent: true` → repeated calls with the same input have no
  additional effect on the environment (core's wording at
  `class-wp-ability.php` lines 47-48). Static catches counter writes,
  per-call cron schedules, and sequence increments. Runtime
  twin-invocation diff is a heuristic — differing returns flag
  candidates to inspect, not a verdict.

False positives get suppressed via an inline `// verify-ignore: readonly`
comment — see the reference.

### 5. Permission gate roundtrip

Read `references/permission-roundtrip.md`. Static: the registered
`permission_callback` must reference a capability via `current_user_can(...)`,
or be `'__return_true'` (WARN), or match the allow-list. Runtime: subscriber
and unauthenticated denied; admin allowed (unless deliberately public).

If an audit was provided, cross-check the registered capability against
the audit's `capability_gate`. Mismatch → FAIL.

### 6. Schema lints

Read `references/schema-lints.md`. Static lints: `additionalProperties:
false` unless deliberately accepting extras; every required field has a
description; enums non-empty; no `$ref`; defaults primitive or `null`;
`reference_ability: true` implies no `required` inputs.

Cross-reference `../wp-abilities-api/references/input-schema-gotchas.md`
for the three runtime gotchas (defaults not injected, pagination drift,
`empty()` ID validation).

### 7. Error-code vocabulary conformance

Cross-reference `../wp-abilities-api/references/error-code-vocabulary.md`.
Grep each callback for `new WP_Error(` / `new \WP_Error(` and lint the
first-argument code literal. Non-vocabulary codes → WARN.

## Verification

The run produces a structured markdown report at the user-specified path:

```
---
Last updated: <YYYY-MM-DD HH:MM>
---

# <Plugin> Abilities Verification — <Static|Runtime> Mode

## Status: <PASS|WARN|FAIL>

## Audit doc validation (if provided)

## Static inventory

## Annotation correctness
| Ability | Claim | Result | Evidence |
|---|---|---|---|
| <ability> | readonly=true | FAIL | line 142: `wpdb->update()` |

## Permission gates

## Schema lints

## Error-code vocabulary
```

Every ability is OK, WARN, or FAIL. A single FAIL → top-line FAIL; WARNs
without FAILs → WARN; otherwise PASS.

## Failure modes / debugging

- **Env not reachable (runtime)** — env-up failed or Docker isn't running.
  Re-run `wp-project-triage`, then fix the env. Don't fall back silently
  to static without noting it in the report.
- **No abilities in source** — return a clear "nothing to verify" report.
- **Audit schema mismatch** — point at
  `references/audit-schema-validation.md`; don't auto-fix the audit.
- **False positive on readonly-writes** — see
  `references/annotation-correctness.md` for the `// verify-ignore`
  mechanism. Document why each suppression is legitimate.
- **Runtime enumeration smaller than static** — registration hook isn't
  firing. Check init hook timing, activation state, autoloader order.

## Escalation

- Adversarial false positives on a legitimate pattern → add an allow-list
  entry to `references/annotation-correctness.md` and document the
  rationale. Don't loosen the regexes themselves.
- Audit-schema validator rejects a legitimate audit → the canonical schema
  in `wp-abilities-audit/references/audit-schema.md` has evolved. Update
  `references/audit-schema-validation.md` to match and sync both.

## Out of scope

Token-budget measurement is a separate verification axis — an
annotation-clean, schema-clean, runtime-passing ability set can still
be unshippable if its `tools/list` form burns through an agent's
context budget. That axis is tracked separately, not by this skill.
Do NOT aggregate manual or external measurement into this skill's
PASS/FAIL verdict.
