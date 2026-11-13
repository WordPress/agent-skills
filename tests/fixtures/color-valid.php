<?php
// Safe: browser/admin POST handler.
check_admin_referer( 'myplugin_save_settings' );
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
}

// Read the keys the form owns, unslash each one, and sanitize it for its type.
$color = wp_unslash( $_POST['color'] ?? '' );
if ( ! is_string( $color ) ) {
	wp_send_json_error( null, 400 );
}
$color = sanitize_hex_color( $color );
if ( '' === $color || null === $color ) {
	wp_send_json_error( null, 400 );
}
$settings = array(
	'color'   => $color,
	'columns' => absint( wp_unslash( $_POST['columns'] ?? 0 ) ),
	'title'   => sanitize_text_field( wp_unslash( $_POST['title'] ?? '' ) ),
);
update_option( 'myplugin_settings', $settings );
