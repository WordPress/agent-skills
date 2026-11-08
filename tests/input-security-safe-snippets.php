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

function check_ajax_referer( $action ) {
	$GLOBALS['events'][] = 'check_ajax_referer';
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

class Fake_Wpdb {
	public $posts    = 'wp_posts';
	public $prepared = array();
	public $queries  = array();

	public function prepare( $query, ...$args ) {
		$this->prepared[] = $args;
		return $query;
	}

	public function get_var( $query ) {
		$GLOBALS['events'][] = 'query';
		$this->queries[]     = $query;
		return 'Title';
	}
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
	$cases = array();

	foreach ( array( 'nonce-invalid', 'nonce-denied', 'nonce-valid' ) as $case ) {
		$cases[ $case ] = array( '01-nonce-input.md', '// Safe: verify the nonce and capability before the protected write.', 'nonce-valid.php', false );
	}
	foreach ( array( 'admin-helper-invalid', 'admin-helper-denied', 'admin-helper-valid' ) as $case ) {
		$cases[ $case ] = array( '01-nonce-input.md', "check_admin_referer( 'myplugin_save' );", 'admin-helper.php', false );
	}
	foreach ( array( 'ajax-helper-invalid', 'ajax-helper-denied', 'ajax-helper-valid' ) as $case ) {
		$cases[ $case ] = array( '01-nonce-input.md', "check_ajax_referer( 'myplugin_save' );", 'ajax-helper.php', false );
	}
	foreach ( array( 'settings-nonce-invalid', 'settings-capability-denied', 'settings-valid', 'color-array', 'color-invalid', 'color-empty', 'color-valid' ) as $case ) {
		$cases[ $case ] = array( '02-explicit-keys.md', '// Safe: browser/admin POST handler.', 'settings.php', false );
	}
	foreach ( array( 'url-nonce-invalid', 'url-capability-denied', 'url-array', 'url-empty-result', 'url-valid' ) as $case ) {
		$cases[ $case ] = array( '03-validate-sanitize-type.md', '// Safe: browser/admin POST handler.', 'url-valid.php', false );
	}
	foreach ( array( 'option-nonce-invalid', 'option-capability-denied', 'option-valid' ) as $case ) {
		$cases[ $case ] = array( '06-allowlist-sensitive-positions.md', '// Safe: the request can only pick from a fixed map.', 'option.php', false );
	}
	foreach ( array( 'callback-nonce-invalid', 'callback-denied', 'callback-valid', 'callback-unmapped' ) as $case ) {
		$cases[ $case ] = array( '06-allowlist-sensitive-positions.md', ' * Safe: the request can only pick a callback the plugin owns.', 'callback-valid.php', false );
	}
	foreach ( array( 'id-malformed-suffix', 'id-negative', 'id-exponent', 'id-array', 'id-overflow', 'id-zero', 'id-non-numeric', 'id-missing', 'id-capability-denied', 'id-valid' ) as $case ) {
		$cases[ $case ] = array( '04-cast-ids.md', "// Safe: reject an ID that converts to 0 before checking the user's capability.", 'id-cast.php', false );
	}
	foreach ( array( 'webhook-empty-secret', 'webhook-non-string-secret', 'webhook-malformed-signature', 'webhook-signature-array', 'webhook-altered-signature', 'webhook-unreadable-body', 'webhook-valid' ) as $case ) {
		$cases[ $case ] = array( '05-secrets.md', '// Safe: unslash only, check types and format, fail closed, compare in constant time, log nothing.', 'webhook-valid.php', true );
	}

	return $cases;
}

function run_case( $case ) {
	$cases = cases();
	check( isset( $cases[ $case ] ), 'Unknown test case: ' . $case );
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
	$wpdb                               = new Fake_Wpdb();
	$stopped                            = false;
	$status                             = 0;

	$input_root   = dirname( __DIR__ ) . '/skills/wp-plugin-development/references/security/input/';
	$fixture_info = $cases[ $case ];
	$test_fixture = __DIR__ . '/fixtures/' . $fixture_info[2];
	$document     = \file_get_contents( $input_root . $fixture_info[0] );
	$fixture      = \file_get_contents( $test_fixture );
	check( false !== $document && false !== $fixture, 'Could not read documentation or test fixture.' );

	$expected_prefix = $fixture_info[3]
		? "<?php\nnamespace InputSecuritySnippetTest;\n"
		: "<?php\n";
	check( 0 === strpos( $fixture, $expected_prefix ), 'Fixture namespace prefix changed.' );
	$fixture_code = substr( $fixture, strlen( $expected_prefix ) );
	$snippet      = documented_snippet( $document, $fixture_info[1] );
	check( trim( $fixture_code ) === trim( $snippet ), 'Fixture no longer matches the documented safe snippet.' );

	switch ( $case ) {
		case 'nonce-invalid':
		case 'admin-helper-invalid':
		case 'ajax-helper-invalid':
		case 'settings-nonce-invalid':
		case 'url-nonce-invalid':
		case 'option-nonce-invalid':
		case 'callback-nonce-invalid':
			$GLOBALS['nonce_valid'] = false;
			$_POST                  = array( 'color' => '#abc' );
			break;
		case 'nonce-denied':
		case 'admin-helper-denied':
		case 'ajax-helper-denied':
		case 'settings-capability-denied':
		case 'url-capability-denied':
		case 'option-capability-denied':
		case 'callback-denied':
			$GLOBALS['capability_allowed'] = false;
			$_POST                         = array(
				'color'   => '#abc',
				'link'    => 'https://example.test/path',
				'setting' => 'color',
				'value'   => '#abc',
				'task'    => 'export',
				'post_id' => '25',
			);
			break;
		case 'nonce-valid':
		case 'admin-helper-valid':
		case 'ajax-helper-valid':
			$_POST = array( 'color' => '#abc' );
			break;
		case 'settings-valid':
		case 'color-valid':
			$_POST = array( 'color' => '#aabbcc', 'columns' => '2', 'title' => 'Title' );
			break;
		case 'color-array':
			$_POST = array( 'color' => array( '#abc' ), 'columns' => '2', 'title' => 'Title' );
			break;
		case 'color-invalid':
			$_POST = array( 'color' => 'not-a-color', 'columns' => '2', 'title' => 'Title' );
			break;
		case 'color-empty':
			$_POST = array( 'color' => '', 'columns' => '2', 'title' => 'Title' );
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
		case 'url-capability-denied':
			$_POST = array( 'link' => 'https://example.test/path' );
			$GLOBALS['url_sanitizer_result'] = 'https://example.test/path';
			break;
		case 'option-valid':
			$_POST = array( 'setting' => 'color', 'value' => '#abc' );
			break;
		case 'callback-valid':
			$_POST = array( 'task' => 'export', 'post_id' => '25' );
			break;
		case 'callback-unmapped':
			$_POST = array( 'task' => 'wp_delete_post', 'post_id' => '25' );
			break;
		case 'id-malformed-suffix':
			$_POST = array( 'post_id' => '5abc' );
			break;
		case 'id-negative':
			$_POST = array( 'post_id' => '-5' );
			break;
		case 'id-exponent':
			$_POST = array( 'post_id' => '1e3' );
			break;
		case 'id-array':
			$_POST = array( 'post_id' => array( '5' ) );
			break;
		case 'id-overflow':
			$_POST = array( 'post_id' => '99999999999999999999' );
			break;
		case 'id-zero':
			$_POST = array( 'post_id' => '0' );
			break;
		case 'id-non-numeric':
			$_POST = array( 'post_id' => 'abc' );
			break;
		case 'id-missing':
			$_POST = array();
			break;
		case 'id-capability-denied':
			$GLOBALS['capability_allowed'] = false;
			$_POST                         = array( 'post_id' => '25' );
			break;
		case 'id-valid':
			$_POST = array( 'post_id' => '25' );
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
		case 'webhook-signature-array':
			$GLOBALS['stored_options']['myplugin_webhook_secret'] = 'test-secret';
			$_SERVER['HTTP_X_MYPLUGIN_SIGNATURE']                 = array( str_repeat( 'a', 64 ) );
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

	ob_start();
	try {
		require $test_fixture;
	} catch ( RequestStopped $exception ) {
		$stopped = true;
		$status  = $exception->getCode();
	}
	$snippet_output = ob_get_clean();

	switch ( $case ) {
		case 'nonce-invalid':
		case 'admin-helper-invalid':
		case 'ajax-helper-invalid':
			check( $stopped && 403 === $status && empty( $GLOBALS['writes'] ), 'Invalid nonce did not stop the write.' );
			check( 1 === count( $GLOBALS['events'] ) && is_string( $GLOBALS['events'][0] ), 'Capability/write ran after nonce failure.' );
			break;
		case 'nonce-denied':
		case 'admin-helper-denied':
		case 'ajax-helper-denied':
			check( $stopped && 403 === $status && empty( $GLOBALS['writes'] ), 'Denied capability did not stop the write.' );
			check( 2 === count( $GLOBALS['events'] ) && is_array( $GLOBALS['events'][1] ) && 'manage_options' === $GLOBALS['events'][1][1][0], 'Write was not gated by nonce and capability.' );
			break;
		case 'nonce-valid':
		case 'admin-helper-valid':
		case 'ajax-helper-valid':
			check( ! $stopped && 1 === count( $GLOBALS['writes'] ), 'Authorized nonce path did not write.' );
			check( 'write' === end( $GLOBALS['events'] ), 'Write occurred before required checks.' );
			break;
		case 'settings-nonce-invalid':
		case 'url-nonce-invalid':
		case 'option-nonce-invalid':
		case 'callback-nonce-invalid':
			check( $stopped && 403 === $status && empty( $GLOBALS['writes'] ) && empty( $GLOBALS['dispatches'] ), 'Invalid nonce did not stop protected work.' );
			check( array( 'check_admin_referer' ) === $GLOBALS['events'], 'Capability, write, or dispatch ran after nonce failure.' );
			break;
		case 'settings-capability-denied':
		case 'url-capability-denied':
		case 'option-capability-denied':
			check( $stopped && 403 === $status && empty( $GLOBALS['writes'] ), 'Denied option-write capability did not stop the write.' );
			check( 'write' !== end( $GLOBALS['events'] ), 'Option write ran after capability denial.' );
			break;
		case 'url-valid':
		case 'option-valid':
			check( ! $stopped && 1 === count( $GLOBALS['writes'] ), 'Authorized option-write path did not write.' );
			check( 'write' === end( $GLOBALS['events'] ), 'Option write occurred before required checks.' );
			if ( 'url-valid' === $case ) {
				check( 'https://example.test/path' === $GLOBALS['writes'][0][1], 'Written URL differs from the accepted sanitizer result.' );
			}
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
		case 'color-empty':
			check( $stopped && 400 === $status && empty( $GLOBALS['writes'] ), 'Empty required color was stored.' );
			break;
		case 'color-valid':
		case 'settings-valid':
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
		case 'id-zero':
		case 'id-non-numeric':
		case 'id-missing':
			check( $stopped && 400 === $status, 'An ID that converts to 0 was not rejected with 400.' );
			check( empty( $GLOBALS['events'] ) && empty( $wpdb->queries ), 'Capability check or query ran for an ID that converts to 0.' );
			break;
		case 'id-capability-denied':
			check( $stopped && 403 === $status && empty( $wpdb->queries ), 'Denied object capability did not stop the query.' );
			check( array( array( 'capability', array( 'read_post', 25 ) ) ) === $GLOBALS['events'], 'Capability check did not run once on the converted ID.' );
			break;
		case 'id-malformed-suffix':
		case 'id-negative':
		case 'id-exponent':
		case 'id-array':
		case 'id-overflow':
		case 'id-valid':
			$expected_ids = array(
				'id-malformed-suffix' => 5,
				'id-negative'         => 5,
				'id-exponent'         => 1000,
				'id-array'            => 1,
				'id-overflow'         => PHP_INT_MAX,
				'id-valid'            => 25,
			);
			$expected_id  = $expected_ids[ $case ];
			check( ! $stopped, 'Coerced, nonzero ID was rejected; absint() coerces and only 0 is rejected.' );
			check( array( array( 'capability', array( 'read_post', $expected_id ) ), 'query' ) === $GLOBALS['events'], 'Capability check did not run on the converted ID before the query.' );
			check( array( array( $expected_id ) ) === $wpdb->prepared && 1 === count( $wpdb->queries ), 'Query did not receive the converted ID through a prepared placeholder.' );
			break;
		case 'webhook-empty-secret':
		case 'webhook-non-string-secret':
		case 'webhook-malformed-signature':
		case 'webhook-signature-array':
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

	check( '' === $snippet_output, 'Safe snippet unexpectedly emitted output.' );
	check( empty( $GLOBALS['logged_messages'] ), 'Safe snippet logged secret material.' );
	echo 'PASS (stub simulation): ' . $case . "\n";
}

function run_cases( $case_names ) {
	foreach ( $case_names as $case ) {
		$stdout_file = tempnam( sys_get_temp_dir(), 'input-security-stdout-' );
		$stderr_file = tempnam( sys_get_temp_dir(), 'input-security-stderr-' );
		if ( false === $stdout_file || false === $stderr_file ) {
			if ( false !== $stdout_file ) {
				unlink( $stdout_file );
			}
			if ( false !== $stderr_file ) {
				unlink( $stderr_file );
			}
			fail( 'Case ' . $case . ' could not create child output capture files.' );
		}

		$process = proc_open(
			array( PHP_BINARY, __FILE__, '--child', $case ),
			array(
				0 => array( 'pipe', 'r' ),
				1 => array( 'file', $stdout_file, 'w' ),
				2 => array( 'file', $stderr_file, 'w' ),
			),
			$pipes
		);
		if ( ! is_resource( $process ) ) {
			unlink( $stdout_file );
			unlink( $stderr_file );
			fail( 'Could not start isolated test process for ' . $case );
		}
		fclose( $pipes[0] );
		$status = proc_close( $process );
		$output = file_get_contents( $stdout_file );
		$error  = file_get_contents( $stderr_file );
		unlink( $stdout_file );
		unlink( $stderr_file );

		$expected_output = 'PASS (stub simulation): ' . $case . "\n";
		if ( 0 !== $status || $expected_output !== $output || '' !== $error ) {
			$failure = array( 'Case ' . $case . ' failed' );
			if ( 0 !== $status ) {
				$failure[] = 'child exit status ' . $status;
			}
			if ( $expected_output !== $output ) {
				$failure[] = 'unexpected stdout';
			}
			if ( '' !== $error ) {
				$failure[] = 'stderr was nonempty';
			}
			fail( implode( '; ', $failure ) . ' (captured streams omitted).' );
		}
		echo $expected_output;
	}
}

if ( isset( $argv[1] ) && '--child' === $argv[1] ) {
	if ( 3 !== count( $argv ) ) {
		fail( '--child requires exactly one case name.' );
	}
	$case = $argv[2];
	if ( ! isset( cases()[ $case ] ) ) {
		fail( 'Unknown test case: ' . $case );
	}
	run_case( $case );
	exit( 0 );
}

if ( 1 === count( $argv ) ) {
	run_cases( array_keys( cases() ) );
	exit( 0 );
}

if ( '--case' === $argv[1] ) {
	if ( 2 === count( $argv ) ) {
		fail( '--case requires exactly one case name.' );
	}
	if ( 3 !== count( $argv ) ) {
		fail( '--case accepts exactly one case name.' );
	}
	$case = $argv[2];
	if ( ! isset( cases()[ $case ] ) ) {
		fail( 'Unknown test case: ' . $case );
	}
	run_cases( array( $case ) );
	exit( 0 );
}

if ( 2 !== count( $argv ) ) {
	fail( 'Expected no arguments, one case name, or --case <name>.' );
}

if ( 0 === strpos( $argv[1], '-' ) ) {
	fail( 'Unknown option: ' . $argv[1] );
}

if ( ! isset( cases()[ $argv[1] ] ) ) {
	fail( 'Unknown test case: ' . $argv[1] );
}

run_cases( array( $argv[1] ) );

}
