# Input: Validate and Sanitize for the Type

**Prohibited**

- Never store, display, or pass along a request value that has not been sanitized for its data type.
- Don't reuse one generic sanitizer (such as `sanitize_text_field()`) for every field; a value sanitized as the wrong type is not safe.
- Sanitizing is not validating: don't treat a sanitized value as acceptable without checking its format, range, or length.

**Required**

- Validate and sanitize input before storing it, displaying it, or passing it to a function whose behavior you don't control (hooks, third-party APIs).
- Choose the sanitizer for the data type, then validate the result. Sanitizing makes a value well-formed. Validation decides whether it is acceptable; reject the request if it is not.

| Data type | Sanitize | Validate / note |
| --- | --- | --- |
| Numeric ID or count | `absint()` | Reject `0`; check range. IDs: see `04-cast-ids.md`. |
| Single-line text | `sanitize_text_field()` | Returns `''` when nothing is left after stripping tags and whitespace; reject `''` for a required field, and check length. |
| Multi-line text | `sanitize_textarea_field()` | Keeps line breaks; returns `''` when nothing is left; reject `''` for a required field. |
| Email | `sanitize_email()` | `is_email()` returns `false` when invalid; reject on `false`. |
| URL | `esc_url_raw( $url, array( 'http', 'https' ) )` | Returns `''` when the scheme is not allowed; reject `''`. |
| Key or internal slug | `sanitize_key()` | Lowercase letters, digits, `-` and `_` only. |
| Post slug | `sanitize_title()` | Returns `''` when nothing remains after sanitizing; reject `''` or pass a `$fallback_title`. |
| File name | `sanitize_file_name()` | Not a path check; see `06-allowlist-sensitive-positions.md`. |
| Hex color | `sanitize_hex_color()` | Returns `null` when invalid; reject `null`. |
| HTML allowed | `wp_kses_post()`, or `wp_kses()` with an allowed-tags array | `wp_kses_post()` allows broad post-content tags; use `wp_kses()` with a minimal allowlist for narrow fields. |
| Boolean | `rest_sanitize_boolean()` or `filter_var( $v, FILTER_VALIDATE_BOOLEAN )` | Coerces, never rejects: `rest_sanitize_boolean()` maps anything but `'false'`/`'0'` to `true`. To fail closed on an unrecognized value, validate with `filter_var( $v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE )` and reject `null`. Avoid a bare `(bool)` cast: `(bool) 'false'` is `true`. |
| Array of strings | `array_map( 'sanitize_text_field', $values )` | Check `is_array()` first; use `map_deep()` for nested arrays. |
| One of fixed choices | Not a sanitizer job | Allowlist; see `06-allowlist-sensitive-positions.md`. |

**Exceptions:** None.

## Code

Shows: sanitize a URL for its type and validate the result before storing it.

```php
/*
 * Unsafe: sanitize_text_field() returns clean text, but it does not check that
 * the value is a URL. "javascript:alert(document.cookie)" is stored intact.
 */
$link = sanitize_text_field( wp_unslash( $_POST['link'] ?? '' ) );
update_option( 'myplugin_link', $link );

// Safe: sanitize as a URL with allowed schemes, then reject an empty result.
$link = esc_url_raw( wp_unslash( $_POST['link'] ?? '' ), array( 'http', 'https' ) );
if ( '' === $link ) {
	wp_send_json_error( array( 'message' => __( 'Enter a valid URL.', 'myplugin' ) ), 400 );
}
update_option( 'myplugin_link', $link );
```

## Attack methodology

Improper input validation

Security bulletins:
- CWE-20, Improper Input Validation
- CWE-79, Improper Neutralization of Input During Web Page Generation (Cross-site Scripting)
- OWASP A03:2021, Injection

- **Wrong sanitizer for the type → `javascript:` URL stored → XSS.** The plugin sanitizes a link as text, then prints it in an `href` with `esc_attr()`. The attacker saves `javascript:` code, and it runs when an administrator clicks the link. Fix: `esc_url_raw()` with allowed schemes on input, and `esc_url()` on output.
