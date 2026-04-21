---
name: wp-abilities-audit
description: "Audit a WordPress plugin's REST surface and produce a standardized audit document proposing Abilities API registrations. Produces a markdown doc with a YAML schema consumable by downstream implementation and verification skills. Works on any WP plugin."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Filesystem-based agent with bash + node. Requires access to the plugin checkout; some workflows benefit from WP-CLI but don't require it."
---

# WP Abilities Audit

Produce a standardized audit document for a WordPress plugin's REST surface,
proposing a set of Abilities API registrations grouped by semantic intent. The
audit doc is the planning artifact that downstream implement and verify skills
consume via a hard handoff — if the implement skill can't find a valid audit
doc conforming to this schema, it errors out rather than guessing.

This skill works on any Automattic-owned WordPress plugin (or any plugin that
exposes a REST surface). Plugin classification is handled by `wp-project-triage`;
this skill consumes the triage output and applies the audit workflow generically.

## When to use

- The task is "register Abilities API abilities for a WP plugin" and no audit
  doc exists yet.
- Planning participation in a multi-plugin abilities rollout and need a
  shareable, standardized audit artifact.
- Pre-flight checking a plugin's agent-readiness before implementing abilities.
- A PM or non-implementer wants to scope the work before engineering picks it up.

## Inputs required

1. **Plugin checkout path** — working tree of the plugin to audit.
2. **Triage output** — run `wp-project-triage` first if not already done. The
   audit consumes `signals.usesAbilitiesApi`, `versions.wordpress`, and
   `project.kind` from the report.
3. **Maintainer / team name** — recorded in the audit's `auditor` field.
4. **Output path** — where the audit doc should land (typically the user's
   vault / plans directory). Default explicit over implicit; ask if not
   provided rather than writing into the plugin worktree.

## Prerequisites

- `wp-project-triage` has run successfully and classified the plugin.
- The plugin has at least one REST controller. If enumeration finds zero
  controllers, the audit doesn't apply — see "Failure modes" below.

## Procedure

### 1. Enumerate REST controllers

Read `references/controller-enumeration.md` now — it covers the two observed
enumeration paths (glob for standard layouts, grep as the universal fallback)
and when to use each.

Record every controller class + file + REST base + routes in a "Controller
Inventory" table. The inventory is exhaustive even though only a subset
becomes proposed abilities.

### 2. For each controller, extract the backing fields

For every controller found, extract the fields the audit schema requires:
class, file, HTTP method, route, route-registration line number, callback
name, callback line number, permission callback, whether the callback takes
a `WP_REST_Request` argument or is zero-arg, and the return type.

Read `references/audit-schema.md` now for the exact field list and the shape
of `proposed_abilities` entries. Line-number fields may be `null` for
inherited callbacks — the schema allows this and pairs it with an optional
`inherited_from` field.

### 3. Confirm capability gate(s)

Trace each controller's `permission_callback` to its `current_user_can()` call
(or to the post-type capability machinery if the controller extends a
post-type-backed base).

Read `references/capability-gate-tracing.md` now — it documents the two
common mechanisms (direct `check_permission()` vs post-type-backed
`wc_rest_check_post_permissions()`) and how to represent each in the schema.
Note explicitly whether read and write gates differ: compound gates are
represented as a `{read, write}` object, not a single string.

### 4. Propose abilities using semantic-intent grouping

Do NOT atomize one ability per HTTP method. Apply the semantic-intent grouping
heuristic — it's the only grouping rule this skill uses.

Read `../wp-abilities-api/references/grouping-heuristic.md` now — do NOT
re-derive the rules here. Short version: one ability per real-world question
or state transition, with filter parameters in `input_schema` collapsing N
variants into 1.

For each proposed ability, fill in every field in the `proposed_abilities`
schema: `name`, `intent`, `backing`, `permission`, `return_type`, `effort`
(S/M/L), `annotations` (readonly/destructive/idempotent), `notes`, `risks`.

### 5. Surface gaps and deferred items

Three buckets:

- **`excluded_from_mvp`** — candidates intentionally deferred for risk reasons
  (real-money writes, irreversible state changes, or prerequisite design
  work). Each entry gets a one-sentence reason.
- **`surfaced_gaps`** — MVP candidates with no backing endpoint (ability with
  `backing: null`), plus high-value endpoints discovered during enumeration
  that aren't in the MVP list but would be easy future wins.
- **Risks per ability** — anything about a backing endpoint that the
  implementer must handle (no idempotency key, two-phase behavior,
  state-transition caveats, zero-arg endpoints registered with
  `permission_callback => '__return_true'` that must NOT copy that into the
  ability registration).

### 6. Write the audit doc

Write to the explicit output path collected in "Inputs required". The
document structure must match `references/audit-schema.md` exactly:

1. `Last updated: YYYY-MM-DD HH:MM` header.
2. YAML block with all required top-level metadata + `proposed_abilities`,
   `excluded_from_mvp`, `surfaced_gaps`.
3. "Controller Inventory" table.
4. "Notes and Surprises" prose section.

**Worked examples** (reference implementations of what the output should
look like):

- `/Users/rtiodev/rtiodev_vault/plans/2026-04-20-abilities-everywhere-woopayments-audit.md`
  — WooPayments (shared-API-client pattern, single capability gate).
- `/Users/rtiodev/rtiodev_vault/plans/2026-04-20-abilities-audit-woocommerce-subscriptions.md`
  — WooCommerce Subscriptions (post-type-backed capabilities, inherited
  controllers, compound `{read, write}` gate).

### 7. (Optional) Designate a reference implementation ability

Set `reference_ability: true` on the first ability the implement skill should
land — typically the smallest, safest, highest-leverage read. This gives
downstream workflows a deterministic starting point.

## Verification

- The audit conforms to `references/audit-schema.md` (all required top-level
  fields present, at least one entry in `proposed_abilities`, annotations
  complete on every ability).
- `plugin_family` is populated from `wp-project-triage` output.
- `capability_gate` is a string for single-cap plugins or a `{read, write}`
  object for post-type-backed plugins.
- Every ability with `backing: null` also appears in `surfaced_gaps`.
- The doc passes the precondition check used by the downstream implement
  skill (see `references/audit-schema.md` for the required-field list).

## Failure modes / debugging

- **Plugin has no REST controllers** — audit doesn't apply. Consider
  hooks/filters-based abilities (out of scope for this skill's current
  version) or skip abilities adoption for this plugin.
- **Plugin inherits controllers from another repo** (common for WooCommerce
  extensions extending `WC_REST_Orders_Controller` etc.) — capture with
  `backing.inherited_from: "<parent FQCN>"`. Line-number fields may be
  `null` per the schema.
- **Compound capability gate (distinct read/write caps)** — use the
  structured `{read, write}` form documented in
  `references/capability-gate-tracing.md`. Don't smuggle a `/`-separated
  string into a field typed as a single cap.
- **Ambiguous grouping** — route to
  `../wp-abilities-api/references/grouping-heuristic.md`. Do not invent
  alternative grouping rules in the audit doc.
- **Zero-arg endpoints with `permission_callback => '__return_true'`** —
  legal at the REST layer, but the ability's own `permission_callback` must
  match the plugin's merchant gate. Never promote `'__return_true'` into an
  ability registration. Note this in the ability's `risks`.
- **Output path defaults to plugin worktree** — always ask the user for an
  explicit output directory (e.g. their vault `plans/`). Writing the audit
  into the plugin's own git history pollutes the worktree and buries the
  artifact.

## Escalation

- If the plugin uses an enumeration convention not covered by
  `references/controller-enumeration.md` (neither the standard glob nor the
  grep fallback produces a complete inventory), update that reference with
  the new convention and open a PR so future audits cover it deterministically.
- If capability tracing hits a mechanism not covered by
  `references/capability-gate-tracing.md`, extend that file rather than
  encoding the new case in the audit's "Notes and Surprises" only.
