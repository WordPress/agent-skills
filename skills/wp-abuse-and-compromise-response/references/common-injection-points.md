# Common injection points

Catalog of where attackers hide things, ordered roughly by frequency of being missed during cleanup. This is the doc that prevents re-infection.

If a compromise reappears within days of cleanup, **the missed backdoor is almost always somewhere in this list.**

## 1. mu-plugins/ — the most-missed hiding place

`wp-content/mu-plugins/` (must-use plugins) auto-load on every request without requiring activation. They don't appear in the WP admin's Plugins page. Many cleanups skip this directory entirely.

Check for:

```bash
ls -la wp-content/mu-plugins/
```

Most legitimate sites don't use mu-plugins. If the directory exists and contains files you don't recognize, treat as compromised.

Common payload patterns inside:
- A small PHP file that `require_once`s a hidden file elsewhere (often inside `uploads/` or a benign-named directory)
- A file that re-installs other malware on each request (auto-repair after partial cleanups)

## 2. wp-config.php — prepended or appended

`wp-config.php` is intentionally not part of WP's checksum file, so `verify-checksums` won't catch modifications.

Attackers commonly:
- Prepend PHP at the very top, before the `<?php` of legitimate config
- Append PHP at the end, after the closing block
- Inject a `require` statement pointing at a backdoor file elsewhere

After cleanup, manually re-create `wp-config.php` from scratch using:
- DB credentials (host, name, user, pass)
- A fresh set of salts from https://api.wordpress.org/secret-key/1.1/salt/
- Standard table prefix
- Any legitimate constants (debug, memory limit, etc.)

Don't trust the file you found — diff it against a clean baseline you control.

## 3. wp_options — autoloaded malicious payloads

The `wp_options` table loads every row marked `autoload='yes'` on every request. Attackers store serialized PHP or base64 blobs that get eval'd by a small loader elsewhere.

Query patterns to flag (see [investigation.md](investigation.md) for the full SQL):
- `option_value` containing `eval(`, `base64_decode`, `gzinflate`
- `option_value` containing `<script>` or `<iframe>` (especially if option name is generic like `widget_text`, `wp_user_roles`, or random)
- Autoloaded options with very large values (multi-KB) and obscure names — often base64-encoded payloads

Cleanup: delete the suspicious row (after verifying it's not legitimate plugin data), then re-test.

## 4. Active theme's functions.php — appended code

Quick to drop, hard to spot unless the file is large to begin with. Attackers:
- Append code after the legitimate theme code
- Add a `require` for a file elsewhere

After cleanup, replace the theme with a fresh download. If it's a custom theme, diff against version control.

## 5. .htaccess — root and subdirectories

Multiple `.htaccess` files can affect behavior:
- Root `.htaccess` — main rewrite rules
- Per-directory `.htaccess` — override or add rules
- Particularly `wp-content/uploads/.htaccess` — used to allow PHP execution there, or to redirect

`RewriteRule` and `RewriteCond` lines with external URLs in the destination are red flags.

Standard WP root `.htaccess` is small (~10 lines, no external URLs). If yours is larger, investigate.

## 6. Scheduled WP cron events

A cron hook fires on its schedule and can execute any registered function. Compromises use this for:
- Periodic outbound spam blasts
- Periodic re-infection (if cleanup misses other backdoors, the cron event reinstalls them)
- Sleeper backdoors that activate weeks later

After cleanup, list all cron events and remove any you don't recognize:

```bash
wp cron event list
wp cron event delete <hook-name>
```

Match hook names to known plugins. Anything unmatched is suspect.

## 7. Plugin directories with WP-flavored names

Attackers create plugin directories with names that look like WordPress infrastructure:
- `wp-config-php/` (not a real plugin)
- `wp-content-update/`
- `akismet-update/`
- `wordpress-update/`
- `wp-includes-update/`

Or random short hex/alphanumeric names: `a1b2c3/`, `xyz/`.

After cleanup, `ls wp-content/plugins/` and verify every directory corresponds to a plugin you intentionally installed.

## 8. Web shells in unusual file extensions

Default WP/PHP setups execute `.php` files. But misconfigurations can execute:
- `.phtml`
- `.phar`
- `.php3`, `.php4`, `.php5`, `.php7`
- `.pht`
- Any file with `application/x-httpd-php` MIME handler

When grepping for backdoors, check all of these. Hosts with strict configurations may only execute `.php`, but you can't assume that.

## 9. Database — fake admin user with manipulated meta

A user might appear non-admin in `wp_users.user_role`-equivalent fields but have admin caps via `wp_usermeta`:

```sql
SELECT u.ID, u.user_login, um.meta_value
FROM wp_users u
JOIN wp_usermeta um ON u.ID = um.user_id
WHERE um.meta_key = 'wp_capabilities'
  AND um.meta_value LIKE '%administrator%';
```

Or via `wp_user_level` >= 10. Or via custom capability arrays serialized into `wp_capabilities`.

## 10. Active theme's `header.php` and `footer.php` — script/iframe injection

Frontend-visible compromises that inject JavaScript or iframes for ad fraud / cryptominer drops often go here. After cleanup, diff the theme against the official version.

## 11. `index.php` in WP root — replaced or wrapped

WP root `index.php` is a tiny file (~17 lines, just bootstrap). If it's larger or contains anything beyond the bootstrap, it's been tampered with.

Standard content:

```php
<?php
/**
 * Front to the WordPress application. This file doesn't do anything, but loads
 * wp-blog-header.php which does and tells WordPress to load the theme.
 *
 * @package WordPress
 */
define( 'WP_USE_THEMES', true );
require __DIR__ . '/wp-blog-header.php';
```

Replace if different.

## 12. Drop-ins — auto-loaded files directly in wp-content/

WordPress drop-ins live **directly in `wp-content/`** (not a `drop-ins/` subdirectory — that directory does not exist in stock WP). The recognized drop-in filenames are auto-loaded by core and rarely audited:

- `advanced-cache.php`
- `db.php`
- `db-error.php`
- `install.php`
- `maintenance.php`
- `object-cache.php`
- `php-error.php`
- `fatal-error-handler.php`
- Multisite-only: `sunrise.php`, `blog-deleted.php`, `blog-inactive.php`, `blog-suspended.php`

Reference: https://developer.wordpress.org/reference/functions/_get_dropins/

Grep approach:

```bash
ls -la wp-content/{advanced-cache,db,db-error,install,maintenance,object-cache,php-error,fatal-error-handler,sunrise,blog-deleted,blog-inactive,blog-suspended}.php 2>/dev/null
```

Any file present is auto-loaded. Verify each against a known legitimate source (the caching plugin's drop-in, your hosting provider's `object-cache.php`, etc.). Unfamiliar content = compromise indicator.

Also check: any custom code in `WP_CONTENT_DIR` referenced by an explicit `require` in `wp-config.php`.

## 13. Plugin / theme update files left around

Some compromises arrive via a fake "update" — attacker drops a file that pretends to be an update payload. Check:

- `wp-content/upgrade/` — should be empty most of the time. If files persist there, may have been used to deliver malware.
- Plugin / theme backup directories (`.bak`, `.old`) — often left intentionally by an attacker as fallback access.

---

## Backdoor persistence checklist

After cleanup, before declaring victory, verify the following are clean:

- [ ] `wp-content/mu-plugins/` — empty or contains only files you put there
- [ ] `wp-config.php` — reconstructed from scratch, not the post-compromise version
- [ ] `wp_options` autoloaded rows — no eval / base64 / gzinflate patterns
- [ ] Active theme — fresh reinstall or diff-clean against source
- [ ] All `.htaccess` files — only standard WP rewrite rules + your intentional rules
- [ ] Scheduled cron events — only those matching known plugins
- [ ] `wp-content/plugins/` — only directories for plugins you intentionally installed
- [ ] `wp_users` and `wp_usermeta` — only known admins
- [ ] `wp-content/uploads/` — no `.php`, `.phtml`, `.phar`, `.htaccess`, etc.
- [ ] Drop-in files in `wp-content/` (e.g. `object-cache.php`, `advanced-cache.php`, `db.php`) — only those you intentionally added or that came from a known caching/optimization plugin
- [ ] Root `index.php` — matches stock WP

If any one of these isn't clean, the cleanup isn't done.
