# Security for Admin UI

## The two required gates

Every admin action needs **both**:

1. **Capability check** — authorization ("is this user allowed?")
2. **Nonce verification** — CSRF protection ("did this request come from our page?")

Nonces alone do not authorize. Capability checks alone do not prevent CSRF.

## Capability checks

```php
// At the top of every render callback:
if ( ! current_user_can( 'manage_options' ) ) {
    wp_die( esc_html__( 'You do not have permission.', 'my-plugin' ) );
}

// Before any data write:
if ( ! current_user_can( 'edit_post', $post_id ) ) {
    return;
}
```

## Nonce patterns

### Settings API form (handled automatically)
`settings_fields()` outputs and verifies the nonce via `options.php`. No manual nonce needed.

### Custom form submission
```php
// Output in form:
wp_nonce_field( 'my_plugin_action', 'my_plugin_nonce' );

// Verify before processing:
check_admin_referer( 'my_plugin_action', 'my_plugin_nonce' );
// ^ dies automatically on failure
```

### AJAX / REST API
```php
// PHP: verify on server
check_ajax_referer( 'my_plugin_ajax', 'nonce' );

// JS: pass nonce in request header
apiFetch( { path: '/my-plugin/v1/...', headers: { 'X-WP-Nonce': wpApiSettings.nonce } } );
```

## Input sanitization

| Input type | Function |
|---|---|
| Plain text | `sanitize_text_field( wp_unslash( $val ) )` |
| Integer | `absint( $val )` |
| Email | `sanitize_email( $val )` |
| URL | `esc_url_raw( $val )` |
| HTML (trusted) | `wp_kses_post( $val )` |
| Textarea | `sanitize_textarea_field( wp_unslash( $val ) )` |

Always call `wp_unslash()` before sanitizing `$_POST` / `$_GET` values.

## Output escaping

| Context | Function |
|---|---|
| HTML body text | `esc_html()` |
| HTML attribute | `esc_attr()` |
| URLs (href, src) | `esc_url()` |
| JS inline data | `wp_json_encode()` |
| Trusted HTML | `wp_kses_post()` |

Escape **as late as possible** — at the point of output, not when storing.

## SQL safety

Never interpolate user input into SQL. Use `$wpdb->prepare()`:

```php
global $wpdb;
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}my_table WHERE user_id = %d AND status = %s",
        absint( $user_id ),
        sanitize_text_field( $status )
    )
);
```
