# Input: Validate and Sanitize for the Type

**Prohibited**

None.

**Required**

- Validate and sanitize input before storing it, displaying it, or passing it to a function whose behavior you don't control (hooks, third-party APIs).
- Choose the sanitizer for the data type, then validate the result. Sanitizing makes a value well-formed. Validation decides whether it is acceptable (right format, range, or length), and rejects it if not.

| Data type | Sanitize | Validate / note |
| --- | --- | --- |
| Numeric ID or count | `absint()` | Reject `0`; check range. IDs: see `04-cast-ids.md`. |
| Single-line text | `sanitize_text_field()` | Check length if it matters. |
| Multi-line text | `sanitize_textarea_field()` | Keeps line breaks. |
| Email | `sanitize_email()` | Validate the sanitized result with `is_email()`; `sanitize_email()` may return `''` for invalid input. |
| URL | `esc_url_raw( $url, array( 'http', 'https' ) )` | Returns `''` when the scheme is not allowed; reject `''`. |
| Key or internal slug | `sanitize_key()` | Lowercase letters, digits, `-` and `_` only. |
| Post slug | `sanitize_title()` | |
| File name | `sanitize_file_name()` | Not a path check; see `06-allowlist-sensitive-positions.md`. |
| Hex color | `sanitize_hex_color()` | Returns `''` for empty input and `null` for invalid input; reject either when a color is required. Available since WordPress 3.4.0. |
| HTML allowed | `wp_kses_post()`, or `wp_kses()` with an allowed-tags array | |
| Boolean | `rest_sanitize_boolean()` or `filter_var( $v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE )` | `rest_sanitize_boolean()` coerces any non-empty unknown string to `true`; it is not validation. For strict validation, check the input type and reject a `null` result. Avoid a bare `(bool)` cast: `(bool) 'false'` is `true`. `rest_sanitize_boolean()` is available since WordPress 4.7.0. |
| Array of strings | `array_map( 'sanitize_text_field', $values )` | Check `is_array()` and that every element is a string before mapping. For nested arrays, validate the expected shape before using `map_deep()` (available since WordPress 4.4.0). |
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
