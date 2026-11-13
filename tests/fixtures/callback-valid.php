<?php
/*
 * Safe: the request can only pick a callback the plugin owns. The same map
 * pattern applies to class names before new $class and to hook names.
 */
check_admin_referer( 'myplugin_run_task' );
$tasks   = array(
	'export'  => array(
		'callback'   => 'myplugin_export_post',
		'capability' => 'edit_post',
	),
	'preview' => array(
		'callback'   => 'myplugin_preview_post',
		'capability' => 'read_post',
	),
);
$task    = sanitize_key( wp_unslash( $_POST['task'] ?? '' ) );
$post_id = absint( wp_unslash( $_POST['post_id'] ?? 0 ) );
if ( ! isset( $tasks[ $task ] ) ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( $tasks[ $task ]['capability'], $post_id ) ) {
	wp_send_json_error( null, 403 );
}
call_user_func( $tasks[ $task ]['callback'], $post_id );

function myplugin_export_post( $post_id ) {
	return get_post( $post_id );
}

function myplugin_preview_post( $post_id ) {
	return get_post( $post_id );
}
