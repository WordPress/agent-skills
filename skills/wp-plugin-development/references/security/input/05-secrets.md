# Input: Secrets Are Not Sanitized

**Prohibited**

- Running passwords, signatures, tokens, API keys, or other secrets through `sanitize_text_field()` or any sanitizer that can change them.
- Echoing or logging a secret, including in error messages, debug output, and `error_log()`.

**Required**

- Do not run passwords, signatures, tokens, or secrets through sanitizers that change them (`sanitize_text_field()` strips characters).
- Unslash them and use them only for their purpose (hash, compare with `hash_equals()`, or send in a header).
- To check a secret, validate without changing it (`is_string()`, a length check, or `ctype_xdigit()` for a hex signature) and reject on failure. Fail closed when the stored secret is empty or not a string.

**Exceptions:** None.

## Code

Shows: sanitizing an opaque token can change it; unslash and validate a webhook signature without logging secrets.

```php
/*
 * Unsafe: sanitize_text_field() changes an opaque token such as
 * `api_<scope>_key` to `api__key`; !== does not compare in constant time, and
 * the token is written to the log.
 */
$token        = sanitize_text_field( wp_unslash( $_POST['api_token'] ?? '' ) );
$stored_token = get_option( 'myplugin_api_token', '' );
error_log( 'API token: ' . $token );
if ( $stored_token !== $token ) {
	wp_send_json_error( null, 401 );
}

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
```

## Attack methodology

Sensitive information disclosure through logs

Security bulletins:
- CWE-532, Insertion of Sensitive Information into Log File
- OWASP A09:2021, Security Logging and Monitoring Failures

- **Logged secret → readable log → forged requests.** The handler writes the webhook secret to `wp-content/debug.log`, which is often reachable from the web. The attacker downloads the log, signs their own payloads with the secret, and the plugin accepts them (for example marking an order as paid). Fix: never log or echo secrets, and compare with `hash_equals()`.
- **Logged API token → replayed credential → unauthorized API access.** The handler logs the submitted API token. If an external API accepts that token for authentication, anyone who obtains the log can replay it and act with the token's privileges. Fix: never log or echo a token; compare it only for its intended purpose.
