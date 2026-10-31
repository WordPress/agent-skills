# Input: Nonce Handling

**Prohibited**

- None specific to this directive.

**Required**

- Sanitize a nonce before passing it to `wp_verify_nonce()`: `sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ?? '' ) )`. `check_admin_referer()` and `check_ajax_referer()` read the request themselves.

**Exceptions:** None.

## Code

Shows: unslash and sanitize the nonce before `wp_verify_nonce()` and stop the request when it fails, or let `check_admin_referer()` / `check_ajax_referer()` read and verify it.

```php
/*
 * Unsafe: the raw superglobal goes straight into wp_verify_nonce(). A missing
 * key raises an undefined-index warning, a non-string value (an array sent as
 * _wpnonce[]) is passed through unchecked, and PHPCS flags the unsanitized
 * read. The result is also never checked, so the handler runs even when the
 * nonce is invalid.
 */
wp_verify_nonce( $_POST['_wpnonce'], 'myplugin_save' );
update_option( 'myplugin_color', sanitize_text_field( wp_unslash( $_POST['color'] ?? '' ) ) );

// Safe: unslash and sanitize the nonce, then stop the request if it fails.
$nonce = sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ?? '' ) );
if ( ! wp_verify_nonce( $nonce, 'myplugin_save' ) ) {
	wp_die( esc_html__( 'Invalid request.', 'myplugin' ), '', array( 'response' => 403 ) );
}
update_option( 'myplugin_color', sanitize_text_field( wp_unslash( $_POST['color'] ?? '' ) ) );

// Also safe, and simpler: these functions read and verify the request nonce
// themselves, and stop the request on failure, so there is nothing to sanitize.
check_admin_referer( 'myplugin_save' );      // Admin forms and admin-post.php.
check_ajax_referer( 'myplugin_save' );       // admin-ajax.php handlers.
```

## Attack methodology

These write-ups belong to the authorization surface and stay here until that surface is split into its own files.

Cross-Site Request Forgery (CSRF) caused by missing nonce verification

Security bulletins:
- CWE-352, Cross-Site Request Forgery
- CWE-79, Cross-Site Scripting
- OWASP A01:2021, Broken Access Control (Top 10)

- **Ignored nonce result → CSRF → stored XSS → admin takeover.** The handler calls `wp_verify_nonce()` but never checks the return value, so the check is effectively absent. 1. The attacker builds a page with a hidden form that posts to the plugin's `admin-post.php` action, with a script payload as the `color` value. 2. They get a logged-in administrator to open the page (a link in an email or support ticket). 3. The browser sends the administrator's cookies, the handler saves the payload, and the plugin later prints it unescaped. 4. The script now runs in the administrator's session, reads any nonce on the page, and creates a new administrator or installs a plugin. The nonce was meant to stop step 2 and didn't. Fix: stop the request when verification fails (`check_admin_referer()` does this automatically), *and* escape the output.

Missing authorization (broken access control) - nonce is not sufficient to enforce capability checks (authorized.)

Security bulletins:
- CWE-862, Missing Authorization
- CWE-285, Improper Authorization
- OWASP A01:2021, Broken Access Control

- **Valid nonce, no capability check → low-privilege write.** A nonce proves a request came from a form the site issued, not that the user may use it. If a subscriber's page contains the nonce, they can replay it against a privileged action. Fix: pair the nonce with `current_user_can()`.
