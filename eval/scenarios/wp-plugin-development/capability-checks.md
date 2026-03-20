# Security: Capability Checks

Skill: wp-plugin-development

Every privileged operation must verify the current user has the required capability. Missing capability checks allow unauthorized users to perform admin actions.

## Admin handlers check capabilities

**Given** a function that modifies plugin settings or site data
**When** the function is called
**Then** it must call `current_user_can()` with an appropriate capability before making changes

### Examples

Pass:
```php
function my_plugin_delete_item( int $item_id ): void {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Unauthorized.' );
    }
    // Delete the item...
}
```

Fail:
```php
function my_plugin_delete_item( int $item_id ): void {
    // Delete the item...
    $wpdb->delete( $wpdb->prefix . 'my_items', [ 'id' => $item_id ] );
}
```
No capability check. Any authenticated user who can reach this function can delete items.

## Menu pages specify capabilities

**Given** an admin menu page registration
**When** `add_menu_page` or `add_submenu_page` is called
**Then** the `capability` argument must be specific to the page's purpose, not a generic fallback

### Examples

Pass:
```php
add_submenu_page(
    'options-general.php',
    'My Plugin Settings',
    'My Plugin',
    'manage_options',
    'my-plugin-settings',
    'my_plugin_settings_page'
);
```

Fail:
```php
add_submenu_page(
    'options-general.php',
    'My Plugin Settings',
    'My Plugin',
    'read',
    'my-plugin-settings',
    'my_plugin_settings_page'
);
```
Using `read` capability for a settings page. Any logged-in user (including Subscribers) can access and modify plugin settings.

## REST endpoints have permission callbacks

**Given** a REST route registration
**When** `register_rest_route` is called
**Then** the `permission_callback` must check a capability, not return `true` unconditionally (unless intentionally public)

### Examples

Pass:
```php
register_rest_route( 'my-plugin/v1', '/settings', [
    'methods'             => 'POST',
    'callback'            => 'my_plugin_update_settings',
    'permission_callback' => function () {
        return current_user_can( 'manage_options' );
    },
] );
```

Fail:
```php
register_rest_route( 'my-plugin/v1', '/settings', [
    'methods'             => 'POST',
    'callback'            => 'my_plugin_update_settings',
    'permission_callback' => '__return_true',
] );
```
Public write endpoint for settings. Anyone on the internet can modify plugin configuration.
