<?php

namespace {

class RequestStopped extends \RuntimeException {}

function wp_verify_nonce( $nonce, $action ) {
	$GLOBALS['events'][] = 'verify_nonce';
	return $GLOBALS['nonce_valid'];
}

function check_admin_referer( $action ) {
	$GLOBALS['events'][] = 'check_admin_referer';
	if ( ! $GLOBALS['nonce_valid'] ) {
		throw new RequestStopped( '', 403 );
	}
}

function current_user_can( ...$args ) {
	$GLOBALS['events'][] = array( 'capability', $args );
	return $GLOBALS['capability_allowed'];
}

function wp_die( $message = '', $title = '', $args = array() ) {
	throw new RequestStopped( '', $args['response'] ?? 500 );
}

function esc_html__( $message, $domain ) {
	return $message;
}

function __( $message, $domain ) {
	return $message;
}

function wp_send_json_error( $data = null, $status = 400 ) {
	throw new RequestStopped( '', $status );
}

function wp_unslash( $value ) {
	return $value;
}

function sanitize_text_field( $value ) {
	return is_string( $value ) ? trim( strip_tags( $value ) ) : '';
}

function sanitize_hex_color( $value ) {
	$GLOBALS['color_sanitizations'][] = $value;
	if ( is_string( $value ) && preg_match( '/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/', $value ) ) {
		return $value;
	}
	return '' === $value ? '' : null;
}

function esc_url_raw( $value, $protocols = array() ) {
	$GLOBALS['url_sanitizations'][] = array( $value, $protocols );
	return $GLOBALS['url_sanitizer_result'];
}

function absint( $value ) {
	return abs( (int) $value );
}

function sanitize_key( $value ) {
	return strtolower( preg_replace( '/[^a-z0-9_-]/i', '', $value ) );
}

function update_option( $name, $value ) {
	$GLOBALS['events'][] = 'write';
	$GLOBALS['writes'][] = array( $name, $value );
}

function get_option( $name, $default = '' ) {
	return $GLOBALS['stored_options'][ $name ] ?? $default;
}

function get_post( $post_id ) {
	$GLOBALS['dispatches'][] = $post_id;
	return $post_id;
}

}

namespace InputSecuritySnippetTest {
function file_get_contents( $filename ) {
	$GLOBALS['body_reads']++;
	return 'php://input' === $filename ? $GLOBALS['request_body'] : false;
}

function error_log( $message ) {
	$GLOBALS['logged_messages'][] = $message;
	return true;
}
}

namespace {

function fail( $message ) {
	fwrite( STDERR, $message . "\n" );
	exit( 1 );
}

function check( $condition, $message ) {
	if ( ! $condition ) {
		fail( $message );
	}
}

function documented_snippet( $markdown, $marker ) {
	if ( ! preg_match_all( '/```php[ \t]*\R(.*?)\R```/s', $markdown, $matches ) ) {
		fail( 'No PHP snippets found.' );
	}

	foreach ( $matches[1] as $block ) {
		$marker_position = strpos( $block, $marker );
		if ( false === $marker_position ) {
			continue;
		}

		$before = substr( $block, 0, $marker_position );
		$start  = strrpos( $before, "\n" );
		$comment_start = strrpos( $before, '/*' );
		$comment_end   = strrpos( $before, '*/' );
		if ( false !== $comment_start && ( false === $comment_end || $comment_start > $comment_end ) ) {
			$start = $comment_start - 1;
		}

		return substr( $block, false === $start ? 0 : $start + 1 );
	}

	fail( 'Could not find documented PHP snippet marker: ' . $marker );
}

function cases() {
	return array(
		'nonce-invalid'             => array( '01-nonce-input.md', '// Safe: verify the nonce and capability before the protected write.' ),
		'nonce-denied'              => array( '01-nonce-input.md', '// Safe: verify the nonce and capability before the protected write.' ),
		'nonce-valid'               => array( '01-nonce-input.md', '// Safe: verify the nonce and capability before the protected write.' ),
		'callback-denied'           => array( '06-allowlist-sensitive-positions.md', ' * Safe: the request can only pick a callback the plugin owns.' ),
		'callback-valid'            => array( '06-allowlist-sensitive-positions.md', ' * Safe: the request can only pick a callback the plugin owns.' ),
		'callback-unmapped'         => array( '06-allowlist-sensitive-positions.md', ' * Safe: the request can only pick a callback the plugin owns.' ),
		'color-array'               => array( '02-explicit-keys.md', '// Safe: browser/admin POST handler.' ),
		'color-invalid'             => array( '02-explicit-keys.md', '// Safe: browser/admin POST handler.' ),
		'color-valid'               => array( '02-explicit-keys.md', '// Safe: browser/admin POST handler.' ),
		'url-array'                 => array( '03-validate-sanitize-type.md', '// Safe: browser/admin POST handler.' ),
		'url-empty-result'          => array( '03-validate-sanitize-type.md', '// Safe: browser/admin POST handler.' ),
		'url-valid'                 => array( '03-validate-sanitize-type.md', '// Safe: browser/admin POST handler.' ),
		'webhook-empty-secret'      => array( '05-secrets.md', '// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.' ),
		'webhook-non-string-secret' => array( '05-secrets.md', '// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.' ),
		'webhook-malformed-signature' => array( '05-secrets.md', '// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.' ),
		'webhook-altered-signature' => array( '05-secrets.md', '// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.' ),
		'webhook-unreadable-body'    => array( '05-secrets.md', '// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.' ),
		'webhook-valid'              => array( '05-secrets.md', '// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.' ),
	);
}

function run_case( $case ) {
	$cases = cases();
	check( isset( $cases[ $case ] ), 'Unknown test case: ' . $case );
	$fixture_group = 0 === strpos( $case, 'url-' ) ? 'url' : substr( $case, 0, strpos( $case, '-' ) );
	if ( 'webhook' === $fixture_group ) {
		$fixture_group = 'webhook';
	} elseif ( 'nonce' === $fixture_group ) {
		$fixture_group = 'nonce';
	}

	$GLOBALS['events']                 = array();
	$GLOBALS['writes']                 = array();
	$GLOBALS['dispatches']             = array();
	$GLOBALS['color_sanitizations']    = array();
	$GLOBALS['url_sanitizations']      = array();
	$GLOBALS['url_sanitizer_result']   = '';
	$GLOBALS['logged_messages']        = array();
	$GLOBALS['body_reads']             = 0;
	$GLOBALS['request_body']           = '{"event":"test"}';
	$GLOBALS['nonce_valid']            = true;
	$GLOBALS['capability_allowed']     = true;
	$GLOBALS['stored_options']         = array();
	$_POST                              = array();
	$_SERVER                            = array();
	$stopped                            = false;
	$status                             = 0;

	$input_root   = dirname( __DIR__ ) . '/skills/wp-plugin-development/references/security/input/';
	$fixture_name = $fixture_group . '-valid';
	$test_fixture = __DIR__ . '/fixtures/' . $fixture_name . '.php';
	$fixture_info = $cases[ $case ];
	$document     = \file_get_contents( $input_root . $fixture_info[0] );
	$fixture      = \file_get_contents( $test_fixture );
	check( false !== $document && false !== $fixture, 'Could not read documentation or test fixture.' );

	$expected_prefix = 'webhook' === $fixture_group
		? "<?php\nnamespace InputSecuritySnippetTest;\n"
		: "<?php\n";
	check( str_starts_with( $fixture, $expected_prefix ), 'Fixture namespace prefix changed.' );
	$fixture_code = substr( $fixture, strlen( $expected_prefix ) );
	$snippet      = documented_snippet( $document, $fixture_info[1] );
	check( trim( $fixture_code ) === trim( $snippet ), 'Fixture no longer matches the documented safe snippet.' );

	switch ( $case ) {
		case 'nonce-invalid':
			$GLOBALS['nonce_valid'] = false;
			$_POST                  = array( 'color' => '#abc' );
			break;
		case 'nonce-denied':
			$GLOBALS['capability_allowed'] = false;
			$_POST                         = array( 'color' => '#abc' );
			break;
		case 'nonce-valid':
			$_POST = array( 'color' => '#abc' );
			break;
		case 'callback-denied':
			$GLOBALS['capability_allowed'] = false;
			$_POST                         = array( 'task' => 'export', 'post_id' => '25' );
			break;
		case 'callback-valid':
			$_POST = array( 'task' => 'export', 'post_id' => '25' );
			break;
		case 'callback-unmapped':
			$_POST = array( 'task' => 'wp_delete_post', 'post_id' => '25' );
			break;
		case 'color-array':
			$_POST = array( 'color' => array( '#abc' ), 'columns' => '2', 'title' => 'Title' );
			break;
		case 'color-invalid':
			$_POST = array( 'color' => 'not-a-color', 'columns' => '2', 'title' => 'Title' );
			break;
		case 'color-valid':
			$_POST = array( 'color' => '#aabbcc', 'columns' => '2', 'title' => 'Title' );
			break;
		case 'url-array':
			$_POST = array( 'link' => array( 'https://example.test/' ) );
			$GLOBALS['url_sanitizer_result'] = 'https://example.test/';
			break;
		case 'url-empty-result':
			$_POST = array( 'link' => 'not-a-url' );
			$GLOBALS['url_sanitizer_result'] = '';
			break;
		case 'url-valid':
			$_POST = array( 'link' => 'https://example.test/path' );
			$GLOBALS['url_sanitizer_result'] = 'https://example.test/path';
			break;
		case 'webhook-empty-secret':
			$GLOBALS['stored_options']['myplugin_webhook_secret'] = '';
			$_SERVER['HTTP_X_MYPLUGIN_SIGNATURE']                 = str_repeat( 'a', 64 );
			break;
		case 'webhook-non-string-secret':
			$GLOBALS['stored_options']['myplugin_webhook_secret'] = array( 'secret' );
			$_SERVER['HTTP_X_MYPLUGIN_SIGNATURE']                 = str_repeat( 'a', 64 );
			break;
		case 'webhook-malformed-signature':
			$GLOBALS['stored_options']['myplugin_webhook_secret'] = 'test-secret';
			$_SERVER['HTTP_X_MYPLUGIN_SIGNATURE']                 = str_repeat( 'z', 64 );
			break;
		case 'webhook-altered-signature':
			$GLOBALS['stored_options']['myplugin_webhook_secret'] = 'test-secret';
			$signature = hash_hmac( 'sha256', $GLOBALS['request_body'], 'test-secret' );
			$_SERVER['HTTP_X_MYPLUGIN_SIGNATURE'] = substr( $signature, 0, -1 ) . ( '0' === substr( $signature, -1 ) ? '1' : '0' );
			break;
		case 'webhook-unreadable-body':
			$GLOBALS['stored_options']['myplugin_webhook_secret'] = 'test-secret';
			$GLOBALS['request_body'] = false;
			$_SERVER['HTTP_X_MYPLUGIN_SIGNATURE'] = str_repeat( 'a', 64 );
			break;
		case 'webhook-valid':
			$GLOBALS['stored_options']['myplugin_webhook_secret'] = 'test-secret';
			$_SERVER['HTTP_X_MYPLUGIN_SIGNATURE']                 = hash_hmac( 'sha256', $GLOBALS['request_body'], 'test-secret' );
			break;
	}

	try {
		require $test_fixture;
	} catch ( RequestStopped $exception ) {
		$stopped = true;
		$status  = $exception->getCode();
	}

	switch ( $case ) {
		case 'nonce-invalid':
			check( $stopped && 403 === $status && empty( $GLOBALS['writes'] ), 'Invalid nonce did not stop the write.' );
			check( array( 'verify_nonce' ) === $GLOBALS['events'], 'Capability/write ran after nonce failure.' );
			break;
		case 'nonce-denied':
			check( $stopped && 403 === $status && empty( $GLOBALS['writes'] ), 'Denied capability did not stop the write.' );
			check( array( 'verify_nonce', array( 'capability', array( 'manage_options' ) ) ) === $GLOBALS['events'], 'Write was not gated by nonce and capability.' );
			break;
		case 'nonce-valid':
			check( ! $stopped && 1 === count( $GLOBALS['writes'] ), 'Authorized nonce path did not write.' );
			check( array( 'verify_nonce', array( 'capability', array( 'manage_options' ) ), 'write' ) === $GLOBALS['events'], 'Write occurred before required checks.' );
			break;
		case 'callback-denied':
			check( $stopped && 403 === $status && empty( $GLOBALS['dispatches'] ), 'Denied callback capability still dispatched.' );
			check( array( array( 'capability', array( 'edit_post', 25 ) ) ) === array_values( array_filter( $GLOBALS['events'], 'is_array' ) ), 'Callback capability did not match the selected post.' );
			break;
		case 'callback-valid':
			check( ! $stopped && array( 25 ) === $GLOBALS['dispatches'], 'Authorized mapped callback did not dispatch.' );
			break;
		case 'callback-unmapped':
			check( $stopped && 400 === $status && empty( $GLOBALS['dispatches'] ), 'Unmapped callback was not rejected.' );
			check( 0 === count( array_filter( $GLOBALS['events'], 'is_array' ) ), 'Capability check ran for an unmapped callback.' );
			break;
		case 'color-array':
			check( $stopped && 400 === $status && empty( $GLOBALS['writes'] ), 'Array color input was not rejected before writing.' );
			check( empty( $GLOBALS['color_sanitizations'] ), 'Array color reached the color sanitizer.' );
			break;
		case 'color-invalid':
			check( $stopped && 400 === $status && empty( $GLOBALS['writes'] ), 'Invalid color sanitizer result was stored.' );
			break;
		case 'color-valid':
			check( ! $stopped && 1 === count( $GLOBALS['writes'] ), 'Valid color did not reach the authorized write.' );
			check( '#aabbcc' === $GLOBALS['writes'][0][1]['color'], 'Written color differs from the accepted color.' );
			break;
		case 'url-array':
			check( $stopped && 400 === $status && empty( $GLOBALS['writes'] ), 'Array URL input was not rejected before writing.' );
			check( empty( $GLOBALS['url_sanitizations'] ), 'Array URL reached the URL sanitizer.' );
			break;
		case 'url-empty-result':
			check( $stopped && 400 === $status && empty( $GLOBALS['writes'] ), 'Empty URL sanitizer result was stored.' );
			break;
		case 'url-valid':
			check( ! $stopped && 1 === count( $GLOBALS['writes'] ), 'Valid URL did not reach the authorized write.' );
			check( 'https://example.test/path' === $GLOBALS['writes'][0][1], 'Written URL differs from the accepted sanitizer result.' );
			break;
		case 'webhook-empty-secret':
		case 'webhook-non-string-secret':
		case 'webhook-malformed-signature':
			check( $stopped && 401 === $status && 0 === $GLOBALS['body_reads'], 'Invalid secret/signature was not rejected before reading the body.' );
			break;
		case 'webhook-unreadable-body':
			check( $stopped && 401 === $status && 1 === $GLOBALS['body_reads'], 'Unreadable body was not rejected after one read.' );
			break;
		case 'webhook-altered-signature':
			check( $stopped && 401 === $status && 1 === $GLOBALS['body_reads'], 'Altered HMAC signature was not rejected.' );
			break;
		case 'webhook-valid':
			check( ! $stopped && 1 === $GLOBALS['body_reads'], 'Valid HMAC signature was not accepted after one body read.' );
			break;
	}

	check( empty( $GLOBALS['logged_messages'] ), 'Safe snippet logged secret material.' );
	echo 'PASS (stub simulation): ' . $case . "\n";
}

if ( isset( $argv[1] ) ) {
	run_case( $argv[1] );
	exit( 0 );
}

foreach ( array_keys( cases() ) as $case ) {
	$process = proc_open(
		array( PHP_BINARY, __FILE__, $case ),
		array( 0 => array( 'pipe', 'r' ), 1 => array( 'pipe', 'w' ), 2 => array( 'pipe', 'w' ) ),
		$pipes
	);
	if ( ! is_resource( $process ) ) {
		fail( 'Could not start isolated test process for ' . $case );
	}
	fclose( $pipes[0] );
	$output = stream_get_contents( $pipes[1] );
	$error  = stream_get_contents( $pipes[2] );
	fclose( $pipes[1] );
	fclose( $pipes[2] );
	$status = proc_close( $process );
	echo $output;
	if ( 0 !== $status ) {
		fail( trim( $error ) ?: 'Test failed: ' . $case );
	}
}

}
