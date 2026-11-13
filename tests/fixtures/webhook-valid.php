<?php
namespace InputSecuritySnippetTest;
// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.
// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Secret: compared with hash_equals() only, never stored or printed.
$signature = isset( $_SERVER['HTTP_X_MYPLUGIN_SIGNATURE'] ) ? wp_unslash( $_SERVER['HTTP_X_MYPLUGIN_SIGNATURE'] ) : '';
$secret    = get_option( 'myplugin_webhook_secret', '' );
if (
	! is_string( $secret )
	|| '' === $secret
	|| ! is_string( $signature )
	|| 64 !== strlen( $signature )
	|| ! ctype_xdigit( $signature )
) {
	wp_send_json_error( null, 401 );
}
$payload = file_get_contents( 'php://input' );
if ( false === $payload ) {
	wp_send_json_error( null, 401 );
}
$expected = hash_hmac( 'sha256', $payload, $secret );
if ( ! hash_equals( $expected, $signature ) ) {
	wp_send_json_error( null, 401 );
}
