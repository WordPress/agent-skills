<?php
// Safe: reject an ID that converts to 0 before checking the user's capability.
// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Read-only lookup: nothing is changed, and the capability check below controls access.
$post_id = absint( wp_unslash( $_POST['post_id'] ?? '' ) );
if ( ! $post_id ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( 'read_post', $post_id ) ) {
	wp_send_json_error( null, 403 );
}
$title = $wpdb->get_var(
	$wpdb->prepare( "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $post_id )
);
