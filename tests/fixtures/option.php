<?php
// Safe: the request can only pick from a fixed map.
check_admin_referer( 'myplugin_update_setting' );
$options = array(
	'color'  => 'myplugin_color',
	'layout' => 'myplugin_layout',
);
$key = sanitize_key( wp_unslash( $_POST['setting'] ?? '' ) );
if ( ! isset( $options[ $key ] ) ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
}
update_option( $options[ $key ], sanitize_text_field( wp_unslash( $_POST['value'] ?? '' ) ) );
