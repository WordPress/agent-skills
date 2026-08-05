---
name: wp-abilities-verify
description: "Verify a WordPress plugin's Abilities API registrations: enumerate abilities, check that callback behavior matches each annotation's claim (the adversarial readonly-but-writes detection), validate permissions and schemas, and validate audit documents produced by wp-abilities-audit."
compatibility: "Targets WordPress 7.0+ plugins (PHP 7.4.0+). Requires a runnable environment (wp-env, docker-based dev stack, or equivalent) for runtime mode; static mode runs entirely from the plugin checkout with no env. Filesystem-based agent with bash + node."
---

# WP Abilities Verify

Verify a WordPress plugin's Abilities API registrations. The
centerpiece is the **adversarial annotation correctness check**: a
`readonly: true` ability that actually writes (via `$wpdb->update`,
`update_option`, a non-GET delegate, etc.) is a security and UX
disaster because agents plan actions on the basis of the annotations
they introspect. This skill catches those lies by reading the callback
body and comparing what it does against what the annotation claims.

The skill also validates audit docs produced by `wp-abilities-audit`,
checks permission gates and schema hygiene, and optionally executes
each ability against a live environment.

## When to use

- After abilities have been registered in a plugin but before a PR
  lands.
- As a health-check on an already-shipped plugin (catch regressions
  where a refactor turned a readonly ability into a writing one).
- To validate an audit document before handing it to an implementer.

## Two modes

- **Static mode** — runs from the plugin checkout. No env. Enumerates
  via source inspection, runs the adversarial correctness check, runs
  schema and permission lints, and validates audit docs.
- **Runtime mode** — requires a running env. Does everything static
  does PLUS: `wp_get_abilities()` for authoritative enumeration,
  executes each ability with curated inputs, confirms permission
  roundtrip against real users, and runs a twin-invocation heuristic
  on `idempotent: true` abilities to flag candidates for review
  (return-value equality is a signal, not a verdict — core defines
  idempotent as "no additional effect on the environment").

Both modes produce the same structured report format.

A static-mode PASS means "no obvious-shape violations," not "verified
write-free." For high-stakes plugins, run runtime mode before landing
— it catches bootstrap-order, permission-roundtrip, and idempotency
issues that static can't. See `references/annotation-correctness.md`
for the static blind spots.

## Inputs required

1. **Plugin checkout path** — working tree to verify.
2. **Mode** — `static` or `runtime`. Default to static if unspecified.
3. **(Runtime only) Env-up command** — read the plugin's `AGENTS.md`.
   Common patterns: `npm run wp-env start`, `npx wp-env start`, or a
   composer-based bring-up. Plugin families with their own dev tooling
   will document their own command. Do NOT assume `npm run wp-env`
   works.
4. **(Optional) Audit doc path** — enables cross-checks between the
   audit and the registered abilities, and validates the audit itself.
5. **Report output path** — explicit path, typically the user's vault.

## Prerequisites

- `wp-project-triage` has been run on the plugin.
- The plugin has at least one registered ability in source. Zero hits
  on `wp_register_ability(` → return a clear "no abilities registered"
  report, not an empty PASS.

## Procedure

### 1. (If audit provided) Validate the audit doc

Read `references/audit-schema-validation.md`. Validate the audit
against the canonical schema owned by `wp-abilities-audit`. Surface
missing required fields, multiple `reference_ability: true`, and
`backing: null` entries that aren't paired with a `surfaced_gaps`
entry. `backing: null` alone is WARN (intentional gap output), not
FAIL.

### 2. Enumerate abilities statically

Read `references/static-enumeration.md`. Find each
`wp_register_ability(` call, extract the name, the annotation block,
and the execute-callback location. Use a multi-line tool (`rg
--multiline --pcre2`) — the canonical formatting splits the call
across lines. Record each ability's source-file + line + annotations +
callback byte range.

### 3. (Runtime only) Enumerate via REST + wp-cli

Read `references/runtime-harness.md`. Bring the env up using the
command from `AGENTS.md`, then enumerate via `wp_get_abilities()` over
wp-cli and cross-check against the static inventory. Source-only →
FAIL (registration not firing). Runtime-only → WARN (dynamic
registration path).

### 4. Annotation correctness (the adversarial core)

Read `references/annotation-correctness.md`. Read each callback body
and verify it matches the annotation claim:

- `readonly: true` → callback must not write to the database, the
  options table, post / user / term / comment data, the filesystem,
  cron, or via non-GET HTTP / REST delegates.
- `destructive: false` → callback must not delete, refund, void,
  cancel, or trash.
- `idempotent: true` → repeated calls with the same input have no
  additional effect on the environment (per the `idempotent`
  annotation's docblock in `class-wp-ability.php`). Static catches
  counter writes and per-call cron schedules; runtime adds a
  twin-invocation heuristic for visible state changes.

The reference lists common write patterns as a starting set, not a
checklist — plugin vocabularies vary, and the agent extends with verbs
specific to the plugin under verification.

False positives get suppressed via an inline `// verify-ignore:
<annotation> -- <reason>` comment.

### 5. Permission roundtrip

Read `references/permission-roundtrip.md`. Static: classify each
`permission_callback` against the six shapes (preferred Shape A
`current_user_can(...)`; FAIL on Shape B-bad `WP_REST_Request`
patterns or Shape E literal `true`). Runtime: anon and subscriber
denied; admin allowed (unless deliberately public). When an audit was
provided, cross-check the registered cap against the audit's declared
gate.

### 6. Schema lints

Read `references/schema-lints.md`. Six small principles applied to
each ability's `input_schema`: object schemas declare
`additionalProperties`; required fields have descriptions; enums
non-empty; no `$ref`; defaults are statically constant (including
`(object) array()`); reference abilities have no required inputs.

Cross-reference `../wp-abilities-api/references/input-schema-gotchas.md`
for the four runtime gotchas (defaults not injected on the
property-level path, pagination key drift, `empty()` on string IDs,
direct vs indirect invocation strictness).

### 7. Error-code vocabulary

Cross-reference `../wp-abilities-api/references/error-code-vocabulary.md`.
Inspect each callback's `WP_Error` returns; non-vocabulary codes →
WARN.

## Verification

The run produces a structured markdown report at the user-specified
path:

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

## Permission gates

## Schema lints

## Error-code vocabulary
```

Every ability is OK, WARN, or FAIL. A single FAIL → top-line FAIL;
WARNs without FAILs → WARN; otherwise PASS.

## Failure modes / debugging

- **Env not reachable (runtime)** — env-up failed or Docker isn't
  running. Re-run `wp-project-triage`, then fix the env. Don't fall
  back silently to static without noting it in the report.
- **No abilities in source** — return a clear "nothing to verify"
  report.
- **Audit schema mismatch** — point at
  `references/audit-schema-validation.md`; don't auto-fix the audit.
- **False positive on readonly-writes** — see the `// verify-ignore`
  mechanism in `references/annotation-correctness.md`. Document why
  each suppression is legitimate.
- **Runtime enumeration smaller than static** — registration hook
  isn't firing. Check init hook timing, activation state, autoloader
  order.

## Escalation

- Recurring legitimate pattern that trips the adversarial check across
  multiple plugins → propose adding it to the suppression guidance in
  `annotation-correctness.md`. Don't broaden the candidate-pattern
  list speculatively.
- Audit-schema validator rejects a legitimate audit → the canonical
  schema in `../wp-abilities-audit/references/audit-schema.md` has
  evolved. Update `references/audit-schema-validation.md` to match.

## Out of scope

Token-budget measurement is a separate verification axis — an
annotation-clean, schema-clean, runtime-passing ability set can still
be unshippable if its `tools/list` form burns through an agent's
context budget. That axis is tracked separately. Do not aggregate
manual or external measurement into this skill's PASS / FAIL verdict.
