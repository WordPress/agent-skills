# Static Enumeration

Enumerate a plugin's abilities from source, with no running environment.
This is the first step of every static-mode run and the cross-check for
every runtime-mode run.

Static enumeration is necessarily best-effort — PHP's dynamism (variable
indirection, runtime-conditional registration) means a full inventory
only comes from a live `wp_get_abilities()` call. When static and runtime
inventories diverge, trust runtime; static drives the diff so the
reviewer knows where to look.

## Target: `wp_register_ability( '<name>', [ ... ] )` calls

The canonical registration shape:

```php
wp_register_ability(
    '<plugin-slug>/<ability-name>',
    [
        'label'           => __( '...', '<text-domain>' ),
        'description'     => __( '...', '<text-domain>' ),
        'category'        => '<category-slug>',
        'input_schema'    => [ /* ... */ ],
        'execute_callback' => [ self::class, 'execute_my_ability' ],
        'permission_callback' => [ self::class, 'check_permission' ],
        'meta'            => [
            'annotations' => [
                'readonly'    => true,
                'destructive' => false,
                'idempotent'  => true,
            ],
            'show_in_rest' => true,
        ],
    ]
);
```

Find the calls, extract the names, and follow the callback references to
locate the execute-callback body.

## Step 1 — find every registration call

```bash
grep -rn --include='*.php' "wp_register_ability\s*(" <plugin-root>/
```

For each hit, capture the starting line. The next 40-100 lines are
usually the array literal — the exact end-line is whatever line balances
the opening `[` or `(`.

If the plugin has zero hits, return a clear "no abilities registered"
report per the main SKILL.md "Failure modes" section. Don't fabricate
an empty inventory.

## Step 2 — extract each ability name

The first argument to `wp_register_ability` is the ability name. Usually
a literal string:

```bash
# Greedy capture of single- or double-quoted first argument.
grep -rn --include='*.php' -E "wp_register_ability\s*\(\s*['\"]([^'\"]+)['\"]" <plugin-root>/ \
    | sed -nE "s/.*wp_register_ability\s*\(\s*['\"]([^'\"]+)['\"].*/\1/p"
```

If the first argument is a variable (`wp_register_ability( $ability_name, ... )`),
trace the variable:

- Recent assignment in the same function → resolve at audit time.
- Constant (`MyPlugin\ABILITY_NAME`) → resolve via a follow-up grep.
- Truly dynamic (computed from config or loops) → flag as a limitation
  and recommend the caller use runtime mode for authoritative
  enumeration.

## Step 3 — extract the annotation block

The annotations live at `meta.annotations.{readonly,destructive,idempotent}`.

For each registration, read the array literal from the starting line
forward until the matching close paren. Inside, find:

```php
'annotations' => [
    'readonly'    => true,
    'destructive' => false,
    'idempotent'  => true,
],
```

Patterns to handle:

### 3.1 — short-form one-liner

```php
'annotations' => [ 'readonly' => true, 'destructive' => false, 'idempotent' => true ],
```

### 3.2 — multi-line (most common)

Use a multi-line regex or read lines until the next `],`:

```bash
grep -nE "'(readonly|destructive|idempotent)'\s*=>\s*(true|false)" <file>
```

### 3.3 — values via variables

```php
'annotations' => self::annotations_for_read(),
```

Resolve the helper method. If it returns an array literal, treat as
resolvable. If it builds the array dynamically, record the ability with
`annotations: <unresolved>` and flag: the adversarial checks can still
run against the execute callback, but the declared annotations can't be
compared statically — runtime mode required for that comparison.

### 3.4 — inherited / constant annotations

```php
'annotations' => self::READONLY_ANNOTATIONS,
```

Find the class constant; treat as resolvable.

## Step 4 — follow the execute callback to its body

`execute_callback` is one of:

```php
// Array form (most common with static class method).
'execute_callback' => [ self::class, 'execute_get_things' ],
'execute_callback' => [ My_Class::class, 'execute_get_things' ],
'execute_callback' => [ $this, 'execute_get_things' ],

// String form (top-level function).
'execute_callback' => 'my_plugin_execute_get_things',

// Closure.
'execute_callback' => function( $input ) { /* ... */ },
```

For each form:

- **Array form**: find `class <name>` in the plugin, then
  `(public|protected|private)( static)?\s+function\s+<method>\s*\(` inside
  that class. Record the file + start line + end line (find the matching
  `}` — use the brace-matching heuristic).
- **String form**: grep for `function <name>\s*\(`.
- **Closure**: the body is literally inline in the registration; the
  start line is the `function(` line, the end line is the matching `}`.

Record per ability: `ability_name → (callback_file, callback_start_line, callback_end_line)`.
The annotation-correctness checks grep inside this range.

## Step 5 — handle fluent builder patterns

Some plugins wrap registrations in helper functions:

```php
register_get_foo_ability();
register_get_bar_ability();

function register_get_foo_ability() {
    wp_register_ability(
        'myplugin/get-foo',
        [ /* ... */ ]
    );
}
```

The `grep 'wp_register_ability'` still finds these — they're one level of
indirection but still literal. No special handling needed.

The trickier pattern:

```php
foreach ( [ 'foo', 'bar', 'baz' ] as $slug ) {
    wp_register_ability( "myplugin/get-{$slug}", [ /* ... */ ] );
}
```

Here the ability name is dynamic. Record each computed name as a
limitation and recommend runtime enumeration.

## Step 6 — handle `input_schema` via helper methods

```php
'input_schema' => self::input_schema_for_get_disputes(),
```

The schema lints in `schema-lints.md` need the actual schema. Resolve
the helper; if it returns an array literal, use it. If the helper builds
the schema conditionally, flag as unresolvable and skip the static schema
lints for that ability (runtime mode via the `wp_get_ability(...)->get_input_schema()`
API is authoritative).

## Step 7 — handle heredoc callbacks (rare but real)

A handful of plugins register abilities with inline heredoc SQL:

```php
'execute_callback' => function() {
    global $wpdb;
    return $wpdb->get_results( <<<SQL
        SELECT ...
    SQL );
},
```

The grep patterns from `annotation-correctness.md` work on the PHP body,
not the SQL inside the heredoc. A `SELECT` inside a heredoc is a read
regardless; an `INSERT` or `UPDATE` inside a heredoc on a `readonly: true`
ability is a lie. The regex in annotation-correctness catches
`$wpdb->query(...UPDATE|INSERT|DELETE)` on a single line, but a heredoc
spans lines. Use multi-line grep:

```bash
grep -PzoE '\$wpdb->query\s*\([^)]*<<<SQL[^S]*(UPDATE|INSERT|DELETE)' <file>
```

Document this as a known gap: single-line write patterns are reliably
detected; multi-line heredoc writes require the multi-line grep variant
above.

## Limits of static enumeration

Cases where static enumeration produces incomplete or ambiguous output:

- Variable-indirected names (`foreach` over a slug list).
- Variable-indirected annotations (annotations built from config).
- Conditional registration (`if ( feature_enabled() ) wp_register_ability(...)`).
- Variable-indirected callbacks (`[ $this, $callback_name ]`).

Every case above gets recorded in the report's "Static enumeration
limitations" section. When these occur, recommend the caller re-run in
runtime mode to get the authoritative inventory from
`wp_get_abilities()`.

## Output format

```markdown
## Static inventory

Found <N> ability registrations across <M> files:

| Ability | Source file | Registration line | Callback file | Callback lines |
|---|---|---|---|---|
| myplugin/get-foo | src/Abilities.php | 42 | src/Abilities.php | 102-134 |
| myplugin/submit-bar | src/Abilities.php | 68 | src/Services/Bar.php | 58-91 |

### Limitations

- <ability>: annotations built dynamically in `annotations_for_read()`;
  recommend runtime mode for annotation cross-check.
```

This inventory is the input to the annotation-correctness, schema-lint,
permission-roundtrip, and error-code-vocabulary checks. Each of those
references operates on the `(callback_file, callback_start_line,
callback_end_line)` byte range.
