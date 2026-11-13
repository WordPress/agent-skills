# Security Guardrails for Plugin Development

Consult this **security reference** when 
- creating new plugins or features
- updating existing plugins or features
- accessing or hardening plugin security

## Table of Contents

**Displaying data and handling input**
- sanitizing, validating, and allowlisting input
- escaping output late
- rendering shortcode, dynamic block, and filter callback output

**Database operations**
- preparing data for CRUD
- safely handling dynamic SQL queries
- working with user-controlled tables
- prohibit use of PHP database extensions such as `mysqli` or `PDO`
- considering raw SQL imports

**REST/AJAX requests**
- checking authorization and CSRF protection together
- registering REST routes and abilities with a `permission_callback`
- handling `wp_ajax_nopriv_*` requests
- failing closed when a security check fails

**Files**
- executing or including code
- handling uploads
- writing outside the plugin's uploads subdirectory

**External services**
- documenting external services in the readme
- sourcing credentials from platform APIs

**Plugin lifecycle state**
- using sessions and global PHP configuration
- changing plugins, themes, or updates
- cleaning up on activation, deactivation, and uninstall

## How to Apply These Rules

Rules are listed in the order in which you would apply them while building a plugin, and each section labels its rules as follows:

- **Prohibited**: do not implement, whatever the justification.
- **Required**: safeguards every implementation must have.
- **Exceptions**: narrow cases that are allowed only with an explicit functional justification, documented in code (and in the readme when users are affected).

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

## Request Authorization and REST Endpoints

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

## Inputs: Sanitization is Not Authorization or Allowlisting

### Input references

- **IN-1 — Nonces:** For applicable cookie-authenticated browser state changes, use a nonce for CSRF protection alongside authentication and capability checks. A nonce is not authentication; webhooks, CLI, and cron need transport-appropriate checks, not a universal WordPress nonce. See [`01-nonce-input.md`](security/input/01-nonce-input.md).
- **IN-2 — Explicit keys:** Read only expected request keys and unslash each value before processing; do not process a whole request array. See [`02-explicit-keys.md`](security/input/02-explicit-keys.md).
- **IN-3 — Type-specific handling:** Validate and sanitize according to the expected data type. URL storage sanitation does not establish an allowed host or prevent SSRF. See [`03-validate-sanitize-type.md`](security/input/03-validate-sanitize-type.md).
- **IN-4 — IDs:** Convert numeric IDs with `absint()` and reject `0`. `absint()` coerces malformed input (`'5abc'` becomes `5`) rather than validating it, and a conversion does not authorize access to the object, so check the capability on the converted ID. See [`04-cast-ids.md`](security/input/04-cast-ids.md).
- **IN-5 — Secrets:** Do not transform, display, or log opaque secrets; validate without changing them and use them only for their intended purpose. See [`05-secrets.md`](security/input/05-secrets.md).
- **IN-6 — Sensitive positions:** Sanitization does not authorize or allowlist request-selected names, callbacks, or targets; use a fixed map or allowlist and transport-appropriate authorization and CSRF controls. See [`06-allowlist-sensitive-positions.md`](security/input/06-allowlist-sensitive-positions.md).

## Escaping Output

**Required**

Escape late, at output, using the function that matches the context:

- HTML text: `esc_html()`
- HTML attribute: `esc_attr()`
- URL: `esc_url()`
- Textarea: `esc_textarea()`
- JavaScript strings: `esc_js()`

### Internationalization (i18n) and Localization (l10n)

**Required** 

When printing fixed, user-facing text that you write in plugin code, translate and escape it in a single call. Never output the unescaped result of a translation function such as `__()` or `_e()`. Choose the function by output context:

- `esc_html__()` / `esc_html_e()` / `esc_html_x()` for HTML text
- `esc_attr__()` / `esc_attr_e()` / `esc_attr_x()` for attributes

```php
// Unsafe: nothing escapes the translation.
echo __( 'Settings saved.', 'myplugin' );
_e( 'Settings saved.', 'myplugin' );

// Safe: translate and escape in one call.
echo esc_html__( 'Settings saved.', 'myplugin' );
esc_html_e( 'Settings saved.', 'myplugin' );
```

WordPress has no combined translate-and-escape functions for other contexts. Wrap the translation function in the matching escaping function:

- URLs: `esc_url( __( 'https://example.com/help', 'myplugin' ) )`
- Textareas: `esc_textarea( __( 'Default text', 'myplugin' ) )`
- JavaScript strings: pass translated strings through `wp_localize_script()` or `wp_json_encode()`, or use `wp_set_script_translations()` with `@wordpress/i18n`, instead of `esc_js()`.

Escape dynamic values separately, and put them in `printf()` placeholders instead of concatenating them into the translatable string.
```php
// Unsafe: dynamic value concatenated into the translatable string.
printf( '<input placeholder="%s">', esc_attr__( 'Search', 'myplugin' ) );

// Translation functions with placeholders: escape the dynamic values too, and put the placeholder in the translated string:
// Safe: dynamic value escaped separately.
printf( esc_html__( 'Hello, %s', 'myplugin' ), esc_html( $name ) );
```

For JSON data, prefer `wp_json_encode()` and pass data through WordPress script APIs such as `wp_add_inline_script()` or `wp_localize_script()`.

For user-provided HTML, restrict allowed markup with `wp_kses_post()` or `wp_kses()` before output.

### Escaping Callback Output
Escape the output of callbacks that render into content:
- Shortcodes
- Dynamic blocks - `render_callback` / `render.php`
- Filters on `the_content`, `the_title`, or `render_block`
- Contributors can insert shortcodes and blocks, so their attributes are untrusted.

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

## Database Operations

Each directive is summarized here. The full rules (Prohibited, Required, Exceptions), code samples, and attack methodology are in its own file, which `SKILL.md` lists.

- **DB-1, use `$wpdb`:** use `$wpdb` and the WordPress database APIs, never `mysqli_*` or `PDO` (`database/01-use-wpdb.md`).
- **DB-2, prepare values:** use `$wpdb->prepare()` for every dynamic value, or `$wpdb->insert()` / `update()` / `delete()` with a formats array. Sanitizing is not a substitute (`database/02-prepare-values.md`).
- **DB-3, dynamic lists:** one placeholder per list item, and handle an empty list before querying (`database/03-dynamic-lists.md`).
- **DB-4, identifiers:** table names, column names, and `ORDER BY` keys from the request must come from an allowlist and go through `%i` (`database/04-identifiers.md`).
- **DB-5, combined query:** apply DB-2, DB-3, and DB-4 together in one `$wpdb->prepare()` call when a query has both a dynamic list and a request-chosen sort (`database/05-combined-query.md`).
- **DB-6, raw SQL imports:** the only exception to the SQL rules. Only a plugin-produced file verified against a keyed hash, or an administrator-supplied file, behind a nonce and capability check (`database/06-sql-imports.md`).

## Code Execution, Uploads, and Files

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


### Hardening Uploads
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

## Modifying Files

## External Services, Credentials, and Privileged State

### Third-Party Service Usage and Privacy

**Required**

Contacting and interacting with third party services requires careful handling of data and user consent.

When using third-party services, transparency should be a first-class citizen, not an afterthought.

Document every fixed third-party the plugin contacts in the plugin readme: 
- what the service is
- what it is used for
- what data is sent and when
- provide links to its Terms of Service and/or Privacy Policy

Refer to and strictly adhere to consent and SaaS rules, as outlined in the Plugin Directory Guidelines.

Upstream reference:
- Guideline 7: [No External Data Collection Without Consent](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#7-plugins-may-not-track-users-without-their-consent)
- Guideline 6: [SaaS Integrations Are Allowed – With Conditions](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#6-saas-integrations-are-allowed--with-conditions)

- Use `wp_safe_remote_get()` / `wp_safe_remote_post()` when a URL comes from input or settings. They reject local and private-network hosts, which blocks server-side request forgery.
- Never disable TLS verification (`'sslverify' => false`) in shipped code.
- Redirect with `wp_safe_redirect()` followed by `exit`, so request-supplied URLs can't send users to other hosts. Allow extra hosts through the `allowed_redirect_hosts` filter.
- Use the WordPress AI Client (`wp_ai_client_prompt()`) for AI features. Don't read provider keys directly from `connectors_ai_*_api_key` options: keys may come from environment variables or constants instead, and handling them is the platform's job.
- Do not create session tokens, log users in with `wp_set_auth_cookie()`, or read or forward authentication cookies, unless that is the feature's stated purpose (for example, a passwordless login plugin) and the user knows it is happening.
- Gate user creation and updates (`wp_insert_user()`, `wp_update_user()`, role or password changes) with the matching capability (`create_users`, `edit_user`, `promote_user`) and limit them to the feature's purpose. Never let a request choose an arbitrary role, user ID, or field to change; use an allowlist.

Upstream reference:

- https://make.wordpress.org/core/2026/03/24/introducing-the-ai-client-in-wordpress-7-0/

## Operational and Lifecycle Safeguards

**Required**

- Don't call `session_start()` globally (for example, on `init`). PHP sessions break page caching and REST loopback requests. If a flow really needs one, start it only within that non-cacheable request and close it promptly with `session_write_close()`.
- Scope PHP configuration changes to the operation that needs them: `set_time_limit()`, `ini_set()`, `error_reporting()`, display/debug settings, and memory limits (prefer `wp_raise_memory_limit()`). Never change them at file load or on every request.
- Don't change active plugins, the active theme, auto-update behavior, or update sources without a clear user-facing purpose, informed consent, and documentation.
- Never silently install, activate, deactivate, or re-activate plugins or themes.

**Exceptions**

- Plugin- or theme-management features that act only on an explicit administrator action, with capability checks (`install_plugins`, `activate_plugins`, `switch_themes`) and nonces.
- A plugin deactivating itself when its own requirements are not met, to prevent errors.

## Chained Vulnerabilities

Assess each weakness by what it unlocks in combination, not in isolation. A "low-severity" gap is often one link in a full site takeover:

- **Missing capability check → stored XSS → admin takeover.** A subscriber can save a value the plugin later prints unescaped in wp-admin. The script runs in an administrator's session, can read any nonce on the page, and can create an administrator, edit plugin files, or install a plugin. Nonces and capability checks don't stop it, because the request comes from a real administrator. Fix both links: authorize the write *and* escape the output.
- **Arbitrary option update → privilege escalation.** An unrestricted `update_option()` lets an attacker set `users_can_register` and `default_role` to `administrator`, then register. Fix: authorize, and allowlist the option name.
- **Object injection → gadget chain → file write → code execution.** Untrusted `unserialize()` plus any loaded class whose `__destruct()` or `__wakeup()` writes or deletes files is enough. Fix: no untrusted deserialization, and no side effects in magic methods.
- **Path traversal or unrestricted upload → executable file in the web root.** Fix: plugin-owned directory, fixed names, path validation, no executable types.

When fixing a finding, check what else reaches the same data, sink, or file, and close every link, not just the one reported.

## Final Pass Review
- [ ] **Checklist** Ensure all security checklist items are addressed and properly implemented.
- [ ] **Edge Cases** Verify that all edge cases have been noted for review and not implemented.
- [ ] **PCP** Run the code through the Plugin Check Plugin's CLI tool to catch any remaining issues. Any findings should be addressed before finalizing the review, and security sniff ignores should be documented and justified.
- [ ] **PCP CLI** Add code for running the Plugin Check Plugin's CLI tool.

Common review guidance:

- https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/
- https://developer.wordpress.org/plugins/wordpress-org/common-issues/
