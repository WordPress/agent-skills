---
name: "wp-vip-standards"
description: "WordPress VIP platform coding standards: VIP-specific PHPCS rulesets (WordPressVIPMinimum, WordPress-VIP-Go), banned functions and required alternatives, caching requirements, file system restrictions, database query rules, and deployment constraints. Use when writing or reviewing code for WordPress VIP infrastructure. Prerequisite: wp-secure-code covers the baseline WordPress security patterns that VIP standards build on."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Requires PHPCS with automattic/vipwpcs ^3.0. Applies to code deployed on WordPress VIP Go platform."
---

# WordPress VIP Coding Standards

## Scope

- Use this skill when writing or reviewing code that will run on WordPress VIP infrastructure.
- Covers VIP-specific restrictions that go beyond standard WordPress coding standards.
- Prerequisite: `wp-secure-code` covers baseline WordPress security (sanitization, escaping, nonces, capabilities, $wpdb->prepare). This skill adds VIP-specific rules on top.
- For general WordPress security patterns, use `wp-secure-code`.
- For performance optimization patterns, combine with `wp-performance` and `wp-performance-review`.

## Execution Boundary

- Primary responsibility: ensure code is compatible with VIP platform constraints.
- When reviewing, flag VIP-specific violations with the PHPCS sniff name, severity, and the VIP-approved alternative.
- When writing new code, always use VIP-compatible patterns from the start.

## VIP Platform Constraints

Code on VIP runs in a fundamentally different environment than standard WordPress hosting:

| Constraint | Impact |
|---|---|
| **Read-only filesystem** | No writing to `wp-content/uploads/` or any local path at runtime. Media goes through VIP File Service. |
| **No FTP/SSH file access** | All code changes go through GitHub deploys. No editing files on the server. |
| **No wp-admin plugin/theme management** | Plugins and themes are deployed via the repository, not installed through the admin. |
| **Built-in object cache** | Memcached is always available. Direct database queries that bypass cache are flagged. |
| **Built-in page cache** | Full-page caching is on by default. Code that assumes uncached page loads will behave unexpectedly. |
| **MU-plugins** | VIP provides must-use plugins (Jetpack, Akismet, caching layer). Don't bundle or override these. |

## Banned Functions and Required Alternatives

### Filesystem operations

VIP's web containers are read-only. Any function that writes to the local filesystem will fail.

| Banned | Why | Alternative |
|---|---|---|
| `file_put_contents()` | Writes to local filesystem | Use VIP File Service API or `wpcom_vip_file_*` functions |
| `file_get_contents()` | Unreliable on VIP; no timeout | `wp_remote_get()` for remote URLs; `WP_Filesystem` for local reads |
| `fwrite()` / `fopen()` for writing | Read-only filesystem | VIP File Service or transient/option storage |
| `move_uploaded_file()` | Bypasses VIP media handling | Let WordPress handle uploads through standard media flow |
| `mkdir()` / `rmdir()` | Read-only filesystem | Not applicable on VIP |
| `chmod()` / `chown()` | No filesystem permission changes | Not applicable on VIP |
| `tempnam()` / `tmpfile()` | Temp directory may not exist or be writable | `get_temp_dir()` if absolutely needed; prefer transients |
| `unlink()` | Cannot delete files on read-only FS | `wp_delete_file()` for media; otherwise not applicable |

### Dangerous PHP functions

| Banned | Why |
|---|---|
| `eval()` | Remote code execution risk; impossible to audit statically |
| `create_function()` | Wrapper for `eval()`; deprecated in PHP 7.2+ |
| `exec()` / `shell_exec()` / `system()` / `passthru()` / `proc_open()` / `popen()` | Shell execution; not available on VIP |
| `ini_set()` | Cannot modify PHP runtime config on VIP |
| `putenv()` | Cannot modify environment variables at runtime |
| `extract()` | Creates variables from array keys; makes code unauditable |
| `error_reporting()` | Cannot modify error reporting level on VIP |

### HTTP and remote requests

| Banned | Alternative |
|---|---|
| `curl_*()` functions | `wp_remote_get()`, `wp_remote_post()`, `wp_safe_remote_get()` |
| `file_get_contents( $url )` | `wp_remote_get( $url )` |
| Remote requests without timeout | Always set `'timeout'` arg in `wp_remote_*()` — VIP flags missing timeouts |
| Uncached remote requests | Cache responses in transients or object cache |

```php
// Wrong — no timeout, no caching
$response = wp_remote_get( 'https://api.example.com/data' );

// Right — timeout + transient cache
$data = get_transient( 'example_api_data' );
if ( false === $data ) {
    $response = wp_remote_get( 'https://api.example.com/data', array(
        'timeout' => 5,
    ) );
    if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        set_transient( 'example_api_data', $data, HOUR_IN_SECONDS );
    }
}
```

### Database queries

| Banned / Flagged | Why | Alternative |
|---|---|---|
| `$wpdb->query()` without caching | Bypasses object cache on every page load | Use WordPress API (`get_posts`, `get_option`, etc.) or cache results |
| `post__not_in` in `WP_Query` | Destroys cache hit rate at scale | Use `post__in` with a pre-filtered list, or filter results in PHP |
| `LIKE '%search%'` leading wildcard | Full table scan; no index use | Use `LIKE 'search%'` (trailing wildcard only) or Elasticsearch via VIP Search |
| `SQL_CALC_FOUND_ROWS` / `found_rows()` | Expensive on large tables | Set `'no_found_rows' => true` in `WP_Query` when you don't need pagination totals |
| Missing `post_type` in queries | Default `'post'` may not be what you want; confuses cache | Always explicitly set `'post_type'` |
| Missing `post_status` in queries | Default `'publish'` is implicit; may include unexpected statuses | Always explicitly set `'post_status'` |
| `'include_children' => true` on tax queries | Default since WP 4.4; expensive with deep hierarchies | Set `'include_children' => false` unless you need it |

```php
// Wrong — post__not_in, no post_type, SQL_CALC_FOUND_ROWS implied
$query = new WP_Query( array(
    'post__not_in' => $exclude_ids,
    'posts_per_page' => 10,
) );

// Right — explicit types, no_found_rows, filtered in PHP
$query = new WP_Query( array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'posts_per_page' => 10,
    'no_found_rows'  => true,
) );
// Filter out excluded IDs in PHP after the cached query returns
```

### Caching requirements

All database queries and remote requests must be cached. VIP provides Memcached-backed object cache.

```php
// Wrong — hits database on every page load
$results = $wpdb->get_results( $wpdb->prepare(
    "SELECT * FROM {$wpdb->postmeta} WHERE meta_key = %s",
    'custom_key'
) );

// Right — cached with group and expiration
$cache_key = 'custom_key_results';
$results = wp_cache_get( $cache_key, 'my-plugin' );
if ( false === $results ) {
    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->postmeta} WHERE meta_key = %s",
        'custom_key'
    ) );
    wp_cache_set( $cache_key, $results, 'my-plugin', 300 );
}
```

#### Cache invalidation

Always invalidate when the underlying data changes:

```php
add_action( 'save_post', function ( $post_id ) {
    wp_cache_delete( 'custom_key_results', 'my-plugin' );
} );
```

### Unique slugs

`wp_unique_post_slug()` iterates the database to find the next available slug. On sites with millions of posts, this causes severe performance degradation. VIP flags code that triggers slug generation at scale (e.g., bulk post creation).

## PHPCS Rulesets

### Installation

```bash
composer require --dev automattic/vipwpcs
```

This pulls in WPCS, PHPCSUtils, PHPCSExtra, and VariableAnalysis as dependencies.

### Available rulesets

| Ruleset | Use for |
|---|---|
| `WordPress-VIP-Go` | Current VIP Go platform (recommended) |
| `WordPressVIPMinimum` | Legacy WordPress.com VIP |

```bash
# Run against your code
vendor/bin/phpcs --standard=WordPress-VIP-Go your-plugin/

# See all available sniffs
vendor/bin/phpcs --standard=WordPress-VIP-Go -e
```

### Key VIP-specific sniffs

| Sniff | What it catches |
|---|---|
| `WordPressVIPMinimum.Functions.RestrictedFunctions` | Banned filesystem, shell, and eval functions |
| `WordPressVIPMinimum.Performance.NoPaging` | `'nopaging' => true` or `'posts_per_page' => -1` (unbounded queries) |
| `WordPressVIPMinimum.Performance.WPQueryParams` | `post__not_in`, missing `post_type`, `suppress_filters` |
| `WordPressVIPMinimum.Performance.LowExpiryCacheTime` | Transients/cache with expiry under 5 minutes |
| `WordPressVIPMinimum.Variables.RestrictedVariables` | Direct superglobal access, `$_SERVER` without validation |
| `WordPressVIPMinimum.Functions.DynamicCalls` | `call_user_func()` with user input |
| `WordPressVIPMinimum.Performance.RemoteRequestTimeout` | `wp_remote_*()` without timeout parameter |
| `WordPressVIPMinimum.Security.Vuln` | Known vulnerability patterns |

### Recommended composer.json

```json
{
    "require-dev": {
        "automattic/vipwpcs": "^3.0",
        "dealerdirect/phpcodesniffer-composer-installer": "^1.0"
    }
}
```

This is additive — include alongside the `wp-secure-code` baseline dependencies (WPCS, PHPCompatibility).

## Deployment

### Repository structure

```
your-repo/
├── plugins/
│   ├── your-plugin/          # Maps to wp-content/plugins/
│   └── third-party-plugin/   # Committed directly, not as submodule
├── themes/
│   └── your-theme/           # Maps to wp-content/themes/
├── client-mu-plugins/        # Must-use plugins (loaded before themes)
└── vip-config/
    └── vip-config.php        # VIP-specific configuration
```

### Rules

- **No submodules** for production branches — use subtrees or commit vendor code directly.
- **No zipped plugins** — all code must be decompressed in the repository.
- **Composer dependencies** must be committed or built in CI before deploy.
- **SVG files** are scanned for embedded scripts — sanitize before committing.

## VIP Code Review Checklist

In addition to the `wp-secure-code` checklist, verify:

### Filesystem
- [ ] No local filesystem writes (`file_put_contents`, `fwrite`, `mkdir`, etc.)
- [ ] Media uploads use standard WordPress flow, not custom upload handlers
- [ ] No `ini_set()`, `putenv()`, or `error_reporting()`

### Performance
- [ ] No `post__not_in` in WP_Query
- [ ] No `'nopaging' => true` or `'posts_per_page' => -1`
- [ ] `'no_found_rows' => true` when pagination totals aren't needed
- [ ] `'post_type'` and `'post_status'` explicitly set in all queries
- [ ] `'include_children' => false` on taxonomy queries unless hierarchy is needed
- [ ] All `$wpdb` results cached with `wp_cache_set()` / `wp_cache_get()`
- [ ] All remote requests cached in transients with `timeout` parameter set
- [ ] Cache expiry > 5 minutes (VIP flags low-expiry cache)
- [ ] Cache invalidation on data changes

### Remote requests
- [ ] `wp_remote_*()` used instead of cURL
- [ ] `timeout` parameter always set
- [ ] Error handling with `is_wp_error()` and response code check
- [ ] Responses cached

### Deployment
- [ ] No submodules on production branch
- [ ] No zipped/archived plugin files
- [ ] SVGs sanitized
- [ ] No `eval()`, `exec()`, `shell_exec()`, `extract()`

### PHPCS
- [ ] Zero errors on `WordPress-VIP-Go` standard
- [ ] Warnings reviewed and addressed or justified

## Done Criteria

- Zero PHPCS errors on `WordPress-VIP-Go` standard.
- All `wp-secure-code` done criteria also met (baseline security).
- No banned functions used — VIP-approved alternatives in place.
- All database queries and remote requests cached with proper invalidation.
- No filesystem writes.
- Repository structure matches VIP deployment requirements.
