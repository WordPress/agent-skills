# Audit Schema Validation

How `wp-abilities-verify` validates an audit document produced by
`wp-abilities-audit`. The canonical schema (field tables, types,
invariants, known limitations) lives in
`../../wp-abilities-audit/references/audit-schema.md` — this reference
covers only the validation procedure: how to extract the YAML, what
checks to run in what order, and how to report results.

If a field type or shape question is not answered here, look in the
canonical schema. Do NOT duplicate field tables in this file — the
canonical is the single source of truth.

## Why verify owns the validator

Verify fails fast on a malformed audit so the downstream implement
skill never has to guess. Audit produces; verify validates the
production. Co-locating the validator with verify keeps the
"validate audit" step in the same procedure as "validate registered
abilities" and lets a single run produce one consolidated report.

## Step 1 — extract the YAML

The audit doc is a markdown file with a single fenced ` ```yaml ` block
containing the structured fields:

```bash
# Scan for the ```yaml fence and capture until the closing ``` fence.
awk '/^```yaml$/{f=1;next} /^```$/{f=0} f' <audit-doc.md> > /tmp/audit.yaml
```

If the audit has multiple YAML blocks (it shouldn't, but defensively),
take the first one with `proposed_abilities` as a top-level key.

Parse with any YAML library — `js-yaml` from Node, `yaml` (Python), or
`yq` from the command line. None of the canonical fields require
non-standard YAML features (no anchors, no aliases), so a plain
`yaml.load` is sufficient.

## Step 2 — validate against the canonical schema

Apply the field-shape rules defined in
`../../wp-abilities-audit/references/audit-schema.md`. Specifically:

1. Every required top-level field is present and non-empty (see
   "Top-level fields" in the canonical).
2. `capability_gate` matches one of the legal shapes (single string,
   `{read, write}` object, or — with WARN per the canonical's "Known
   limitations" — the legacy slash-separated string).
3. Every entry in `proposed_abilities` has every required per-ability
   field with the right type (see "`proposed_abilities`" in the
   canonical).
4. Each ability's `annotations` block has all three booleans
   (`readonly`, `destructive`, `idempotent`) as actual booleans —
   string `"true"` / `"false"` is FAIL (indicates a quoting bug).
5. Each ability's `backing` is either an object with the canonical
   fields or `null`; `null` is WARN, not FAIL (it's intentional gap
   output).

Missing required field → FAIL. Wrong type → FAIL. Legacy
`capability_gate` slash-string → WARN.

## Step 3 — whole-audit invariants

Run these after per-field validation passes:

### Exactly 0 or 1 abilities with `reference_ability: true`

Count abilities where `reference_ability` is `true`. More than 1 → FAIL
(the schema permits one reference; multiple are ambiguous for the
downstream implement skill).

```js
const refCount = audit.proposed_abilities.filter(a => a.reference_ability === true).length;
if (refCount > 1) fail("multiple abilities claim reference_ability: true");
```

### Every `backing: null` ability appears in `surfaced_gaps`

Per the canonical's "Known limitations": a `null` backing is intentional
gap output and MUST be paired with a matching `surfaced_gaps` entry.

```js
const gapNames = new Set((audit.surfaced_gaps || []).map(g => g.name));
for (const ability of audit.proposed_abilities) {
  if (ability.backing === null && !gapNames.has(ability.name)) {
    fail(`ability ${ability.name} has backing: null but is missing from surfaced_gaps`);
  }
}
```

### `plugin_family` cross-check (when triage is available)

If `wp-project-triage` output is available for the CWD, compare
`audit.plugin_family` against the triage's classification. Mismatch →
WARN (not FAIL — `plugin_family` is free-form and downstream skills
treat unknown values as opaque).

If triage output is not available (e.g. verify is invoked on an audit
doc alone, no plugin checkout nearby), skip this check.

### `excluded_from_mvp` and `surfaced_gaps` may be empty

Both are optional; empty arrays are legal. Missing entirely → WARN
(schema expects them, even if empty).

## Step 4 — emit the report section

Each check goes into the "Audit doc validation" section of the run's
final report:

```markdown
## Audit doc validation

| Check | Result | Detail |
|---|---|---|
| Top-level required fields | OK | All 9 present |
| `capability_gate` shape | OK | string (single-cap) |
| Per-ability fields | WARN | 1 ability has `backing: null` (intentional) |
| `reference_ability` uniqueness | OK | 1 ability marked |
| `plugin_family` triage cross-check | OK | matches `woo-payments` |
| `surfaced_gaps` consistency | OK | all `backing: null` entries present |
```

A single FAIL in this section makes the whole run FAIL; verify cannot
meaningfully continue without a trustworthy audit. WARN entries don't
block the rest of the procedure.

## Future deterministic helper

A `scripts/validate_audit.mjs` script can automate steps 1–3
end-to-end (load markdown → extract YAML fence → parse → apply all
rules → emit structured report). Out of scope for the current
contribution, but mentioned here so a future PR has an obvious place
to land.

Until that exists, the procedure is manual-but-deterministic: follow
the steps above in order, emit the report section, and fail fast on
any missing required field.

## Escalation

If the validator rejects an audit that's actually well-formed, the
canonical schema in
`../../wp-abilities-audit/references/audit-schema.md` has evolved.
Update this file's procedure to match (likely adding a new invariant
or relaxing a field rule). Don't loosen the validation in isolation —
the canonical schema is the contract; this file is the enforcer.
