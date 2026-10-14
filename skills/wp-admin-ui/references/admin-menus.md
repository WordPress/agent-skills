# Admin Menus

## Registering pages

```php
add_action( 'admin_menu', function () {
    add_menu_page(
        __( 'My Plugin', 'my-plugin' ),   // page title
        __( 'My Plugin', 'my-plugin' ),   // menu title
        'manage_options',                  // required capability
        'my-plugin',                       // menu slug
        'my_plugin_render_page',           // render callback
        'dashicons-admin-generic',         // icon
        80                                 // position
    );

    add_submenu_page(
        'my-plugin',                       // parent slug
        __( 'Settings', 'my-plugin' ),
        __( 'Settings', 'my-plugin' ),
        'manage_options',
        'my-plugin-settings',
        'my_plugin_render_settings_page'
    );
} );
```

## Capability selection

| Scope | Capability |
|---|---|
| Site-wide settings | `manage_options` |
| Content management | `edit_posts` |
| User management | `list_users` |
| Custom post type | `edit_{post_type}s` |

Always choose the **narrowest** capability that covers the feature.

## Gating the render callback

Always verify capability at the top of every render callback — menu registration is not sufficient:

```php
function my_plugin_render_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'You do not have permission to access this page.', 'my-plugin' ) );
    }
    // render ...
}
```

## Enqueuing assets only on your pages

Use the `$hook` parameter from `admin_enqueue_scripts` to avoid loading assets globally:

```php
add_action( 'admin_enqueue_scripts', function ( $hook ) {
    if ( 'toplevel_page_my-plugin' !== $hook ) {
        return;
    }
    wp_enqueue_script( 'my-plugin-admin', plugin_dir_url( __FILE__ ) . 'build/index.js', [ 'wp-element' ], '1.0.0', true );
    wp_localize_script( 'my-plugin-admin', 'myPluginData', [
        'nonce' => wp_create_nonce( 'wp_rest' ),
        'apiUrl' => rest_url( 'my-plugin/v1/' ),
    ] );
} );
```

The hook name format is `{type}_page_{slug}` for submenus and `toplevel_page_{slug}` for top-level pages.
