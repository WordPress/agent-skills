# Security guardrails (plugin work)

Use this file when making security fixes or when handling any input/output.

## Nonces + permissions

- Nonces help prevent CSRF, not authorization.
- Always pair nonces with capability checks (`current_user_can()` or a more specific capability).

Upstream reference:

- https://developer.wordpress.org/apis/security/nonces/

## Sanitization and escaping

Golden rule:

- sanitize/validate on input, escape on output.

Practical rules:

- never process the entire `$_POST` / `$_GET` array; read explicit keys
- use `wp_unslash()` before sanitizing when needed
- use prepared statements for SQL; avoid interpolating user input into queries

## Output escaping contexts

Escape at output, using the function that matches the context:

* HTML text: `esc_html()`
* HTML attribute: `esc_attr()`
* URL: `esc_url()`
* textarea: `esc_textarea()`
* JavaScript strings: `esc_js()`

For JSON data, prefer `wp_json_encode()` and pass data through WordPress script APIs such as `wp_add_inline_script()` or `wp_localize_script()`.

For user-provided HTML, restrict allowed markup with `wp_kses_post()` or `wp_kses()` before output.

## AJAX handlers

* For `wp_ajax_*`, verify nonce and check capabilities.
* For `wp_ajax_nopriv_*`, assume unauthenticated attacker-controlled traffic.
* Return JSON with `wp_send_json_success()` or `wp_send_json_error()`.
* Do not expose private data from AJAX responses.

Common review guidance:

- https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/