<?php
// Safe: verify the nonce and capability before the protected write.
$nonce = sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ?? '' ) );
if ( ! wp_verify_nonce( $nonce, 'myplugin_save' ) ) {
	wp_die( esc_html__( 'Invalid request.', 'myplugin' ), '', array( 'response' => 403 ) );
}
if ( ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html__( 'You are not allowed to do this.', 'myplugin' ), '', array( 'response' => 403 ) );
}
update_option( 'myplugin_color', sanitize_text_field( wp_unslash( $_POST['color'] ?? '' ) ) );
