# Security guardrails (plugin work)

Use this file when making security fixes or when a change handles input, output, SQL, REST/AJAX requests, files, external services, or plugin lifecycle state.

Each section separates three kinds of rule:

- **Prohibited**: do not implement, whatever the justification.
- **Required**: safeguards every implementation must have.
- **Exceptions**: narrow cases that are allowed only with an explicit functional justification, documented in code (and in the readme when users are affected).

The most common mistake is treating sanitization as authorization. `sanitize_key()` or `sanitize_text_field()` makes a value well-formed; it does not make it safe to *choose* which option, table, file, callback, or capability the code acts on. For those, use an allowlist.

## Checklist

Work through the sections that apply to the change:

- [ ] Every privileged action, sensitive read, or persistent write checks authorization *and* CSRF protection.
- [ ] Every REST route and ability has a `permission_callback` that resolves and enforces the right capability.
- [ ] Security checks fail closed: their return values are checked, and the request stops when they fail.
- [ ] Input is read by explicit key, unslashed, validated, and sanitized for its type.
- [ ] Request values that select names, paths, callbacks, capabilities, or targets go through a fixed allowlist or map.
- [ ] Output is escaped late, including shortcode, dynamic block, and filter callback output.
- [ ] SQL uses `$wpdb->prepare()` for values and allowlisted identifiers.
- [ ] No code execution, executable uploads, or writes outside the plugin's uploads subdirectory.
- [ ] No `unserialize()` / `maybe_unserialize()` of untrusted data; magic methods have no dangerous side effects.
- [ ] Each weakness was assessed for what it unlocks when chained with others, not in isolation.
- [ ] External services are documented in the readme; credentials come from platform APIs.
- [ ] No global sessions, global PHP config changes, or silent plugin/theme/update changes.

## Request authorization and REST endpoints

Nonces help prevent CSRF; they are not authorization. Capability checks are authorization; they do not stop CSRF. Privileged actions, sensitive-data disclosure, and persistent writes need both.

**Required**

- Pair nonces (`check_admin_referer()`, `check_ajax_referer()`, `wp_verify_nonce()`) with `current_user_can()`.
- Check object-level capabilities when the request names a target: `current_user_can( 'edit_post', $post_id )`, `current_user_can( 'edit_user', $user_id )`, not only a generic capability.
- Give every `register_rest_route()` and `wp_register_ability()` call a `permission_callback` that checks the capability the operation needs. For REST requests authenticated by cookie, core verifies the `wp_rest` nonce (`X-WP-Nonce`); the `permission_callback` supplies the authorization.
- Make sure a referenced callback resolves (function exists, method is public and on the right class) and returns `true` only when the permission holds. A callback that always returns `true`, or only checks `is_user_logged_in()` for a privileged operation, is not a permission check.
- For `wp_ajax_nopriv_*` handlers, assume unauthenticated attacker-controlled traffic. Return JSON with `wp_send_json_success()` / `wp_send_json_error()` and never expose private data.
- Don't use `is_admin()` as an authorization check. It reports whether the request targets an admin screen, and it is `true` for `admin-ajax.php` and `admin-post.php` requests, including unauthenticated ones.
- Fail closed. `wp_verify_nonce()` and `check_ajax_referer( $action, $arg, false )` return `false` instead of stopping the request; check the result and stop on failure. Treat a `WP_Error` from any check as a denial.
- Start every PHP file that can be requested directly with `defined( 'ABSPATH' ) || exit;` so its code never runs outside WordPress.

**Exceptions**

- `'permission_callback' => '__return_true'` only for routes that are intentionally public (read-only, no private data, no side effects beyond what an anonymous visitor may trigger). Add a comment saying the route is public and why.
- Verification inside the handler instead of the callback, when the callback cannot do it (for example, a webhook that verifies an HMAC signature over the raw body). Prefer doing it in `permission_callback`; if it must live in the handler, comment why and reject before any side effect.

```php
// Unsafe: anyone can change settings.
register_rest_route( 'myplugin/v1', '/settings', array(
	'methods'             => 'POST',
	'callback'            => 'myplugin_rest_save_settings',
	'permission_callback' => '__return_true',
) );

// Safe: authorization is enforced before the handler runs.
register_rest_route( 'myplugin/v1', '/settings', array(
	'methods'             => WP_REST_Server::EDITABLE,
	'callback'            => 'myplugin_rest_save_settings',
	'permission_callback' => static function () {
		return current_user_can( 'manage_options' );
	},
) );
```

For REST schemas and argument validation, see the `wp-rest-api` skill; for abilities, see the `wp-abilities-api` skill.

Upstream reference:

- https://developer.wordpress.org/apis/security/nonces/
- https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/#permissions-callback

## Inputs: sanitization is not authorization or allowlisting

**Required**

- Validate and sanitize input before storing it, displaying it, or passing it to a function whose behavior you don't control (hooks, third-party APIs).
- Never process a whole `$_POST` / `$_GET` / `$_REQUEST` array; read explicit keys and apply `wp_unslash()` before sanitizing.
- Sanitize a nonce before passing it to `wp_verify_nonce()`: `sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ?? '' ) )`. `check_admin_referer()` and `check_ajax_referer()` read the request themselves.
- Treat input as unsafe in sensitive positions even after sanitization. A fixed allowlist, strict comparison (`in_array( $v, $allowed, true )`), or hardcoded map must decide:
  - option, meta, transient, table, column, or capability names;
  - file paths;
  - hooks, routes, callbacks, classes, methods, or any dynamic call (`call_user_func()`, `$obj->$method()`, `new $class`, `do_action( $name )`);
  - a privileged target, scope, or execution path (which user, which site, which mode).
- Do not run passwords, signatures, tokens, or secrets through sanitizers that change them (`sanitize_text_field()` strips characters). Unslash them, use them only for their purpose (hash, compare with `hash_equals()`, send in a header), and never echo or log them.

```php
// Unsafe: sanitize_key() keeps the name well-formed, but the request still
// chooses which option is overwritten (users_can_register, default_role, ...).
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

## Output and SQL

### Escaping

Escape late, at output, using the function that matches the context:

* HTML text: `esc_html()`
* HTML attribute: `esc_attr()`
* URL: `esc_url()`
* textarea: `esc_textarea()`
* JavaScript strings: `esc_js()`

For JSON data, prefer `wp_json_encode()` and pass data through WordPress script APIs such as `wp_add_inline_script()` or `wp_localize_script()`.

For user-provided HTML, restrict allowed markup with `wp_kses_post()` or `wp_kses()` before output.

Escape the output of callbacks that render into content: shortcodes, dynamic block `render_callback` / `render.php`, and filters on `the_content`, `the_title`, or `render_block`. Contributors can insert shortcodes and blocks, so their attributes are untrusted.

```php
// Unsafe: attributes printed raw, and the shortcode echoes instead of returning.
add_shortcode( 'myplugin_badge', static function ( $atts ) {
	echo '<span class="' . $atts['class'] . '">' . $atts['label'] . '</span>';
} );

// Safe: normalized attributes, escaped per context, markup returned.
add_shortcode( 'myplugin_badge', static function ( $atts ) {
	$atts = shortcode_atts( array( 'class' => '', 'label' => '' ), $atts, 'myplugin_badge' );
	return sprintf(
		'<span class="%s">%s</span>',
		esc_attr( $atts['class'] ),
		esc_html( $atts['label'] )
	);
} );
```

### SQL

**Required**

- Use `$wpdb->prepare()` for every dynamic value; never concatenate input into SQL.
- Generate one placeholder per item in a dynamic list, and handle an empty list before querying.
- Treat table names, column names, `ORDER BY` keys, and other identifiers from the request as unsafe unless they come from an allowlist. Pass allowlisted identifiers through `%i` (WordPress 6.2+). If the plugin's `Requires at least` is below 6.2, interpolate only the allowlisted constant value.
- Prefer `$wpdb->insert()` / `$wpdb->update()` / `$wpdb->delete()` with a formats array for simple writes.

```php
// Unsafe: sanitized, but identifier and list are still interpolated from the request.
$orderby = sanitize_text_field( wp_unslash( $_GET['orderby'] ?? '' ) );
$ids     = sanitize_text_field( wp_unslash( $_GET['ids'] ?? '' ) );
$wpdb->get_results( "SELECT * FROM {$wpdb->prefix}myplugin_items WHERE id IN ($ids) ORDER BY $orderby" );

// Safe: allowlisted identifier, fixed direction, one placeholder per id.
// $requested_* hold the unslashed, sanitized request values.
$orderby = in_array( $requested_orderby, array( 'title', 'created_at' ), true ) ? $requested_orderby : 'created_at';
$order   = 'asc' === $requested_order ? 'ASC' : 'DESC';
$ids     = array_filter( array_map( 'absint', (array) $requested_ids ) );
if ( ! $ids ) {
	return array();
}
$in = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );
$wpdb->get_results(
	$wpdb->prepare(
		"SELECT * FROM %i WHERE id IN ($in) ORDER BY %i $order",
		array_merge( array( $wpdb->prefix . 'myplugin_items' ), $ids, array( $orderby ) )
	)
);
```

**Exceptions**

- Raw SQL imports for backup or migration features, limited to files the plugin itself produced or an administrator explicitly supplied, behind a capability check and nonce. Never execute SQL strings taken from request parameters.

## Code execution, uploads, and files

**Prohibited**

- Features that let users insert arbitrary PHP, JavaScript, or CSS to be executed or output on the site.
- `eval()`, `create_function()`, `assert()` with string code, and `include` / `require` of user-controlled or remote paths.
- Downloading and executing third-party code, or writing executable code (`.php`, `.phtml`, `.phar`, etc.) to disk.
- Shell commands built from input (`exec()`, `shell_exec()`, `system()`, `passthru()`, `proc_open()`, `popen()`, backticks). When a feature must run an external program, use a fixed command, pick arguments from an allowlist, and wrap each one in `escapeshellarg()`.
- Adding executable or active file types (PHP variants, HTML, JavaScript, `.htaccess`) to `upload_mimes`, or using `ALLOW_UNFILTERED_UPLOADS`.
- Storing persistent data in the plugin directory. It is replaced on every update and is often not writable.
- `unserialize()` or `maybe_unserialize()` on data an attacker can influence (request parameters, cookies, remote responses, imported files, values written without the options/meta APIs). Use JSON (`wp_json_encode()` / `json_decode()`) for data that crosses a trust boundary.
- Setting file or directory permissions to world-writable (`0777`, `0666`). Let WordPress defaults apply (`wp_mkdir_p()`, `FS_CHMOD_DIR` / `FS_CHMOD_FILE`).

**Required**

- Handle uploads with `wp_handle_upload()` (or `media_handle_upload()`) rather than `move_uploaded_file()`, and pass a `mimes` allowlist when the feature accepts only certain types.
- By default, write files only under a plugin-specific directory in `wp_upload_dir()['basedir']`, with names the plugin controls.
- Before destructive operations (`unlink()`, `rmdir()`, `wp_delete_file()`), resolve the real path and confirm it is inside the directory the plugin owns.
- Reject stream wrappers (`wp_is_stream()`) in request-supplied paths. On PHP 7.4, a `phar://` path passed to `file_exists()`, `is_file()`, `filesize()`, and similar functions deserializes the archive's metadata.
- Keep magic methods free of side effects. `__wakeup()`, `__destruct()`, and `__toString()` must not delete or write files, include paths, or call callbacks stored in properties; otherwise any deserialization bug elsewhere on the site can use the class as a gadget. Classes that hold paths, callbacks, or credentials and are never meant to be serialized should refuse it:

  ```php
  public function __wakeup() {
  	throw new \LogicException( 'This class cannot be unserialized.' );
  }
  ```

  A private `__clone()` on a singleton only prevents a second instance; it is not a security control.
- If deserialization of stored data is unavoidable, restrict it: `unserialize( $data, array( 'allowed_classes' => false ) )`.

```php
// Unsafe: persistent data in the plugin folder, with a request-chosen file name.
file_put_contents( plugin_dir_path( __FILE__ ) . $_POST['name'] . '.php', $data );

// Safe: plugin subdirectory of uploads, fixed name, non-executable format.
$uploads = wp_upload_dir();
$dir     = trailingslashit( $uploads['basedir'] ) . 'myplugin';
if ( $uploads['error'] || ! wp_mkdir_p( $dir ) ) {
	return new WP_Error( 'myplugin_storage', __( 'Storage is unavailable.', 'myplugin' ) );
}
file_put_contents( $dir . '/export.json', wp_json_encode( $data ) );

// Safe delete: target must resolve inside the plugin's directory.
$base   = realpath( $dir );
$target = realpath( $dir . '/' . sanitize_file_name( $requested_file ) );
if ( false === $base || false === $target || 0 !== strpos( $target, $base . DIRECTORY_SEPARATOR ) ) {
	return new WP_Error( 'myplugin_invalid_path', __( 'Invalid file.', 'myplugin' ) );
}
wp_delete_file( $target );
```

**Exceptions** (each needs a stated functional reason)

- Drop-ins such as `object-cache.php` or `advanced-cache.php` for caching plugins, written only on an explicit administrator action and removed when the feature is turned off.
- Backup archives, protected from direct download (unguessable names, deny rules, or storage outside the web root).
- Temporary files from `wp_tempnam()`, deleted when the operation ends.
- Root-level files that an integration requires (for example, a service verification file), created only on an explicit administrator action.
- SVG uploads, only when sanitized server-side by a maintained sanitizer.

## External services, credentials, and privileged state

**Required**

- Document every fixed third-party service the plugin contacts in the plugin readme: what the service is, what it is used for, what data is sent and when, and links to its Terms of Service and/or Privacy Policy. For the directory consent and SaaS rules, see the `wp-plugin-directory-guidelines` skill (Guidelines 6–8).
- Use `wp_safe_remote_get()` / `wp_safe_remote_post()` when a URL comes from input or settings. They reject local and private-network hosts, which blocks server-side request forgery.
- Never disable TLS verification (`'sslverify' => false`) in shipped code.
- Redirect with `wp_safe_redirect()` followed by `exit`, so request-supplied URLs can't send users to other hosts. Allow extra hosts through the `allowed_redirect_hosts` filter.
- Use the WordPress AI Client (`wp_ai_client_prompt()`) for AI features. Don't read provider keys directly from `connectors_ai_*_api_key` options: keys may come from environment variables or constants instead, and handling them is the platform's job.
- Do not create session tokens, log users in with `wp_set_auth_cookie()`, or read or forward authentication cookies, unless that is the feature's stated purpose (for example, a passwordless login plugin) and the user knows it is happening.
- Gate user creation and updates (`wp_insert_user()`, `wp_update_user()`, role or password changes) with the matching capability (`create_users`, `edit_user`, `promote_user`) and limit them to the feature's purpose. Never let a request choose an arbitrary role, user ID, or field to change; use an allowlist.

Upstream reference:

- https://make.wordpress.org/core/2026/03/24/introducing-the-ai-client-in-wordpress-7-0/

## Operational and lifecycle safeguards

**Required**

- Don't call `session_start()` globally (for example, on `init`). PHP sessions break page caching and REST loopback requests. If a flow really needs one, start it only within that non-cacheable request and close it promptly with `session_write_close()`.
- Scope PHP configuration changes to the operation that needs them: `set_time_limit()`, `ini_set()`, `error_reporting()`, display/debug settings, and memory limits (prefer `wp_raise_memory_limit()`). Never change them at file load or on every request.
- Don't change active plugins, the active theme, auto-update behavior, or update sources without a clear user-facing purpose, informed consent, and documentation.
- Never silently install, activate, deactivate, or re-activate plugins or themes.

**Exceptions**

- Plugin- or theme-management features that act only on an explicit administrator action, with capability checks (`install_plugins`, `activate_plugins`, `switch_themes`) and nonces.
- A plugin deactivating itself when its own requirements are not met, to prevent errors.

## Chained vulnerabilities

Assess each weakness by what it unlocks in combination, not in isolation. A "low-severity" gap is often one link in a full site takeover:

- **Missing capability check → stored XSS → admin takeover.** A subscriber can save a value the plugin later prints unescaped in wp-admin. The script runs in an administrator's session, can read any nonce on the page, and can create an administrator, edit plugin files, or install a plugin. Nonces and capability checks don't stop it, because the request comes from a real administrator. Fix both links: authorize the write *and* escape the output.
- **Arbitrary option update → privilege escalation.** An unrestricted `update_option()` lets an attacker set `users_can_register` and `default_role` to `administrator`, then register. Fix: authorize, and allowlist the option name.
- **Object injection → gadget chain → file write → code execution.** Untrusted `unserialize()` plus any loaded class whose `__destruct()` or `__wakeup()` writes or deletes files is enough. Fix: no untrusted deserialization, and no side effects in magic methods.
- **Path traversal or unrestricted upload → executable file in the web root.** Fix: plugin-owned directory, fixed names, path validation, no executable types.

When fixing a finding, check what else reaches the same data, sink, or file, and close every link, not just the one reported.

Common review guidance:

- https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/
- https://developer.wordpress.org/plugins/wordpress-org/common-issues/
