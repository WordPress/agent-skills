# Permission Roundtrip

Verify that the registered `permission_callback` on every ability
actually gates on a real capability — statically (by source
inspection) and, in runtime mode, by exercising the gate against
unauthenticated, subscriber, and admin contexts.

## Background — what `permission_callback` actually receives

When an ability is invoked, the registered `permission_callback` is
called through `WP_Ability::check_permissions( $input )`, which
dispatches to `WP_Ability::invoke_callback( $callback, $input )` (both
defined in `class-wp-ability.php` in WordPress core).

`invoke_callback`'s contract:

- If the ability declares a non-empty `input_schema`, the callback is
  invoked with one positional argument: the validated `$input` value
  (whatever the schema's root type produced — array, string, integer,
  boolean, etc.).
- If `input_schema` is empty or absent, the callback is invoked **with
  no arguments**.

In particular, the callback **never receives a `WP_REST_Request`**,
even when the ability is reached via the REST bridge. The bridge
unwraps the request, runs schema validation, and passes the validated
value down. Permission callbacks built around `WP_REST_Request`
patterns (e.g. `$request->get_method()`) cannot work as-is when copied
from a REST controller — flag any such usage as a static FAIL.

## Static check — classify each callback's shape

Read each ability's `permission_callback` body and classify:

| Shape | Body | Result | Notes |
|---|---|---|---|
| A | `return current_user_can( 'cap' );` | OK | Preferred. Record the resolved capability. |
| B | Branches on `$input` — different cap for different shapes | OK with smell | Two distinct user actions usually want two abilities, each with its own Shape A. See `../../wp-abilities-api/references/domain-vs-projection.md`. |
| B-bad | Branches on `$request->get_method()` or other `WP_REST_Request` calls | FAIL | The argument is the validated input value, not a request object. Almost always a copy from a REST controller without translation. |
| C | `'__return_true'` | WARN | Deliberate public ability. Document the reason in code or in the audit doc's `risks` array. |
| D | Delegates to a helper that resolves to `current_user_can(...)` | OK | Trace the helper. If it returns `true` unconditionally, treat as Shape C. |
| E | `return true;` (literal) | FAIL | Functionally Shape C but harder to grep for. Change to `'__return_true'` or add a real cap check. |
| F | `return is_user_logged_in();` | WARN | Lets any authenticated user — including subscribers — call. Rarely intended. Document or tighten. |

Record per ability: `(shape, resolved_cap)`. Any Shape B-bad or
Shape E → static FAIL. Shapes C and F → WARN. Shapes A, B, D → OK.

## Runtime check

Exercise the gate against three user contexts using
`WP_Ability::check_permissions( $input )`.

`check_permissions()` accepts an optional input value and passes it
through to the registered `permission_callback`. Shape A callbacks
(`return current_user_can('cap')`) don't read it. Shape B callbacks
that branch on `$input` (the smell the static check flags) need a
representative value to exercise the real gate; otherwise they
receive `null` and the roundtrip result is misleading. The snippet
below passes `array()` — the minimal safe input for object-typed
schemas. For abilities with a non-object root schema, substitute a
representative value of the declared root type.

```bash
<env-cli> wp --user=admin eval '
$ability = wp_get_ability( "<plugin>/<ability-name>" );
if ( ! $ability ) {
    echo "ability not registered" . PHP_EOL;
    exit( 1 );
}

$input   = array(); // representative input; substitute for non-object root schemas.
$results = array();

// Unauthenticated.
wp_set_current_user( 0 );
$results["anon"] = $ability->check_permissions( $input );

// Subscriber (create a fresh user).
$sub_login = "verify_sub_" . time();
$sub_id    = wp_create_user( $sub_login, "x", $sub_login . "@example.com" );
if ( ! is_wp_error( $sub_id ) ) {
    $sub_user = get_user_by( "id", $sub_id );
    $sub_user->set_role( "subscriber" );
    wp_set_current_user( $sub_id );
    $results["subscriber"] = $ability->check_permissions( $input );
}

// Admin.
wp_set_current_user( 1 );
$results["admin"] = $ability->check_permissions( $input );

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

// Cleanup the test subscriber so repeated harness runs don't accumulate users
// on shared dev environments. Already running as admin (line above), so the
// caller has the delete_users capability. On multisite, wp_delete_user() only
// removes the user from the current site's membership — wpmu_delete_user() in
// wp-admin/includes/ms.php is the network-wide delete.
if ( isset( $sub_id ) && ! is_wp_error( $sub_id ) ) {
    if ( is_multisite() ) {
        require_once ABSPATH . "wp-admin/includes/ms.php";
        wpmu_delete_user( $sub_id );
    } else {
        require_once ABSPATH . "wp-admin/includes/user.php";
        wp_delete_user( $sub_id );
    }
}
'
```

Notes on interpretation:

- `check_permissions()` returns `bool|WP_Error`. Treat `true` as
  *allowed*; treat `false` or any `WP_Error` as *denied*.
- A `WP_Error` with code `ability_invalid_permission_callback` means
  the registration didn't supply a valid callable — hard FAIL.
- A `WP_Error` with code `ability_callback_exception` means the
  callback threw — hard FAIL; capture the underlying message.

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

Any deviation → FAIL. Common causes: cap reference an admin doesn't
hold, callback bug, or permission too permissive (Shape E or F when it
should have been Shape A).

## Audit cross-check

If an audit doc was provided, the audit's `capability_gate` (or each
ability's `permission.resolves_to`) declares what the gate should be.
Compare:

- Audit and registration resolve to the same cap → OK.
- Audit and registration disagree → FAIL. Either the audit is wrong or
  the registration drifted.
- Audit declares a compound `{read, write}` gate, registration uses
  Shape B with both caps → OK.
- Audit declares a compound gate, registration uses Shape A (single
  cap) → FAIL. Write paths would inherit the read gate (or vice
  versa), under- or over-authorizing.

See `../../wp-abilities-audit/references/capability-gate-tracing.md`
for the tracing mechanics; this skill re-derives the same trace and
diffs.

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

Without runtime mode, only the source-inspection columns are
populated:

| Ability | Shape | Resolved cap(s) | Audit match |
|---|---|---|---|

Roundtrip columns are omitted rather than guessed. Flag in the section
header: `Permission gates (static inspection only)`.
