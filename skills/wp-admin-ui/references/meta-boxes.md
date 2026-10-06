# Meta Boxes

## Registration

```php
add_action( 'add_meta_boxes', function () {
    add_meta_box(
        'my_plugin_meta_box',
        __( 'My Plugin Details', 'my-plugin' ),
        'my_plugin_render_meta_box',
        [ 'post', 'page' ],      // screens; can also be a custom post type slug
        'normal',                 // context: normal | side | advanced
        'high'                    // priority: high | default | low
    );
} );
```

## Render callback

Always output a nonce field so save can verify it:

```php
function my_plugin_render_meta_box( $post ) {
    wp_nonce_field( 'my_plugin_save_meta_' . $post->ID, 'my_plugin_meta_nonce' );
    $value = get_post_meta( $post->ID, '_my_plugin_key', true );
    ?>
    <label for="my_plugin_field"><?php esc_html_e( 'Custom Value', 'my-plugin' ); ?></label>
    <input type="text" id="my_plugin_field" name="my_plugin_field" value="<?php echo esc_attr( $value ); ?>">
    <?php
}
```

## Save handler

```php
add_action( 'save_post', function ( $post_id ) {
    // Guard: auto-save
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }
    // Guard: nonce
    if ( ! isset( $_POST['my_plugin_meta_nonce'] ) ||
         ! wp_verify_nonce( $_POST['my_plugin_meta_nonce'], 'my_plugin_save_meta_' . $post_id ) ) {
        return;
    }
    // Guard: capability
    if ( ! current_user_can( 'edit_post', $post_id ) ) {
        return;
    }
    // Save
    if ( isset( $_POST['my_plugin_field'] ) ) {
        update_post_meta( $post_id, '_my_plugin_key', sanitize_text_field( wp_unslash( $_POST['my_plugin_field'] ) ) );
    }
} );
```

## Common mistakes

- Missing auto-save guard — meta gets wiped on every auto-save heartbeat.
- Nonce action string mismatch between `wp_nonce_field()` and `wp_verify_nonce()`.
- Calling `add_meta_box()` directly at plugin load time instead of inside `add_meta_boxes` hook.
- Using `update_post_meta()` without sanitizing input first.
