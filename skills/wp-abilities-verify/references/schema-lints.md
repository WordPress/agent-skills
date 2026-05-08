# Schema Lints

Static lints against an ability's `input_schema` (and to a lesser extent,
output schema when one is declared). Complements the adversarial
annotation checks: schema hygiene is about agent legibility, not
correctness-versus-behavior.

The target audience is orchestrating agents: they read the schema to
figure out how to call the ability. A schema that's hard to parse,
ambiguous, or misleading wastes agent turns even when the ability
itself works perfectly.

## The lints

### Lint 1 — `additionalProperties: false` for object schemas, unless deliberately accepting extras

```php
'input_schema' => [
    'type'       => 'object',
    'properties' => [ /* ... */ ],
    'additionalProperties' => false,  // <-- preferred when the input is object-typed
],
```

**Scope:** this lint only applies when the top-level schema has
`'type' => 'object'`. Non-object schemas (e.g. a string with an enum,
an integer with min/max) are not subject to this check —
`additionalProperties` is meaningless on those types.

**Why:** for object-typed input, an agent passing typos (e.g.
`par_page` instead of `per_page`) gets accepted silently when
`additionalProperties` is not declared (JSON Schema's default is
`true`). The backing controller ignores the typo key and the behavior
differs from what the agent expected. Fail fast on unknown keys.

**Grep:**

```bash
# Find input_schema blocks.
grep -rn --include='*.php' -A 30 "'input_schema'\s*=>\s*\[" <plugin-root>/ \
    | grep -E "'additionalProperties'\s*=>\s*(true|false)"
```

**Result (object-typed schemas only):**

- `additionalProperties: false` declared → OK.
- `additionalProperties: true` declared → WARN. Inspect: is this a
  deliberate pass-through (e.g. user-controlled metadata fields)?
  Document in a comment; otherwise tighten.
- Not declared at all on an object schema → WARN, recommend declaring
  explicitly. Not a hard FAIL — the input still validates against the
  declared `properties`; the risk is silent typo acceptance, which is
  bounded.

**Deliberate-extras exemption:** some plugins pass through user-controlled
metadata fields (e.g. payment-system custom metadata, form-field
free-text). A pattern like:

```php
'metadata' => [
    'type'        => 'object',
    'additionalProperties' => true,  // user-controlled metadata
    'description' => __( 'Free-form key/value metadata.', '<text-domain>' ),
],
```

is legitimate at the property level. Top-level
`additionalProperties: false` should still apply — the object as a
whole has a finite key set, even if one of those keys is itself a
bag-of-attributes.

**Non-object input schemas:** the Abilities API accepts schemas of any
JSON Schema type at the root, not just objects. For example, an ability
that takes a single status string can declare:

```php
'input_schema' => array(
    'type'        => 'string',
    'enum'        => array( 'pending', 'active', 'cancelled' ),
    'description' => __( 'The desired status.', '<text-domain>' ),
),
```

Lint 1 is a no-op on schemas like this — there are no properties for
typos to slip into.

### Lint 2 — every required field has a description

```php
'properties' => [
    'order_id' => [
        'type'        => 'string',
        'description' => __( 'The order ID to fetch.', '<text-domain>' ),  // <-- required
    ],
],
'required' => [ 'order_id' ],
```

**Why:** required fields are where agents most need guidance. Missing
descriptions push the agent into guessing from the field name alone,
which fails on any non-obvious case (date formats, ID conventions,
enum semantics).

**Check:**

For each key in `required`, its entry in `properties` must have a
non-empty `description`. Empty or missing → FAIL (required field is
opaque).

Optional fields may also benefit from descriptions but their absence is
a WARN, not a FAIL.

### Lint 3 — enums are non-empty

```php
'status' => [
    'type' => 'string',
    'enum' => [ 'pending', 'active', 'cancelled' ],  // <-- at least one value
],
```

**Why:** an empty `enum` accepts no values, effectively rejecting every
input. Almost always a bug.

**Check:** any `'enum' => []` → FAIL.

A single-value enum is legal but unusual; WARN and prompt for review —
often an artifact of a copy-paste that lost the other values.

### Lint 4 — no `$ref`

```php
// WRONG — don't do this in ability schemas.
'input_schema' => [
    'type' => 'object',
    'properties' => [
        'address' => [ '$ref' => '#/definitions/Address' ],
    ],
],
```

**Why:** agents read the schema via the REST introspection endpoint. A
`$ref` forces the agent to follow a reference to see what `address`
looks like — wastes a turn and often breaks because the referenced
schema isn't in the same document. Inline the shape instead.

**Check:** any `'$ref'` in an `input_schema` → FAIL.

### Lint 5 — default values are statically constant

```php
// OK — primitive defaults.
'per_page' => [ 'type' => 'integer', 'default' => 25 ],
'submit'   => [ 'type' => 'boolean', 'default' => false ],
'status'   => [ 'type' => 'string',  'default' => 'pending' ],
'metadata' => [ 'type' => 'object',  'default' => null ],

// OK — literal empty object/array. The cast and `new stdClass()` always
// produce the same shape on every call. `(object) array()` is the
// recommended top-level default for zero-arg-allowed abilities — see
// `../../wp-abilities-api/references/input-schema-gotchas.md` §4.
'input_schema' => [
    'type'    => 'object',
    'default' => (object) array(),
    // ...
],
'tags' => [ 'type' => 'array', 'default' => [] ],

// WRONG — expression that evaluates differently per call.
'created_at' => [ 'type' => 'string', 'default' => gmdate( 'c' ) ],
'token'      => [ 'type' => 'string', 'default' => wp_generate_uuid4() ],
```

**Why:** a default that evaluates differently per call is both
non-deterministic and surprising to agents that expect defaults to be
static values. A type-cast of a literal (`(object) array()`,
`(object) []`) or a `new stdClass()` always produces the same shape, so
they're constant for this lint's purposes even though they're not
scalar literals.

**Check:** each `'default'` value must be one of:

- A scalar literal (`true`, `false`, integer, float, quoted string, `null`).
- An empty or all-literal array (`[]`, `array()`, `[ 'a', 'b' ]`).
- A literal cast to an empty object (`(object) array()`, `(object) []`).
- `new stdClass()` with no arguments.

A function call (`gmdate(...)`, `wp_generate_*(...)`, `time()`),
variable reference, or other computed expression → FAIL.

Note: this lint deliberately accepts the `(object) array()` form so it
agrees with the recommended fix in `input-schema-gotchas.md` for
top-level schema defaults on zero-arg-allowed abilities. Flagging it
here would create a contradiction across sister skills.

### Lint 6 — `reference_ability: true` implies no required inputs

From `../../wp-abilities-audit/references/audit-schema.md`:

> Exactly zero or one ability per audit may set `reference_ability: true`.

The reference ability is the first one an implementer lands — typically
the smallest, safest, highest-leverage read. It gets invoked as a
bootstrap call to confirm the abilities registration works end-to-end,
so it must work without input:

**Check:** if an audit doc is provided and an ability has
`reference_ability: true`, its `input_schema.required` array must be
empty or absent. Required inputs on the reference ability → FAIL.

If no audit is provided, this lint is skipped (no reference ability
declared).

## Cross-reference: the three runtime gotchas

Static lints can't catch runtime gotchas. Cross-reference
`../../wp-abilities-api/references/input-schema-gotchas.md` for the three
patterns that need defensive code in the execute callback:

1. **Schema `default` values are NOT injected into callback input** —
   the callback must re-apply defaults via `array_key_exists` + null
   checks.
2. **Pagination parameter-name drift** — if the backing reads `pagesize`
   but the schema exposes `per_page`, the callback must translate before
   delegating.
3. **ID validation must not use `empty()`** — `empty( "0" )` is true,
   but `"0"` is a legal ID. Use `isset + is_string + '' === ...`
   instead.

Static mode can only detect the schema-declaration side of these:

- Gotcha 1: the lint catches missing `default` values that are obviously
  expected (e.g. a boolean with `required: false` but no default).
  Flag as WARN.
- Gotcha 2: grep the callback body for the `per_page`/`pagesize`
  translation helper; if the schema exposes `per_page` and the backing
  reads `pagesize`, the helper should be present. Absence → FAIL.
- Gotcha 3: grep the callback body for `empty( $input[ <required_key> ] )`
  on required string IDs. Hit → FAIL (use `isset + is_string + ''`).

Runtime mode confirms these patterns via actual invocation — the
harness's "missing-input code" and "wrong-type code" checks from
`runtime-harness.md` step 4.

## Output format

Report schema lints in the run report under a "Schema lints" section:

```markdown
## Schema lints

| Ability | Lint | Result | Detail |
|---|---|---|---|
| <ability> | additionalProperties (object schemas) | WARN | not declared on object schema |
| <ability> | required-field descriptions | OK | 3/3 required fields documented |
| <ability> | enum non-empty | OK | no enums |
| <ability> | no $ref | OK | inline |
| <ability> | primitive defaults | FAIL | `created_at` uses `gmdate('c')` |
| <ability> | reference_ability implies no required | N/A | not reference ability |
```

A single FAIL lint on any ability feeds into the run's top-line status
per the main SKILL.md "Verification" section. WARN-only lints don't
flip the top-line status but are surfaced for the reviewer.
