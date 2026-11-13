<?php
check_ajax_referer( 'myplugin_save' );       // admin-ajax.php handlers.
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
}
update_option( 'myplugin_color', sanitize_text_field( wp_unslash( $_POST['color'] ?? '' ) ) );
