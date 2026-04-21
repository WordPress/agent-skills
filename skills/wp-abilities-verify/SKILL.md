---
name: wp-abilities-verify
description: "Verify a WordPress plugin's Abilities API registrations: enumerate abilities via REST, check annotation correctness including the adversarial readonly-but-writes detection, validate permissions and schemas, and validate audit documents produced by wp-abilities-audit."
compatibility: "Targets WordPress 6.9+ plugins. Requires a runnable environment (wp-env, docker-based dev stack, or equivalent) for runtime mode; static mode runs entirely from the plugin checkout with no env. Filesystem-based agent with bash + node."
---

# WP Abilities Verify

Verify a WordPress plugin's Abilities API registrations. The centerpiece is
the **adversarial annotation-correctness check**: a `readonly: true` ability
that actually writes (via `wpdb->update`, `update_option`, `wp_insert_*`, a
non-GET delegate, etc.) is a security and UX disaster because agents plan
actions on the basis of the annotations they introspect. This skill catches
those lies.

The skill also validates audit docs produced by `wp-abilities-audit` (shared
precondition with the downstream implement skill), runs permission and schema
lints, and optionally executes each ability against a live environment.

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
  users, verifies idempotent reads are byte-for-byte identical on twin calls.

Both modes produce the same structured report format.

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
required top-level fields, missing per-ability fields, more than one
ability with `reference_ability: true`, or `plugin_family` mismatch with
triage. `backing: null` is a WARN, not a FAIL.

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

- `readonly: true` → callback must not write. Grep for `wpdb->update`,
  `wpdb->insert`, `wpdb->delete`, `update_option`, `add_option`,
  `delete_option`, `update_post_meta`, `wp_insert_*`, `wp_update_*`,
  `wp_delete_*`, `->update_`, `->create_`, `->insert_`, `->delete_`,
  non-GET `wp_remote_*`, or `delegate_to_rest_controller` with non-GET.
- `destructive: false` → callback must not delete, refund, cancel, close
  disputes, or trash content.
- `idempotent: true` → no `rand()`, no `wp_create_nonce`, no sequence
  increments. Runtime: twin invocations must match byte-for-byte.

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
