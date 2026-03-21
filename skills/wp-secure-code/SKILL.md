---
name: "wp-secure-code"
description: "WordPress secure code analysis and authoring: sanitization, escaping, validation, nonces, capability checks, $wpdb->prepare(), wp_kses, REST permission callbacks, OWASP top 10 in WordPress context. Supports WordPress Coding Standards (WPCS), VIP Coding Standards, and PHPCompatibility. Use when writing, reviewing, or auditing WordPress PHP code for security."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Applies to plugins, themes, blocks, and custom code. PHPCS with WPCS 3.1+ and VIP Coding Standards for automated enforcement."
---

# WordPress Secure Code

## Scope

- Use this skill when writing, reviewing, or auditing WordPress PHP code for security.
- Covers the WordPress Security API: sanitization, escaping, validation, nonces, capability checks, and database safety.
- Covers common vulnerabilities: SQL injection, XSS, CSRF, privilege escalation, file inclusion, open redirect, object injection.
- Covers automated enforcement via WPCS and VIP Coding Standards PHPCS rulesets.
- For security documentation and editorial work, use `security-researcher` and `wordpress-security-doc-editor` instead.
- For PHPStan static analysis (type safety, not security-specific), use `wp-phpstan`.
- For REST API route registration and schema, combine with `wp-rest-api`.

## Execution Boundary

- Primary responsibility: identify and fix security vulnerabilities in WordPress PHP code.
- When writing new code, always use the secure pattern — never generate vulnerable code even as an example without immediately showing the fix.
- When reviewing existing code, flag every instance with file path, line number, severity, and the specific fix.

## Core Principles

From the WordPress Security API documentation:

1. **Never trust user input** — not from forms, URLs, cookies, HTTP headers, databases, or third-party APIs.
2. **Validate early, reject invalid data** — prefer validation (reject bad data) over sanitization (clean bad data).
3. **Escape late** — escape output at the point of rendering, not when storing.
4. **Use WordPress APIs** — they handle security internally. Raw SQL, raw `$_POST`, and `echo $var` are almost always wrong.
5. **Never assume** — check types, check capabilities, check nonces, check return values.

## Input Handling: Validate → Sanitize → Escape

Every piece of external data flows through three stages:

```
User input → VALIDATE (reject if invalid) → SANITIZE (clean for storage) → ESCAPE (safe for output)
```

### Validation

Test data against known-good patterns. Reject anything that doesn't match.

| Function | Purpose |
|---|---|
| `is_email()` | Validates email format |
| `term_exists()` | Checks if taxonomy term exists |
| `username_exists()` | Checks if username is taken |
| `validate_file()` | Validates file path is real |
| `in_array( $val, $safe, true )` | Safelist check — **always pass `true` for strict** |
| `absint()` | Returns absolute integer (validates + sanitizes) |

#### Safelist pattern (preferred for constrained inputs)

```php
$allowed = array( 'publish', 'draft', 'pending' );
if ( ! in_array( $status, $allowed, true ) ) {
    wp_die( 'Invalid status.' );
}
```

#### Custom validation

```php
function wporg_is_valid_us_zip( string $zip ): bool {
    return (bool) preg_match( '/^\d{5}(-\d{4})?$/', trim( $zip ) );
}
```

### Sanitization

Clean input for safe storage. Use the most specific function available.

| Function | Use for |
|---|---|
| `sanitize_text_field()` | Single-line text inputs |
| `sanitize_textarea_field()` | Multi-line text |
| `sanitize_email()` | Email addresses |
| `sanitize_url()` | URLs before storage |
| `sanitize_file_name()` | Filenames |
| `sanitize_title()` | Slugs and URL-safe strings |
| `sanitize_key()` | Lowercase keys (a-z, 0-9, dashes) |
| `sanitize_html_class()` | CSS class names |
| `sanitize_mime_type()` | MIME types |
| `wp_kses()` | HTML with custom allowed tags |
| `wp_kses_post()` | HTML safe for post content |
| `wp_kses_data()` | HTML safe for comments |
| `(int)` / `absint()` | Integer values |
| `(float)` | Float values |

#### Always sanitize `$_GET`, `$_POST`, `$_REQUEST`, `$_SERVER`, `$_COOKIE`

```php
// Wrong
$name = $_POST['name'];

// Right
$name = sanitize_text_field( wp_unslash( $_POST['name'] ) );
```

Note: WordPress adds magic quotes to superglobals. Always `wp_unslash()` before sanitizing.

### Escaping

Prepare data for safe output in a specific context. **Escape at the point of echo, never earlier.**

| Function | Context | Example |
|---|---|---|
| `esc_html()` | Inside HTML elements | `<p><?php echo esc_html( $text ); ?></p>` |
| `esc_attr()` | HTML attribute values | `<input value="<?php echo esc_attr( $val ); ?>">` |
| `esc_url()` | `href`, `src`, `action` | `<a href="<?php echo esc_url( $url ); ?>">` |
| `esc_js()` | Inline JavaScript | `<script>var x = '<?php echo esc_js( $val ); ?>';</script>` |
| `esc_textarea()` | Inside `<textarea>` | `<textarea><?php echo esc_textarea( $text ); ?></textarea>` |
| `esc_xml()` | XML blocks | For XML feeds/sitemaps |
| `esc_url_raw()` | URLs stored in DB | Use instead of `esc_url()` when not rendering to HTML |
| `wp_kses_post()` | Rich HTML output | When preserving allowed post HTML |

#### Localization + escaping combos

Use these instead of `esc_html( __() )`:

| Function | Equivalent to |
|---|---|
| `esc_html__()` | `esc_html( __() )` |
| `esc_html_e()` | `echo esc_html( __() )` |
| `esc_html_x()` | `esc_html( _x() )` |
| `esc_attr__()` | `esc_attr( __() )` |
| `esc_attr_e()` | `echo esc_attr( __() )` |
| `esc_attr_x()` | `esc_attr( _x() )` |

#### The late-escaping rule

```php
// WRONG — escaped too early, could be modified before output
$safe = esc_html( $title );
// ... 50 lines later ...
echo $safe;

// RIGHT — escape at the point of output
echo esc_html( $title );
```

## Nonces (CSRF Protection)

Nonces prevent cross-site request forgery. They are **not authentication** — always pair with capability checks.

### Creating nonces

```php
// In a URL
$url = wp_nonce_url( $action_url, 'trash-post_' . $post_id );

// In a form
wp_nonce_field( 'update-settings_' . $user_id );

// Manual creation
$nonce = wp_create_nonce( 'my-action_' . $item_id );
```

### Verifying nonces

```php
// In admin form handlers
check_admin_referer( 'update-settings_' . $user_id );

// In AJAX handlers
check_ajax_referer( 'my-action', 'nonce' );

// Manual verification
if ( ! wp_verify_nonce( $_POST['_wpnonce'], 'my-action_' . $item_id ) ) {
    wp_die( 'Security check failed.' );
}
```

### Nonce action naming

Always include the object ID in the action string to prevent nonce reuse across objects:

```php
// Wrong — same nonce works for any post
wp_nonce_field( 'delete-post' );

// Right — nonce is specific to this post
wp_nonce_field( 'delete-post_' . $post_id );
```

### Nonce lifetime

Default: 24 hours (two 12-hour ticks). Actual validity is 12–24 hours depending on creation time. Customize with `nonce_life` filter only when necessary.

## Capability Checks

Every privileged action must verify the current user has permission. Nonces alone are not sufficient.

### current_user_can()

```php
// Before processing a delete
if ( ! current_user_can( 'delete_post', $post_id ) ) {
    wp_die( 'You do not have permission to delete this post.' );
}
```

### Common capabilities

| Capability | Who has it | Use for |
|---|---|---|
| `manage_options` | Administrators | Settings pages, site-wide config |
| `edit_posts` | Authors+ | Creating/editing own posts |
| `edit_others_posts` | Editors+ | Editing any post |
| `delete_post` (meta) | Varies | Deleting a specific post (pass post ID) |
| `upload_files` | Authors+ | Media uploads |
| `manage_categories` | Editors+ | Taxonomy management |
| `install_plugins` | Super Admins (multisite), Admins (single) | Plugin installation |

### Meta capabilities vs. primitive capabilities

Use meta capabilities (like `edit_post`, `delete_post`) with the object ID — WordPress maps them to the correct primitive capability based on the post author and type:

```php
// Right — meta capability with object ID
current_user_can( 'edit_post', $post_id );

// Wrong — primitive capability doesn't account for ownership
current_user_can( 'edit_posts' );
```

### REST API permission callbacks

Every `register_rest_route()` must have a `permission_callback`. Never use `__return_true` on routes that modify data:

```php
register_rest_route( 'myplugin/v1', '/items/(?P<id>\d+)', array(
    'methods'             => 'DELETE',
    'callback'            => 'myplugin_delete_item',
    'permission_callback' => function ( $request ) {
        return current_user_can( 'delete_post', $request['id'] );
    },
) );
```

For public read-only endpoints, `__return_true` is acceptable:

```php
register_rest_route( 'myplugin/v1', '/items', array(
    'methods'             => 'GET',
    'callback'            => 'myplugin_get_items',
    'permission_callback' => '__return_true',
) );
```

## Database Safety

### $wpdb->prepare()

Never interpolate variables into SQL. Always use `$wpdb->prepare()` with placeholders:

```php
// WRONG — SQL injection
$wpdb->query( "DELETE FROM $wpdb->posts WHERE ID = $id" );

// RIGHT
$wpdb->query( $wpdb->prepare(
    "DELETE FROM {$wpdb->posts} WHERE ID = %d",
    $id
) );
```

| Placeholder | Type |
|---|---|
| `%d` | Integer |
| `%f` | Float |
| `%s` | String |

### Prefer WordPress API over raw SQL

```php
// Wrong — raw SQL for something the API handles
$wpdb->query( "UPDATE wp_options SET option_value = 'yes' WHERE option_name = 'my_opt'" );

// Right — WordPress API handles escaping internally
update_option( 'my_opt', 'yes' );
```

Use `$wpdb` directly only when WordPress provides no equivalent API function.

### LIKE queries

```php
$wpdb->get_results( $wpdb->prepare(
    "SELECT * FROM {$wpdb->posts} WHERE post_title LIKE %s",
    '%' . $wpdb->esc_like( $search_term ) . '%'
) );
```

`$wpdb->esc_like()` escapes `%` and `_` wildcards in the search term. The outer `%` wildcards go outside the `esc_like()` call.

## Common Vulnerabilities

### SQL Injection

**Vulnerable:**
```php
$results = $wpdb->get_results(
    "SELECT * FROM {$wpdb->posts} WHERE post_author = " . $_GET['author']
);
```

**Secure:**
```php
$results = $wpdb->get_results( $wpdb->prepare(
    "SELECT * FROM {$wpdb->posts} WHERE post_author = %d",
    absint( $_GET['author'] )
) );
```

### Cross-Site Scripting (XSS)

**Vulnerable:**
```php
echo '<h1>' . $title . '</h1>';
echo '<img src="' . $url . '" />';
```

**Secure:**
```php
echo '<h1>' . esc_html( $title ) . '</h1>';
echo '<img src="' . esc_url( $url ) . '" />';
```

### Cross-Site Request Forgery (CSRF)

**Vulnerable:**
```php
if ( isset( $_POST['delete'] ) ) {
    wp_delete_post( $_POST['post_id'] );
}
```

**Secure:**
```php
if ( isset( $_POST['delete'] ) ) {
    check_admin_referer( 'delete-post_' . $_POST['post_id'] );
    if ( current_user_can( 'delete_post', absint( $_POST['post_id'] ) ) ) {
        wp_delete_post( absint( $_POST['post_id'] ) );
    }
}
```

### Open Redirect

**Vulnerable:**
```php
wp_redirect( $_GET['redirect_to'] );
```

**Secure:**
```php
wp_safe_redirect( wp_validate_redirect( $_GET['redirect_to'], admin_url() ) );
exit;
```

`wp_safe_redirect()` only allows redirects to the same host. Always call `exit` after a redirect.

### Object Injection (unserialize)

**Vulnerable:**
```php
$data = unserialize( $_COOKIE['settings'] );
```

**Secure:**
```php
$data = json_decode( sanitize_text_field( wp_unslash( $_COOKIE['settings'] ) ), true );
// Or if serialized data is unavoidable:
$data = maybe_unserialize( get_option( 'my_settings' ) ); // From trusted source only
```

Never `unserialize()` user-supplied data. Prefer JSON. WordPress's `maybe_unserialize()` is only safe for data from the options/meta API (already stored by WordPress).

### File Inclusion / Path Traversal

**Vulnerable:**
```php
include $_GET['template'] . '.php';
```

**Secure:**
```php
$allowed = array( 'header', 'footer', 'sidebar' );
$template = sanitize_file_name( $_GET['template'] );
if ( in_array( $template, $allowed, true ) ) {
    include plugin_dir_path( __FILE__ ) . 'templates/' . $template . '.php';
}
```

### Privilege Escalation

**Vulnerable:**
```php
// REST endpoint with no permission check
register_rest_route( 'myplugin/v1', '/settings', array(
    'methods'  => 'POST',
    'callback' => 'myplugin_update_settings',
) );
```

**Secure:**
```php
register_rest_route( 'myplugin/v1', '/settings', array(
    'methods'             => 'POST',
    'callback'            => 'myplugin_update_settings',
    'permission_callback' => function () {
        return current_user_can( 'manage_options' );
    },
) );
```

WordPress 5.5+ triggers a `_doing_it_wrong` notice for routes without `permission_callback`.

## Automated Enforcement: PHPCS Rulesets

### WordPress Coding Standards (WPCS)

The baseline security ruleset. Catches missing escaping, direct database queries, nonce verification, and superglobal usage.

```bash
composer require --dev wp-coding-standards/wpcs
vendor/bin/phpcs --standard=WordPress your-plugin/
```

Key WPCS security sniffs:
- `WordPress.Security.EscapeOutput` — flags unescaped output
- `WordPress.Security.NonceVerification` — flags form handlers without nonce checks
- `WordPress.Security.ValidatedSanitizedInput` — flags raw `$_GET`/`$_POST` usage
- `WordPress.DB.PreparedSQL` — flags unprepared database queries
- `WordPress.DB.DirectDatabaseQuery` — flags direct `$wpdb` when API exists

### VIP Coding Standards

Stricter ruleset from Automattic for WordPress VIP platform. Extends WPCS with additional checks for performance-sensitive and high-security environments.

```bash
composer require --dev automattic/vipwpcs
vendor/bin/phpcs --standard=WordPress-VIP-Go your-plugin/
```

Two rulesets available:
- `WordPressVIPMinimum` — legacy VIP platform
- `WordPress-VIP-Go` — current VIP Go platform

VIP standards flag additional patterns like:
- File operations without VIP-approved alternatives
- Uncached database queries
- `eval()` and `create_function()` usage
- Remote HTTP requests without timeouts

### PHPCompatibility

Not security-specific but catches PHP version compatibility issues that can create vulnerabilities:

```bash
composer require --dev phpcompatibility/phpcompatibility-wp
vendor/bin/phpcs --standard=PHPCompatibilityWP --runtime-set testVersion 7.4- your-plugin/
```

### Recommended composer.json dev dependencies

```json
{
    "require-dev": {
        "wp-coding-standards/wpcs": "^3.1",
        "automattic/vipwpcs": "^3.0",
        "phpcompatibility/phpcompatibility-wp": "^2.1",
        "dealerdirect/phpcodesniffer-composer-installer": "^1.0"
    }
}
```

## Security Review Checklist

When reviewing WordPress PHP code, check every item:

### Input handling
- [ ] All `$_GET`, `$_POST`, `$_REQUEST`, `$_SERVER`, `$_COOKIE` values sanitized
- [ ] `wp_unslash()` called before sanitization
- [ ] Input validated against expected type/format before use
- [ ] Safelist pattern used for constrained inputs (`in_array` with strict)

### Output
- [ ] All dynamic output escaped with the correct context function
- [ ] Escaping happens at point of `echo`, not earlier
- [ ] Localized strings use `esc_html__()` / `esc_attr__()` combos
- [ ] URLs escaped with `esc_url()` in HTML, `esc_url_raw()` for storage

### Database
- [ ] All `$wpdb` queries use `$wpdb->prepare()` with placeholders
- [ ] `$wpdb->esc_like()` used for LIKE search terms
- [ ] WordPress API used instead of raw SQL where possible
- [ ] No string interpolation in SQL queries

### Authentication & authorization
- [ ] `current_user_can()` checked before every privileged action
- [ ] Meta capabilities used with object IDs where applicable
- [ ] Every REST route has a `permission_callback`
- [ ] `__return_true` only used for public read-only endpoints

### CSRF
- [ ] Forms include `wp_nonce_field()`
- [ ] Action URLs use `wp_nonce_url()`
- [ ] Handlers verify with `check_admin_referer()` or `check_ajax_referer()`
- [ ] Nonce actions include object IDs

### Redirects & includes
- [ ] `wp_safe_redirect()` used instead of `wp_redirect()` where possible
- [ ] `exit` called after every redirect
- [ ] No user input in `include`/`require` paths without safelist validation
- [ ] `validate_file()` or safelist pattern used for dynamic file paths

### Serialization
- [ ] No `unserialize()` on user-supplied data
- [ ] JSON preferred over serialized PHP for data exchange

## Done Criteria

- Zero PHPCS errors on `WordPress` standard for security sniffs.
- All user input sanitized, all output escaped, all database queries prepared.
- Capability checks on every privileged action.
- Nonces on every state-changing form and URL.
- No raw superglobal access without `wp_unslash()` + sanitization.
- REST routes have appropriate `permission_callback`.
- No `unserialize()` on untrusted data, no user input in file paths, no open redirects.
