# Scenario: wp-abilities-audit

## Prompt

"I'm working on a WooCommerce extension plugin checkout that currently
registers zero abilities. Its REST controllers live under `includes/api/`
(not the standard `includes/admin/` layout) and extend
`WC_REST_Orders_Controller` for a custom post type with distinct read and
write capabilities. Produce a Phase-1 Abilities API audit doc at
`~/vault/plans/2026-04-20-abilities-audit-<plugin>.md` so we can hand it to
engineering for implementation."

## Expected behavior

- Uses `wordpress-router` first to classify the repo, then routes to
  `wp-abilities-audit` because the task is "produce an abilities audit doc".
- Runs `wp-project-triage` to populate `plugin_family` and version signals
  before starting the audit.
- Uses the glob-first, grep-fallback enumeration path from
  `references/controller-enumeration.md` — falls through to grep because the
  standard `includes/admin/class-*-rest-*-controller.php` glob returns zero
  hits under `includes/api/`.
- Traces the post-type-backed capability mechanism per
  `references/capability-gate-tracing.md` and produces a `{read, write}`
  structured `capability_gate` rather than a single string.
- Applies semantic-intent grouping per
  `../wp-abilities-api/references/grouping-heuristic.md` — does NOT atomize
  one ability per HTTP method. Targets 4-6 proposed abilities, at least one
  read and one write.
- Marks routes inherited from `WC_REST_Orders_Controller` with
  `backing.inherited_from: "WC_REST_Orders_Controller"` and `null` line
  numbers per `references/audit-schema.md`.
- Writes the audit doc to the explicit user-provided vault path, NOT into
  the plugin's own worktree.
- Includes at least one entry in `surfaced_gaps` for a high-leverage
  zero-arg candidate or a gap with `backing: null`.

## Success criteria

- Skill name `wp-abilities-audit` is referenced and invoked.
- Output is a markdown file at the user-specified path with
  `Last updated: YYYY-MM-DD HH:MM` header + YAML block + prose sections.
- YAML `plugin_family` field is populated from triage output.
- `capability_gate` is the structured `{read, write}` object form.
- `proposed_abilities` has at least 3 entries; at least one read and one
  write represented.
- `surfaced_gaps` array has at least one entry.
- Controller Inventory table lists every controller grep enumeration found.
- `Notes and Surprises` section exists and captures at least one judgment
  call (e.g. inherited controllers, capability divergence, or zero-arg
  endpoints with `__return_true`).
