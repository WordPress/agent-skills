# Schema Lints

Static lints against an ability's `input_schema`. Schema hygiene is
about *agent legibility*: orchestrating agents read the schema to
figure out how to call the ability. A schema that's hard to parse,
ambiguous, or misleading wastes turns even when the ability itself
works.

These lints are six small principles. Apply them by reading the
schema, not by mechanically grepping — most plugins use enough
formatting variety that grep recipes drift.

## Lint 1 — `additionalProperties: false` for object schemas

For top-level `'type' => 'object'` schemas, declare
`'additionalProperties' => false` unless you deliberately accept
extras. Without this, an agent passing a typo (`par_page` instead of
`per_page`) gets accepted silently and falls through to the backing,
which ignores the unknown key.

- `additionalProperties: false` declared → OK.
- `additionalProperties: true` declared → WARN, unless the schema is
  for genuinely free-form metadata (payment custom fields, form
  free-text); document the reason inline.
- Not declared on an object schema → WARN.
- Non-object root (string with enum, integer, etc.) → N/A. The lint
  applies only to objects.

## Lint 2 — every required field has a non-empty description

For each entry in `required`, the matching `properties` entry must
declare a non-empty `description`. Required fields are where agents
most need guidance; an opaque required key forces the agent to guess
from the field name alone. Empty / missing → FAIL.

Optional-field descriptions are nice-to-have — absence is WARN.

## Lint 3 — enums are non-empty

`'enum' => []` accepts no values, rejecting every input. Almost always
a bug. → FAIL.

A single-value enum (`'enum' => [ 'pending' ]`) is legal but unusual;
WARN and prompt for review — often a copy-paste that lost the other
values.

## Lint 4 — no `$ref`

Agents read the schema via REST introspection. A `$ref` forces the
agent to follow a reference to see the field shape — wastes a turn and
often breaks because the referenced schema isn't in the same document.
Inline the shape instead.

Any `'$ref'` in the schema → FAIL.

## Lint 5 — defaults are statically constant

Each `'default'` value must evaluate to the same shape on every call:

- Scalar literals — `true`, `false`, integer, float, quoted string,
  `null` → OK.
- Empty or all-literal arrays — `[]`, `array()`, `[ 'a', 'b' ]` → OK.
- Literal cast to an empty object — `(object) array()`, `(object) []`
  → OK. This is the recommended top-level default for zero-arg-allowed
  abilities; see
  `../../wp-abilities-api/references/input-schema-gotchas.md` §4.
- `new stdClass()` with no arguments → OK.
- A function call (`gmdate('c')`, `wp_generate_uuid4()`, `time()`),
  variable reference, or other computed expression → FAIL.

The principle: defaults that vary per call are both non-deterministic
and surprising to agents that expect defaults to be static.

## Lint 6 — `reference_ability: true` implies no required inputs

If an audit doc is provided and an ability has
`reference_ability: true`, its `input_schema.required` array must be
empty or absent. The reference ability is the smallest, safest
bootstrap call an implementer lands first; it must work with
`execute([])`. Required inputs on the reference ability → FAIL.

(No audit provided → this lint is skipped — no reference ability is
declared.)

## Cross-reference: gotchas 1-3 (callback hardening) and gotcha 4 (structural default)

Static lints catch shape; the four runtime gotchas in
`../../wp-abilities-api/references/input-schema-gotchas.md` split into
two kinds.

Gotchas 1-3 need defensive code in the execute callback —
`array_key_exists` instead of `isset`-only for property defaults,
pagination key translation, ID validation that accepts `"0"`. These
are runtime behaviors the callback itself must handle; static schema
lints can't enforce them.

Gotcha 4 — the direct vs indirect invocation strictness — is what
motivates the `(object) array()` top-level default that Lint 5
explicitly accepts. This one IS structural and Lint 5 carries the
enforcement.

## Output format

```markdown
## Schema lints

| Ability | Lint | Result | Detail |
|---|---|---|---|
| <ability> | additionalProperties (object schemas) | WARN | not declared on object schema |
| <ability> | required-field descriptions | OK | 3/3 required fields documented |
| <ability> | enum non-empty | OK | no enums |
| <ability> | no $ref | OK | inline |
| <ability> | static defaults | FAIL | `created_at` uses `gmdate('c')` |
| <ability> | reference_ability implies no required | N/A | not reference ability |
```

A FAIL on any lint flips that ability to FAIL in the run summary.
WARNs surface but don't block.
