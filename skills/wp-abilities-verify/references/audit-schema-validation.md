# Audit Schema Validation

Hard contract for validating an audit document produced by `wp-abilities-audit`.
The canonical schema lives in
`../../wp-abilities-audit/references/audit-schema.md`; this reference
duplicates only the validation-relevant field list so verify can fail fast
without cross-reading another skill mid-run. Keep both in sync — if the
canonical schema evolves, update this file to match.

Verify owns this validator rather than audit because it's the "validate"
half of the initiative: verify fails fast on a malformed audit so the
downstream implement skill never has to guess.

## Where the audit doc lives and what it looks like

An audit doc is a markdown file named
`<YYYY-MM-DD>-abilities-audit-<plugin-slug>.md`. Structure:

1. `Last updated: <YYYY-MM-DD HH:MM>` header at the top.
2. An H1 title.
3. A fenced ` ```yaml ` block with the structured fields (top-level
   metadata + `proposed_abilities`, `excluded_from_mvp`, `surfaced_gaps`).
4. A "Controller Inventory" table (prose; not validated structurally).
5. A "Notes and Surprises" prose section.

The validator's job is to parse the YAML block and assert the required
fields are present and well-formed.

## How to parse

The YAML lives inside the markdown as a fenced block. To extract:

```bash
# Scan for the ```yaml fence and capture until the closing ``` fence.
awk '/^```yaml$/{f=1;next} /^```$/{f=0} f' <audit-doc.md> > /tmp/audit.yaml
```

If the audit has multiple YAML blocks (it shouldn't, but defensively), take
the first one with `proposed_abilities` as a top-level key.

Parse with any YAML library — `js-yaml` from Node, `yaml` (Python), or
`yq` from the command line. None of the fields require non-standard YAML
features (no anchors, no aliases), so a plain `yaml.load` is sufficient.

## Required top-level fields

Every one of these must be present and non-empty. Missing → FAIL.

| Field | Type | Notes |
|---|---|---|
| `plugin` | string | Plugin slug, e.g. `woopayments`. |
| `repo` | string | `Owner/Repository` form. |
| `plugin_family` | string | From `wp-project-triage`. Free-form. Cross-check against the CWD's triage output when available. |
| `branch_audited` | string | Git branch. |
| `audited_at` | string | ISO date `YYYY-MM-DD`. |
| `auditor` | string | Human name + team. |
| `baseline_abilities` | integer | Usually 0. |
| `capability_gate` | string OR object | See below. |
| `proposed_abilities` | array | At least one entry. |

### `capability_gate` shape check

Two legal shapes; accept both:

1. Single string — `capability_gate: manage_woocommerce` (single-cap plugin).
2. Object — `capability_gate: { read: <cap>, write: <cap>, confirmed: bool, verified_at: string }`
   (post-type-backed or otherwise compound gate).

A legacy compound-string form `"<read_cap> / <write_cap>"` exists in the
wild. Accept for backwards compatibility; WARN.

Anything else → FAIL.

## Required per-ability fields

For each entry in `proposed_abilities`, these must be present:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Kebab-case `<plugin-slug>/<ability>`. |
| `intent` | string | One-sentence user question. |
| `backing` | object OR `null` | See below. `null` = WARN, not FAIL. |
| `permission` | object OR `null` | `null` only if `backing` is null. |
| `return_type` | string | Hint-only; any non-empty string passes. |
| `effort` | enum | One of `S`, `M`, `L`. |
| `annotations` | object | `{ readonly, destructive, idempotent }` — all three booleans required. |
| `notes` | array of strings | May be empty `[]`. |
| `risks` | array of strings | May be empty `[]`. |

### `annotations` required sub-fields

| Key | Type | Notes |
|---|---|---|
| `readonly` | bool | Required. Missing → FAIL. |
| `destructive` | bool | Required. Missing → FAIL. |
| `idempotent` | bool | Required. Missing → FAIL. |

All three must be booleans. String `"true"` / `"false"` → FAIL (YAML
should parse as bools; a string indicates a quoting bug in the audit).

### `backing` object fields (when not null)

| Field | Type | Notes |
|---|---|---|
| `class` | string | Fully-qualified PHP class name. |
| `method` | enum | `GET` / `POST` / `PUT` / `DELETE` / `PATCH`. |
| `route` | string | REST route. |
| `callback` | string | Callback method name. |
| `file` | string | Path relative to plugin root. |
| `route_registration_line` | integer OR `null` | `null` only when `inherited_from` is set. |
| `callback_line` | integer OR `null` | Same. |
| `inherited_from` | string (optional) | Parent class FQCN when callback lives outside the plugin repo. |

Soft rules (WARN, not FAIL):

- `backing: null` — the ability is a known gap. MUST also appear in
  `surfaced_gaps` by `name`. If it's missing from `surfaced_gaps`, FAIL
  (inconsistent audit).
- `inherited_from` is present and the line numbers are `null` — OK. The
  validator does NOT source-verify the parent class (lives outside the
  plugin repo).
- `route_registration_line` or `callback_line` is `null` but
  `inherited_from` is absent → WARN (ambiguous; schema says line numbers
  may drift but expects a reason they're absent).

### `permission` object fields (when not null)

| Field | Type | Notes |
|---|---|---|
| `callback` | string | Method name used as `permission_callback`. |
| `resolves_to` | string | The `current_user_can(...)` call(s). |
| `confirmed` | bool | Verified against source. |

## Invariants (whole-audit checks)

Run these after per-field validation passes:

### Exactly 0 or 1 abilities with `reference_ability: true`

Count abilities where `reference_ability` is `true`. More than 1 → FAIL
(the schema permits one reference; multiple are ambiguous for the
downstream implement skill).

```js
const refCount = audit.proposed_abilities.filter(a => a.reference_ability === true).length;
if (refCount > 1) fail("multiple abilities claim reference_ability: true");
```

### `plugin_family` cross-check

If `wp-project-triage` output is available for the CWD, compare
`audit.plugin_family` against the triage's classification. Mismatch →
WARN (not FAIL — `plugin_family` is free-form and downstream skills
treat unknown values as opaque).

If triage output is not available (e.g. verify is invoked on an audit
doc alone, no plugin checkout nearby), skip this check.

### Every `backing: null` ability appears in `surfaced_gaps`

```js
const gapNames = new Set((audit.surfaced_gaps || []).map(g => g.name));
for (const ability of audit.proposed_abilities) {
  if (ability.backing === null && !gapNames.has(ability.name)) {
    fail(`ability ${ability.name} has backing: null but is missing from surfaced_gaps`);
  }
}
```

### `excluded_from_mvp` and `surfaced_gaps` may be empty arrays

Both are optional; empty arrays are legal. Missing entirely → WARN
(schema expects them, even if empty).

## Output format

Report each check in the run's final report under an "Audit doc
validation" section:

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

A `scripts/validate_audit.mjs` script can automate this check end-to-end
(load markdown → extract YAML fence → parse → apply all rules → emit
structured report). Out of scope for the current contribution, but
mentioned here so a future PR has an obvious place to land.

Until that exists, the procedure is manual-but-deterministic: follow the
checklist above in order, emit the report section, and fail fast on any
missing required field.
