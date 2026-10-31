# Input: Sanitization Is Not Authorization or Allowlisting

**Prohibited**

- Never treat sanitization as authorization.

**Required**

- Understand that `sanitize_key()` or `sanitize_text_field()` makes a value well-formed; it does not make it safe to *choose* which option, table, file, callback, or capability the code acts on. For those, use an allowlist.
- Treat input as unsafe in sensitive positions even after sanitization. A fixed allowlist, strict comparison (`in_array( $v, $allowed, true )`), or hardcoded map must decide:
  - option, meta, transient, table, column, or capability names;
  - file paths;
  - hooks, routes, callbacks, classes, methods, or any dynamic call (`call_user_func()`, `$obj->$method()`, `new $class`, `do_action( $name )`);
  - a privileged target, scope, or execution path (which user, which site, which mode).

**Exceptions:** None.

## Code

Shows: a sanitized request value must not choose an option name or a callback; a fixed map decides.

```php
/*
 * Unsafe: sanitize_key() keeps the name well-formed, but the request still
 * chooses which option is overwritten. An attacker can set users_can_register
 * to 1 (open public sign-up) and default_role to administrator (every new
 * account is an admin), which turns one unchecked write into a full takeover.
 */
$name = sanitize_key( wp_unslash( $_POST['option'] ?? '' ) );
update_option( $name, sanitize_text_field( wp_unslash( $_POST['value'] ?? '' ) ) );

// Safe: the request can only pick from a fixed map.
$options = array(
	'color'  => 'myplugin_color',
	'layout' => 'myplugin_layout',
);
$key = sanitize_key( wp_unslash( $_POST['setting'] ?? '' ) );
if ( ! isset( $options[ $key ] ) ) {
	wp_send_json_error( null, 400 );
}
update_option( $options[ $key ], sanitize_text_field( wp_unslash( $_POST['value'] ?? '' ) ) );
```

```php
/*
 * Unsafe: sanitize_key() accepts any function name, so the request decides
 * what runs. task=wp_delete_post deletes the post instead of exporting it.
 */
$task    = sanitize_key( wp_unslash( $_POST['task'] ?? '' ) );
$post_id = absint( wp_unslash( $_POST['post_id'] ?? 0 ) );
call_user_func( $task, $post_id );

/*
 * Safe: the request can only pick a callback the plugin owns. The same map
 * pattern applies to class names before new $class and to hook names.
 */
$tasks   = array(
	'export'  => 'myplugin_export_post',
	'preview' => 'myplugin_preview_post',
);
$task    = sanitize_key( wp_unslash( $_POST['task'] ?? '' ) );
$post_id = absint( wp_unslash( $_POST['post_id'] ?? 0 ) );
if ( ! isset( $tasks[ $task ] ) ) {
	wp_send_json_error( null, 400 );
}
call_user_func( $tasks[ $task ], $post_id );
```

## Attack methodology

Arbitrary option update

Security bulletins:
- CWE-915, Improperly Controlled Modification of Dynamically-Determined Object Attributes
- OWASP A08:2021, Software and Data Integrity Failures (CWE-915's mapped category)
- CWE-862, Missing Authorization
- OWASP A01:2021, Broken Access Control

- **Attacker-chosen option name → privilege escalation → site takeover.** The attacker finds a handler that passes a request value to `update_option()`, then sends two requests: 1. `option=users_can_register&value=1` opens public registration. 2. `option=default_role&value=administrator` makes every new account an administrator. They register an account and log in as an administrator, then install a plugin or edit plugin files to run code. Sanitization doesn't help, because `sanitize_key()` accepts `default_role` as a well-formed name. If the handler is also missing a capability check, a logged-out visitor can run the whole chain. Fix: authorize the request *and* map the request value to a fixed list of option names.
- **Attacker-chosen option name → persistent redirect or injected content.** Even without escalation, the attacker can overwrite `siteurl` or `home` to take the site offline, or overwrite an option the theme prints, which gives them stored XSS. Fix: the same fixed map, plus escaping at output.

Unsafe reflection

Security bulletins:
- CWE-470, Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')
- OWASP A03:2021, Injection

- **Request-chosen callback → arbitrary function call.** The attacker sends `task=wp_delete_post` with any post ID, and the handler calls a core function the plugin never meant to expose. Fix: a hardcoded map from request values to callbacks the plugin owns, plus a capability check.
