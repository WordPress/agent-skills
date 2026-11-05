# Input: Validate and Sanitize for the Type

**Prohibited**

- Never store, display, or pass along a request value that has not been sanitized for its data type.
- Don't reuse one generic sanitizer (such as `sanitize_text_field()`) for every field; a value sanitized as the wrong type is not safe.
- Sanitizing is not validating: don't treat a sanitized value as acceptable without checking its format, range, or length.

**Required**

- Validate and sanitize input before storing it, displaying it, or passing it to a function whose behavior you don't control (hooks, third-party APIs).
- Choose the sanitizer for the data type, then validate the result. Sanitizing makes a value well-formed. Validation decides whether it is acceptable (right format, range, or length), and rejects it if not.

| Data type | Sanitize | Validate / note |
| --- | --- | --- |
| Numeric ID or count | `absint()` | Reject `0`; check range. IDs: see `04-cast-ids.md`. |
| Single-line text | `sanitize_text_field()` | Returns `''` when nothing is left after stripping tags and whitespace; reject `''` for a required field, and check length. |
| Multi-line text | `sanitize_textarea_field()` | Keeps line breaks; returns `''` when nothing is left; reject `''` for a required field. |
| Email | `sanitize_email()` | Validate the sanitized result with `is_email()`; `sanitize_email()` may return `''` for invalid; reject on `false` input. |
| URL | `esc_url_raw( $url, array( 'http', 'https' ) )` | Sanitizes a URL for storage; reject `''`. A nonempty result is not proof of an absolute URL or permitted host, and is not an SSRF defense. Redirect and network-request uses need context-appropriate validation based on the application's requirements. |
| Key or internal slug | `sanitize_key()` | Lowercase letters, digits, `-` and `_` only. Returns `''` when nothing valid remains or the input is not a scalar; reject `''`. It lowercases and strips rather than rejects, so for an exact match also reject when the result differs from the lowercased raw value, or use an allowlist when the keys come from a known set (`06-allowlist-sensitive-positions.md`). |
| Post slug | `sanitize_title()` | Returns `''` when nothing remains after sanitizing; reject `''` or pass a `$fallback_title`. |
| File name | `sanitize_file_name()` | Not a path check; see `06-allowlist-sensitive-positions.md`. Returns `''` when nothing valid remains; reject `''`. It strips rather than rejects (`../etc/passwd` becomes `etcpasswd`), so for an exact match also reject when the result differs from the raw value. It does not check file type; uploads still need `wp_check_filetype_and_ext()`. |
| Hex color | `sanitize_hex_color()` | Returns `''` for empty input and `null` for invalid input; reject `null`, and reject `''` when a color is required. Available since WordPress 3.4.0. |
| HTML allowed | `wp_kses_post()`, or `wp_kses()` with an allowed-tags array | `wp_kses_post()` allows broad post-content tags; use `wp_kses()` with a minimal allowlist for narrow fields. Returns `''` when nothing is left after stripping; reject `''` for a required field. It strips tags but keeps their text (`<script>alert(1)</script>` becomes `alert(1)`), so a removed tag is not detectable and the raw-value comparison does not apply. |
| Boolean | `rest_sanitize_boolean()` or `filter_var( $v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE )` | Coerces, never rejects, so it is not validation: `rest_sanitize_boolean()` turns the strings `'false'` and `'0'` (any case) into `false` and casts everything else with `(bool)`, so any other non-empty string such as `'maybe'` is `true`. To fail closed on an unrecognized value, check the input type, validate with `filter_var()` and `FILTER_NULL_ON_FAILURE`, and reject `null`. Avoid a bare `(bool)` cast: `(bool) 'false'` is `true`. `rest_sanitize_boolean()` is available since WordPress 4.7.0. |
| Array of strings | `array_map( 'sanitize_text_field', $values )` | Check `is_array()` first and reject a non-array; reject an empty array for a required field. Check that every element is a string before mapping and reject the input if not: `sanitize_text_field()` returns `''` for an array or object element and casts other scalars to strings, with no error. For nested arrays, validate the expected shape before using `map_deep()`, which sanitizes the leaves of any shape and rejects nothing (available since WordPress 4.4.0). |
| One of fixed choices | Not a sanitizer job | Allowlist; see `06-allowlist-sensitive-positions.md`. Reject any value not in the allowlist: a strict `in_array( $value, $allowed, true )` check, or a hardcoded map lookup such as `isset( $map[ $value ] )`. |

**Exceptions:** None.

## Code

Shows: in a browser/admin POST handler, verify the request nonce and capability before writing; reject non-string URL input, sanitize a string for storage, and reject an empty result. This does not decide which URL forms or hosts the application should accept.

```php
/*
 * Unsafe: sanitize_text_field() returns clean text, but it does not check that
 * the value is a URL. "javascript:alert(document.cookie)" is stored intact.
 */
$link = sanitize_text_field( wp_unslash( $_POST['link'] ?? '' ) );
update_option( 'myplugin_link', $link );

// Safe: browser/admin POST handler.
check_admin_referer( 'myplugin_save_link' );
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
}

// Reject a non-string value before URL sanitation.
$raw_link = wp_unslash( $_POST['link'] ?? '' );
if ( ! is_string( $raw_link ) ) {
	wp_send_json_error( array( 'message' => __( 'Enter a valid URL.', 'myplugin' ) ), 400 );
}
$link = esc_url_raw( $raw_link, array( 'http', 'https' ) );
if ( '' === $link ) {
	wp_send_json_error( array( 'message' => __( 'Enter a valid URL.', 'myplugin' ) ), 400 );
}
update_option( 'myplugin_link', $link );
```

`esc_url_raw()` is a storage sanitizer, not a complete URL policy. Decide which URL forms and hosts fit the application separately for stored links, redirects, or network requests; a nonempty sanitized value alone does not establish an allowed absolute host or prevent SSRF.

## Attack methodology

Improper input validation

Security bulletins:
- CWE-20, Improper Input Validation
- CWE-79, Improper Neutralization of Input During Web Page Generation (Cross-site Scripting)
- OWASP A03:2021, Injection

- **Wrong sanitizer for the type → `javascript:` URL stored → XSS.** The plugin sanitizes a link as text, then prints it in an `href` with `esc_attr()`. The attacker saves `javascript:` code, and it runs when an administrator clicks the link. Fix: `esc_url_raw()` with allowed schemes on input, and `esc_url()` on output.
