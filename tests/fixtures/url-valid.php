<?php
// Safe: browser/admin POST handler.
check_admin_referer( 'myplugin_save_link' );
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
}

// Reject a non-string value before URL sanitation.
$raw_link = wp_unslash( $_POST['link'] ?? '' );
if ( ! is_string( $raw_link ) ) {
	wp_send_json_error( array( 'message' => __( 'Enter a valid URL.', 'myplugin' ) ), 400 );
}
$link = esc_url_raw( $raw_link, array( 'http', 'https' ) );
if ( '' === $link ) {
	wp_send_json_error( array( 'message' => __( 'Enter a valid URL.', 'myplugin' ) ), 400 );
}
update_option( 'myplugin_link', $link );
