<?php
check_admin_referer( 'myplugin_save' );      // Admin forms and admin-post.php.
if ( ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html__( 'You are not allowed to do this.', 'myplugin' ), '', array( 'response' => 403 ) );
}
update_option( 'myplugin_color', sanitize_text_field( wp_unslash( $_POST['color'] ?? '' ) ) );
