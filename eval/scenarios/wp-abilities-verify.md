# Scenario: wp-abilities-verify

## Prompt

"I have a WordPress plugin checkout with 7 registered abilities — 6 read
abilities annotated `readonly: true` and 1 write ability annotated
`readonly: false, destructive: true`. One of the six read abilities
accidentally calls `$wpdb->update(...)` inside its execute callback after
a recent refactor. I also have an audit doc at
`~/vault/plans/2026-04-20-abilities-audit-<plugin>.md` that declared the
expected annotations before the refactor. Run `wp-abilities-verify` in
static mode against the plugin checkout and write the structured report
to `~/vault/plans/2026-04-20-verify-<plugin>.md`."

## Expected behavior

- Uses `wordpress-router` first to route to `wp-abilities-verify` because
  the task is "verify abilities registrations".
- Reads the audit doc and validates it against
  `references/audit-schema-validation.md`. Confirms required top-level
  fields, per-ability annotation completeness, at-most-one
  `reference_ability: true`, and `plugin_family` cross-check against
  `wp-project-triage`.
- Enumerates abilities statically per `references/static-enumeration.md`.
  Records 7 registrations and resolves each execute callback to its
  source file + start/end line range.
- Runs the adversarial annotation-correctness checks per
  `references/annotation-correctness.md` for every ability. Greps each
  callback body against the readonly-but-writes pattern set.
- FLAGS the one offending read ability with FAIL on the readonly check,
  citing the file + line number of the `$wpdb->update(...)` call as
  evidence.
- Returns OK on the adversarial check for the other 5 readonly abilities.
- Returns OK / N/A on the adversarial check for the write ability
  (readonly is not claimed so the readonly detector is inapplicable;
  destructive=true is declared, so the destructive detector is
  inapplicable).
- Runs schema lints per `references/schema-lints.md` and permission
  roundtrip per `references/permission-roundtrip.md` in static-only mode
  (no env was provided).
- Cross-references error codes per
  `../wp-abilities-api/references/error-code-vocabulary.md` —
  non-vocabulary codes are WARN, not FAIL.
- Writes a structured markdown report at the user-specified path with
  `Last updated:` header, top-line `Status: FAIL`, and every section
  populated (audit doc validation, static inventory, annotation
  correctness, permission gates, schema lints, error-code vocabulary).

## Success criteria

- Skill name `wp-abilities-verify` is referenced and invoked.
- Output is a markdown file at the user-specified path.
- Top-line status is `FAIL` (the single readonly-but-writes violation).
- The `Annotation correctness` table has exactly one FAIL row, for the
  specific ability that calls `$wpdb->update`, with evidence citing the
  file + line number.
- The other 5 read abilities each have a passing readonly row.
- The write ability has no FAIL in the annotation-correctness table.
- The audit doc validation section confirms the audit is well-formed OR
  flags the specific mismatch if the annotations were declared
  differently in the audit.
- Static-only mode is noted in the report header
  (`Static Mode` or equivalent) so the reader knows runtime checks
  weren't executed.
