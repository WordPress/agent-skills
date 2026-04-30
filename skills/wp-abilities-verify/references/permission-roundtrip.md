# Permission Roundtrip

Verify that the registered `permission_callback` on every ability actually
gates on a real capability — statically (by source inspection) and, in
runtime mode, by exercising the gate against unauthenticated, subscriber,
and admin contexts.

## Background — what `permission_callback` actually receives

When an ability is invoked, the registered `permission_callback` is called
through `WP_Ability::check_permissions( $input )`, which dispatches to
`WP_Ability::invoke_callback( $callback, $input )` (`class-wp-ability.php`
lines 541–551 and 507–526 in WordPress core).

`invoke_callback`'s contract:

- If the ability declares a non-empty `input_schema`, the callback is
  invoked with one positional argument: the validated `$input` value
  (whatever the schema's root type produced — array, string, integer,
  boolean, etc.).
- If `input_schema` is empty or absent, the callback is invoked **with
  no arguments**.

In particular, the callback **never receives a `WP_REST_Request`**, even
when the ability is reached via the REST bridge. The bridge unwraps the
request, runs schema validation, and passes the validated value down.

This matters because permission callbacks built around `WP_REST_Request`
patterns (e.g. `$request->get_method()`) cannot work as-is when copied from
a REST controller to an ability registration. Static checks below catch
this misshape.

## Static check

Every ability registration includes a `permission_callback`:

```php
wp_register_ability(
    'myplugin/get-things',
    array(
        'permission_callback' => array( self::class, 'check_permission' ),
        // ...
    )
);
```

Inspect the callback's body. Classify each into one of these shapes.

### Shape A — direct `current_user_can(...)` check (preferred)

```php
public static function check_permission() {
    return current_user_can( 'manage_options' );
}
```

→ OK. Record the resolved capability.

The callback takes no arguments because the ability has no `input_schema`,
or because the cap doesn't depend on input. Either way, this is the
default and most-secure shape: a single capability check that resolves
deterministically per user.

### Shape B — input-shape branch (use sparingly; prefer splitting)

If a single ability genuinely needs different caps for different input
shapes, the callback may branch on `$input`:

```php
public static function check_permission( $input = null ) {
    $is_destructive = is_array( $input ) && ! empty( $input['delete'] );
    if ( $is_destructive ) {
        return current_user_can( 'delete_posts' );
    }
    return current_user_can( 'edit_posts' );
}
```

→ OK on a case-by-case basis, but smell. If you're tempted to write
Shape B, the operation almost always belongs as **two abilities** —
one for the read/edit path and one for the destructive path — each
with its own clean Shape A callback. The use-case-contract framing in
`../../wp-abilities-api/references/domain-vs-projection.md` argues for
splitting whenever two distinct user actions are being represented.

A common antipattern that LOOKS like Shape B but won't work:

```php
// WRONG — callback never sees a WP_REST_Request.
public static function check_permission( $request ) {
    if ( 'GET' === $request->get_method() ) { /* ... */ }
}
```

→ FAIL. The argument is the validated input value, not a `WP_REST_Request`.
Branching on `$request->get_method()` is a static-analysis red flag —
the callback would either crash on a non-object input or always take the
fall-through path. If you find this, the callback was almost certainly
copied from a REST controller without translation.

### Shape C — `'__return_true'` (deliberate public ability)

```php
'permission_callback' => '__return_true',
```

→ WARN. Most abilities should gate; a public ability is rare and needs
explicit justification in the registration (code comment) or the audit
doc's `risks` array.

### Shape D — delegated to a helper that resolves to `current_user_can(...)`

```php
public static function check_permission() {
    return self::user_is_authorized();
}

private static function user_is_authorized() {
    return current_user_can( 'manage_options' );
}
```

→ OK, but trace the helper to confirm it resolves to a `current_user_can`
call. If the helper returns `true` unconditionally (functionally
equivalent to `'__return_true'`), treat as Shape C.

### Shape E — `return true;` or similar unconditional literal

```php
public static function check_permission() {
    return true;  // functionally __return_true but harder to grep for
}
```

→ FAIL. This is worse than Shape C because it hides the public-access
pattern from a casual grep. Change to `'__return_true'` (explicit) or
add a real capability check.

### Shape F — `is_user_logged_in()` only

```php
public static function check_permission() {
    return is_user_logged_in();
}
```

→ WARN. This lets any authenticated user — including subscribers — call
the ability. Rarely what's intended. If deliberate, document in code
comment; otherwise tighten.

## Static grep patterns

Locate the permission callback for each ability:

```bash
# 1. Find the permission_callback => value in the registration array.
grep -rn --include='*.php' -A 40 "wp_register_ability\s*(\s*'<plugin>/<ability>'" <plugin-root>/ \
    | grep -E "'permission_callback'\s*=>"

# 2. Resolve the callback reference (same pattern as execute_callback — see static-enumeration.md).

# 3. Inspect the callback body for the shapes above.
grep -nE "current_user_can\s*\(\s*['\"]([^'\"]+)['\"]|__return_true|return\s+true\s*;|is_user_logged_in\s*\(" <callback-file>

# 4. Red flag — callbacks built around WP_REST_Request (Shape B antipattern).
grep -nE '\$request->get_method|\$request->get_param|WP_REST_Request' <callback-file>
```

Classify each ability by shape A–F and record the resolved capability
(or `__return_true`, or `<unresolvable>`). Any `WP_REST_Request` usage in a
permission callback is a FAIL — flag for rewrite.

## Runtime check

With the env running, exercise the gate against three user contexts using
`WP_Ability::check_permissions()` (the public method that wraps the
registered callback):

```bash
<env-cli> wp --user=admin eval '
$ability = wp_get_ability( "<plugin>/<ability-name>" );
if ( ! $ability ) {
    echo "ability not registered" . PHP_EOL;
    exit( 1 );
}

$results = array();

// Unauthenticated.
wp_set_current_user( 0 );
$results["anon"] = $ability->check_permissions();

// Subscriber (create a fresh user; ignore if already exists).
$sub_login = "verify_sub_" . time();
$sub_id    = wp_create_user( $sub_login, "x", $sub_login . "@example.com" );
if ( ! is_wp_error( $sub_id ) ) {
    $sub_user = get_user_by( "id", $sub_id );
    $sub_user->set_role( "subscriber" );
    wp_set_current_user( $sub_id );
    $results["subscriber"] = $ability->check_permissions();
}

// Admin.
wp_set_current_user( 1 );
$results["admin"] = $ability->check_permissions();

foreach ( $results as $context => $result ) {
    if ( true === $result ) {
        $printable = "true";
    } elseif ( is_wp_error( $result ) ) {
        $printable = "WP_Error(" . $result->get_error_code() . ")";
    } else {
        $printable = var_export( $result, true );
    }
    echo $context . "=" . $printable . PHP_EOL;
}
'
```

Notes on interpretation:

- `check_permissions()` returns `bool|WP_Error`. Treat `true` as
  *allowed*; treat `false` or any `WP_Error` as *denied*.
- A `WP_Error` with code `ability_invalid_permission_callback` means
  the registration didn't supply a valid callable — a hard FAIL.
- A `WP_Error` with code `ability_callback_exception` means the
  callback threw — also a hard FAIL; capture the underlying message.

Expected for a standard (non-public) ability:

```
anon=false
subscriber=false
admin=true
```

Expected for a deliberate public ability (Shape C):

```
anon=true
subscriber=true
admin=true
```

Any deviation → FAIL. Common causes:

- `admin=WP_Error(...)` — bug in the callback or a missing dependency
  the callback transitively requires.
- `admin=false` — the capability check references a cap admin doesn't
  have, or the callback has a bug.
- `subscriber=true` on a non-public ability — permission callback is
  too permissive (Shape E or F, not Shape A).
- `anon=true` on a non-public ability — same, with worse exposure.

## Audit cross-check

If an audit doc was provided, the audit's `capability_gate` field (or each
ability's `permission.resolves_to`) declares what the gate should be.
Compare the registered capability against the audit's declared one:

- Audit says `manage_options`, registration resolves to
  `manage_options` → OK.
- Audit says `manage_options`, registration resolves to
  `edit_posts` → FAIL. Either the audit is wrong or the registration
  drifted.
- Audit is a compound `{read, write}` gate and the registration uses
  Shape B with both caps → OK.
- Audit is a compound gate but the registration uses Shape A (single
  cap only) → FAIL. Write-path abilities would inherit the read gate
  and under-authorize writes (or vice versa).

Cross-reference
`../../wp-abilities-audit/references/capability-gate-tracing.md` for the
tracing mechanics — this skill's validator re-derives the same trace and
compares.

## Output format

```markdown
## Permission gates

| Ability | Shape | Resolved cap(s) | anon | subscriber | admin | Audit match |
|---|---|---|---|---|---|---|
| <ability> | A | manage_options | false | false | true | OK |
| <ability> | B | edit_posts (read), delete_posts (destructive) | false | false | true | OK |
| <ability> | C | __return_true (public) | true | true | true | WARN |
| <ability> | E | (literal true) | true | true | true | FAIL |
```

## Static-only mode caveats

Without runtime mode, only the source-inspection columns are populated.
The table becomes:

| Ability | Shape | Resolved cap(s) | Audit match |
|---|---|---|---|

The roundtrip columns are omitted rather than guessed. Static-mode
reports should make this explicit in the section header:
`Permission gates (static inspection only)`.
