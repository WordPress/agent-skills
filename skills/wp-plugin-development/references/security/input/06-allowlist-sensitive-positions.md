# Input: Sanitization Is Not Authorization or Allowlisting

**Prohibited**

- Never treat sanitization as authorization.

**Required**

- For applicable browser-originated state-changing requests authenticated by cookies, verify the request nonce before a protected write or callback dispatch. A WordPress nonce is a CSRF control, not authentication, and does not replace the allowlist or capability check. Internal hooks, WP-CLI/cron, HMAC-authenticated webhooks, and REST requests using non-cookie authentication need transport-appropriate authentication and authorization rather than a universal nonce requirement.
- A callback allowlist controls which code can be selected; it does not authorize the request. Check `current_user_can()` for the action and target before dispatching it.
- Understand that `sanitize_key()` or `sanitize_text_field()` makes a value well-formed; it does not make it safe to *choose* which option, table, file, callback, or capability the code acts on. For those, use an allowlist.
- Treat input as unsafe in sensitive positions even after sanitization. A fixed allowlist, strict comparison (`in_array( $v, $allowed, true )`), or hardcoded map must decide:
  - option, meta, transient, table, column, or capability names;
  - file paths;
  - hooks, routes, callbacks, classes, methods, or any dynamic call (`call_user_func()`, `$obj->$method()`, `new $class`, `do_action( $name )`);
  - a privileged target, scope, or execution path (which user, which site, which mode).

**Exceptions:** None.

## Code

Shows: verify the nonce, use fixed maps for request-selected targets, and check capability before protected writes or callback dispatch.

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
check_admin_referer( 'myplugin_update_setting' );
$options = array(
	'color'  => 'myplugin_color',
	'layout' => 'myplugin_layout',
);
$key = sanitize_key( wp_unslash( $_POST['setting'] ?? '' ) );
if ( ! isset( $options[ $key ] ) ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
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
check_admin_referer( 'myplugin_run_task' );
$tasks   = array(
	'export'  => array(
		'callback'   => 'myplugin_export_post',
		'capability' => 'edit_post',
	),
	'preview' => array(
		'callback'   => 'myplugin_preview_post',
		'capability' => 'read_post',
	),
);
$task    = sanitize_key( wp_unslash( $_POST['task'] ?? '' ) );
$post_id = absint( wp_unslash( $_POST['post_id'] ?? 0 ) );
if ( ! isset( $tasks[ $task ] ) ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( $tasks[ $task ]['capability'], $post_id ) ) {
	wp_send_json_error( null, 403 );
}
call_user_func( $tasks[ $task ]['callback'], $post_id );

function myplugin_export_post( $post_id ) {
	return get_post( $post_id );
}

function myplugin_preview_post( $post_id ) {
	return get_post( $post_id );
}
```

The same map pattern applies to a class name before `new $class`:

```php
/*
 * Unsafe: sanitize_key() keeps the name well-formed, but the request still
 * chooses which class is created. format=wp_user_query creates a core class
 * the plugin never meant to expose.
 */
$format   = sanitize_key( wp_unslash( $_POST['format'] ?? '' ) );
$exporter = new $format();

// Safe: the request can only pick a class the plugin owns.
check_admin_referer( 'myplugin_run_export' );
$exporters = array(
	'csv'  => 'Myplugin_Csv_Exporter',
	'json' => 'Myplugin_Json_Exporter',
);
$format    = sanitize_key( wp_unslash( $_POST['format'] ?? '' ) );
if ( ! isset( $exporters[ $format ] ) ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
}
$class_name = $exporters[ $format ];
$exporter   = new $class_name();
$exporter->export();

class Myplugin_Csv_Exporter {
	public function export() {
		return 'csv';
	}
}

class Myplugin_Json_Exporter {
	public function export() {
		return 'json';
	}
}
```

## Attack methodology

Arbitrary option update

Security bulletins:
- [CWE-15](https://cwe.mitre.org/data/definitions/15.html), External Control of System or Configuration Setting
- [OWASP A05:2021](https://github.com/OWASP/Top10/blob/3a31f35346c3f4e90f350395124382fa53af2afe/2021/docs/en/A05_2021-Security_Misconfiguration.md), Security Misconfiguration (lists CWE-15)
- CWE-862, Missing Authorization
- OWASP A01:2021, Broken Access Control

This example lets one request value select a system configuration option, so CWE-15 fits; it is not the multi-field mass-assignment case described by [CWE-915](https://cwe.mitre.org/data/definitions/915.html) in directive 02. The missing authorization classification is separate.

- **Attacker-chosen option name → privilege escalation → site takeover.** The attacker finds a handler that passes a request value to `update_option()`, then sends two requests: 1. `option=users_can_register&value=1` opens public registration. 2. `option=default_role&value=administrator` makes every new account an administrator. They register an account and log in as an administrator, then install a plugin or edit plugin files to run code. Sanitization doesn't help, because `sanitize_key()` accepts `default_role` as a well-formed name. If the handler is also missing a capability check, a logged-out visitor can run the whole chain. Fix: authorize the request *and* map the request value to a fixed list of option names.
- **Attacker-chosen option name → persistent redirect or injected content.** Even without escalation, the attacker can overwrite `siteurl` or `home` to take the site offline, or overwrite an option the theme prints, which gives them stored XSS. Fix: the same fixed map, plus escaping at output.

Unsafe reflection

Security bulletins:
- CWE-470, Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')
- OWASP A03:2021, Injection
- CWE-862, Missing Authorization
- OWASP A01:2021, Broken Access Control

- **Request-chosen callback → arbitrary function call.** The attacker sends `task=wp_delete_post` with any post ID, and the handler calls a core function the plugin never meant to expose. Fix: a hardcoded map from request values to callbacks the plugin owns, plus a capability check.
- **Request-chosen class → unintended object creation.** The attacker sends `format=wp_user_query`, and `new $format()` creates a core class the plugin never meant to expose. A class whose constructor has side effects runs that code. Fix: a hardcoded map from request values to classes the plugin owns, and a capability check before `new`.
- **Valid allowlist key, no capability check → unauthorized use of a plugin callback.** The map blocks `wp_delete_post`, but a logged-in low-privilege user (for example a subscriber) can still send a key the map does accept, such as `task=export`, and run a callback they should not be allowed to run. The allowlist controls which code can be selected; it does not authorize the request. Fix: give each map entry its own required capability and call `current_user_can()` with the target before dispatching.
