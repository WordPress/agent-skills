# Settings API

Use the Settings API for plugin options pages. It handles nonces, option persistence, and validation hooks automatically via `options.php`.

## Registration (on `admin_init`)

```php
add_action( 'admin_init', function () {
    register_setting(
        'my_plugin_options',          // option group (matches settings_fields())
        'my_plugin_options',          // option name stored in wp_options
        [
            'sanitize_callback' => 'my_plugin_sanitize_options',
            'default'           => [ 'enable_feature' => false, 'api_key' => '' ],
        ]
    );

    add_settings_section(
        'my_plugin_general',
        __( 'General', 'my-plugin' ),
        '__return_false',             // optional description callback
        'my-plugin-settings'          // page slug passed to do_settings_sections()
    );

    add_settings_field(
        'my_plugin_api_key',
        __( 'API Key', 'my-plugin' ),
        'my_plugin_field_api_key',
        'my-plugin-settings',
        'my_plugin_general'
    );
} );
```

## Sanitize callback

Return a clean value or add a settings error and return the old value:

```php
function my_plugin_sanitize_options( $input ) {
    $clean = [];
    $clean['enable_feature'] = ! empty( $input['enable_feature'] );
    $clean['api_key']        = sanitize_text_field( $input['api_key'] ?? '' );

    if ( empty( $clean['api_key'] ) ) {
        add_settings_error( 'my_plugin_options', 'missing_api_key', __( 'API key is required.', 'my-plugin' ) );
        $clean['api_key'] = get_option( 'my_plugin_options' )['api_key'] ?? '';
    }

    return $clean;
}
```

## Render the page

```php
function my_plugin_render_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    settings_errors( 'my_plugin_options' );
    ?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <form method="post" action="options.php">
            <?php
            settings_fields( 'my_plugin_options' );   // nonce + option group
            do_settings_sections( 'my-plugin-settings' );
            submit_button();
            ?>
        </form>
    </div>
    <?php
}
```

## Reading saved options

```php
$options = get_option( 'my_plugin_options', [] );
$api_key = $options['api_key'] ?? '';
```

## Common mistakes

- Forgetting `settings_fields()` — nonce and option group verification will fail.
- Calling `register_setting()` inside the render callback instead of `admin_init`.
- Returning `null` from `sanitize_callback` — WordPress saves an empty string, silently wiping data.
