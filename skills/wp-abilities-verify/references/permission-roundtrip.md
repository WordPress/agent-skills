# Permission Roundtrip

Verify that the registered `permission_callback` on every ability actually
gates on a real capability — statically (by source inspection) and, in
runtime mode, by exercising the gate against subscriber and admin users.

## Static check

Every ability registration includes a `permission_callback`:

```php
wp_register_ability(
    'myplugin/get-things',
    [
        'permission_callback' => [ self::class, 'check_permission' ],
        // ...
    ]
);
```

Inspect the callback's body. It must match one of these shapes:

### Shape A — direct `current_user_can(...)` check (preferred)

```php
public static function check_permission() {
    return current_user_can( 'manage_woocommerce' );
}
```

→ OK. Record the resolved capability.

### Shape B — compound read/write check

```php
public static function check_permission( $request ) {
    if ( 'GET' === $request->get_method() ) {
        return current_user_can( 'read_private_shop_orders' );
    }
    return current_user_can( 'edit_shop_orders' );
}
```

→ OK. Record both capabilities.

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

# 3. Inspect the callback body.
grep -nE "current_user_can\s*\(\s*['\"]([^'\"]+)['\"]|__return_true|return\s+true\s*;|is_user_logged_in\s*\(" <callback-file>
```

Classify each ability by shape A-F above and record the resolved
capability (or `__return_true`, or `<unresolvable>`).

## Runtime check

With the env running, exercise the gate against three user roles:

```bash
<env-cli> wp --user=admin eval '
$ability = wp_get_ability( "<plugin>/<ability-name>" );

// Unauthenticated.
wp_set_current_user( 0 );
$anon = $ability->user_can_execute();

// Subscriber.
$sub = wp_create_user( "verify_sub_" . time(), "x", "verify_sub_" . time() . "@example.test" );
$user = get_user_by( "id", $sub );
$user->set_role( "subscriber" );
wp_set_current_user( $sub );
$subscriber = $ability->user_can_execute();

// Admin.
wp_set_current_user( 1 );
$admin = $ability->user_can_execute();

echo "anon=" . var_export( $anon, true ) . PHP_EOL;
echo "subscriber=" . var_export( $subscriber, true ) . PHP_EOL;
echo "admin=" . var_export( $admin, true ) . PHP_EOL;
'
```

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

- `admin=false` — the capability check references a cap admin doesn't
  have, or the callback has a bug.
- `subscriber=true` on a non-public ability — permission callback is
  too permissive (Shape E or F, not Shape A).
- `anon=true` on a non-public ability — same, with worse exposure.

## Audit cross-check

If an audit doc was provided, the audit's `capability_gate` field (or the
per-ability `permission.resolves_to`) declares what the gate should be.
Compare the registered capability against the audit's declared one:

- Audit says `manage_woocommerce`, registration resolves to
  `manage_woocommerce` → OK.
- Audit says `manage_woocommerce`, registration resolves to
  `manage_options` → FAIL. Either the audit is wrong or the registration
  drifted.
- Audit is a compound `{read, write}` gate and the registration uses
  Shape B with both caps → OK.
- Audit is a compound gate but the registration uses Shape A (single
  cap only) → FAIL. Write-path abilities would inherit the read gate
  and under-authorize writes.

Cross-reference
`../wp-abilities-audit/references/capability-gate-tracing.md` for the
tracing mechanics — this skill's validator re-derives the same trace and
compares.

## Output format

```markdown
## Permission gates

| Ability | Shape | Resolved cap(s) | anon | subscriber | admin | Audit match |
|---|---|---|---|---|---|---|
| <ability> | A | manage_woocommerce | false | false | true | OK |
| <ability> | B | read:read_private_shop_orders, write:edit_shop_orders | false | false | true | OK |
| <ability> | C | __return_true (public) | true | true | true | WARN |
| <ability> | E | (literal true) | true | true | true | FAIL |
```

## Static-only mode caveats

Without runtime mode, only the source-inspection columns are populated.
The table becomes:

| Ability | Shape | Resolved cap(s) | Audit match |
|---|---|---|---|

The roundtrip columns get omitted rather than guessed. Static-mode
reports should make this explicit in the section header:
`Permission gates (static inspection only)`.
