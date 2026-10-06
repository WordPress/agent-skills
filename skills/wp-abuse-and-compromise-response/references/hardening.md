# Post-cleanup hardening checklist

Extension of step 7 in [SKILL.md](../SKILL.md). Run through this after a compromise has been cleaned and verified. Goal: make the same kind of attack much harder next time.

Ordered roughly by impact-per-effort.

## 1. Identity and access

### Two-factor authentication for every admin

Non-negotiable. Most WP compromises start with a credential compromise (phishing, reuse from another breach, brute force). 2FA blocks all of those.

Options:
- Built-in via plugin (Wordfence Login Security, miniOrange 2FA, Two-Factor)
- Application-level (Authy / Authenticator)
- Hardware (YubiKey / WebAuthn) — best, but requires plugin support

### Strong unique passwords

For all users, not just admins. Subscribers/customers with weak passwords can be elevated via a privilege-escalation bug; defense in depth.

### Remove unused accounts

Every former employee, every test account, every "just in case" account. Audit `wp user list` quarterly.

### Rename default `admin` username

If the site still uses `admin`, half the brute-force attempts succeed at the username step before even trying passwords.

```sql
UPDATE wp_users SET user_login='your-new-name' WHERE user_login='admin';
```

(Or do this via WP admin UI by creating a new admin, then deleting the old one.)

## 2. Login surface reduction

### Limit login attempts

Block IPs after N failed attempts. Options:
- Plugin: Limit Login Attempts Reloaded, Wordfence
- Host-level: fail2ban with a WordPress filter
- WAF level: Cloudflare rate-limiting rules on `/wp-login.php` and `/xmlrpc.php`

### Disable XML-RPC if unused

XML-RPC was historically used by mobile apps and pingbacks. Most modern sites don't need it. It's a common amplification target for brute force and pingback DDoS.

Disable by adding to a mu-plugin or theme `functions.php`:

```php
add_filter( 'xmlrpc_enabled', '__return_false' );
```

Or block at the web-server level (`.htaccess` or nginx).

### Hide WP version

Not a real defense, but reduces noise from automated scanners targeting specific WP versions. Remove the generator meta tag and version query strings.

### Custom login URL (optional)

Plugins like WPS Hide Login move `wp-login.php` to a custom path. **Security-through-obscurity** — not a real defense against a targeted attacker, but blocks automated bots that hit `/wp-login.php` directly. Lower priority than rate limiting.

## 3. File-system hardening

### Disable file editing in admin

Stops a compromised admin account from being used to modify theme/plugin files via the WP admin UI.

```php
// In wp-config.php
define( 'DISALLOW_FILE_EDIT', true );
define( 'DISALLOW_FILE_MODS', true );  // also stops plugin/theme installs from admin
```

`DISALLOW_FILE_MODS` is stricter — use only if you do plugin updates via WP-CLI or deployment.

### Disable PHP execution in uploads

PHP files should never execute from `wp-content/uploads/`. Add this `.htaccess` inside `wp-content/uploads/`:

```apache
# Apache 2.4+ syntax
<FilesMatch "\.(php|phtml|phar|php3|php4|php5|php7|pht)$">
  Require all denied
</FilesMatch>
```

(The older `Order Deny,Allow` / `Deny from all` syntax from `mod_access_compat` is deprecated since Apache 2.4 and silently does nothing on servers without the compat module loaded.)

For nginx (in server block):

```nginx
location ~* /wp-content/uploads/.*\.(php|phtml|phar)$ {
    deny all;
}
```

### File permissions

Standard recommended permissions:
- Files: 644 (`-rw-r--r--`)
- Directories: 755 (`drwxr-xr-x`)
- `wp-config.php`: 440 (`-r--r-----`) or 400 (`-r--------`) — see note below

Recursive set:

```bash
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod 440 wp-config.php
```

Per the [WordPress.org hardening guide](https://developer.wordpress.org/advanced-administration/security/hardening/), `wp-config.php` should be **400 or 440** (read-only by owner, optionally by group). Some hosting setups require 440 so the web server's group can read; use 400 where 440 isn't required.

### Disable directory listings

```
# Apache .htaccess
Options -Indexes
```

```nginx
# nginx
autoindex off;
```

### Restrict the WordPress database user's privileges (with a real caveat)

Per the [WordPress.org hardening guide](https://developer.wordpress.org/advanced-administration/security/hardening/), one model is: a restricted runtime DB user (SELECT/INSERT/UPDATE/DELETE only) for day-to-day operation, plus a privileged admin DB user used only for upgrades. A compromise that gets DB access via the runtime user then cannot `DROP TABLE` or create new ones.

```sql
-- Restricted runtime user
GRANT SELECT, INSERT, UPDATE, DELETE ON wp_database.* TO 'wp_runtime'@'localhost';
-- Privileged user, used only for core/plugin/theme installs and upgrades
GRANT ALL PRIVILEGES ON wp_database.* TO 'wp_admin'@'localhost';
```

**Important caveat:** many WordPress plugins call `dbDelta()` to create or alter tables not only at activation but also during routine operation (cache invalidation, schema migrations on plugin update, on-demand table creation, etc.). Running long-term under a `SELECT/INSERT/UPDATE/DELETE`-only user will silently break those plugins — often with subtle errors that are hard to diagnose.

If you adopt this model:
- Test thoroughly on a staging copy first with every plugin you actually use.
- Watch error logs for `CREATE TABLE` / `ALTER TABLE` failures after plugin updates.
- Be ready to grant `CREATE`/`ALTER`/`INDEX` temporarily when a plugin needs schema work.

The cleaner alternative for most sites: use the standard WP DB user with full privileges on its own database, and instead invest in keeping the runtime *environment* secure (file permissions, WAF, 2FA, vuln scanning).

### HTTP basic auth in front of `/wp-admin/`

Adds a server-level credential prompt before the WordPress login page even loads. Stops most automated bots from reaching `wp-login.php` and brute-forcing it. Per the [WordPress.org hardening guide](https://developer.wordpress.org/advanced-administration/security/hardening/).

Apache example:

```
# .htaccess in /wp-admin/
AuthType Basic
AuthName "Restricted Admin"
AuthUserFile /path/outside/web-root/.htpasswd
Require valid-user
```

Generate `.htpasswd` with `htpasswd -c /path/outside/web-root/.htpasswd <username>`. Store the file outside the web root.

For `wp-login.php` (which isn't inside `/wp-admin/`), use `<Files wp-login.php>` directives. AJAX needs to remain reachable, so exempt `admin-ajax.php`.

## 4. Plugin and theme discipline

### Audit and remove

For each installed plugin and theme:
- Do you actually use it?
- Is it still maintained? (Last update within 12 months on .org)
- Does it come from a trusted source? (No "nulled" / pirated plugins — major WP-VCD vector)

Remove anything that fails. Deactivated plugins still get loaded for admin pages; uninstall completely.

### Keep updated

Auto-updates for minor releases of core, plugins, and themes are reasonable. Major core updates should be tested on staging first.

### Vulnerability scanning — ongoing

A patched install is a much smaller attack surface than an unpatched one. Three things to set up:

**1. Subscribe to a vulnerability feed** so you hear about new CVEs against your installed plugins/themes/core within hours, not weeks:

| Source | Cost | Notes |
|---|---|---|
| [Patchstack](https://patchstack.com/) | Free + paid | WordPress-focused database; free tier includes alerts |
| [WPScan](https://wpscan.com/) | Free tier (25 API requests/day) + paid | Used by `wp-cli-vulnerability-scanner` plugin |
| [Wordfence Intelligence](https://www.wordfence.com/threat-intel/) | Free | Public CVE feed; daily updates |
| [wpvulnerability.com](https://www.wpvulnerability.com/) | Free, no API key | Community aggregator of WPScan/Patchstack/WP.org sources |

**2. Run an automated weekly scan** of installed components against your chosen feed:

```bash
# Using the detect script from this skill (queries wpvulnerability.com)
node skills/wp-abuse-and-compromise-response/scripts/detect_compromise_signals.mjs --check-vulns

# Or use a security plugin's built-in scanner
wp wordfence scan          # if Wordfence is installed
```

Cron this from real server cron (not WP cron) so it runs even if WP itself is misbehaving. Alert on any non-empty result.

**3. Patch promptly.** A CVE is worthless to an attacker once the version is patched. The window between disclosure and exploitation is now measured in hours for popular plugins.

### Premium plugin verification

For premium plugins (non-.org repo), verify the source. Download only from the vendor's official site. Confirm the file hash if the vendor publishes one.

### Plugin family discipline

If a plugin vendor has had a confirmed supply-chain compromise, audit all of their plugins on your sites. Compromised vendors often distribute interconnected plugin families — one compromise can be a window into all of them.

## 5. Server / hosting

### HTTPS everywhere

Force HTTPS site-wide. Use HSTS for visitor browsers:

```
# .htaccess
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

### PHP version

Run a supported PHP version (currently 8.1+; minimum acceptable is whatever has security support — check https://www.php.net/supported-versions.php).

### Disable dangerous PHP functions

If your host allows custom `php.ini` or `.user.ini`, disable functions WP doesn't legitimately need:

```ini
disable_functions = exec,passthru,shell_exec,system,proc_open,popen,show_source
```

Caveats — DO NOT blindly include these even though some hardening guides list them:
- `curl_multi_exec` — used by legitimate plugins that fetch from multiple URLs in parallel (page builders, analytics, social integrations).
- `parse_ini_file` — used by some plugins for config loading.
- `exec` / `shell_exec` — some plugins legitimately need these (ImageMagick wrappers, backup plugins that shell out to `mysqldump`).

Test on staging first. The list above is a reasonable default but should be tuned to your actual plugin set.

### Web Application Firewall

A WAF in front of the site blocks many attacks before they reach PHP. Options:
- Cloudflare (free tier acceptable for basic)
- Sucuri Firewall
- Wordfence Premium (PHP-level, not cloud, but still blocks at the WP request level)

### Disable PHP execution in writable directories beyond uploads

Anywhere users can write should not execute PHP:
- `wp-content/cache/` (most caching plugins)
- `wp-content/backups/` (backup plugins)
- Any plugin's own `cache/` or `tmp/` directory

Same `.htaccess` pattern as uploads.

## 6. Backups and monitoring

### Automated offsite backups

- Frequency: daily for content-changing sites, less for static
- Storage: offsite (different provider from hosting). On-host backups don't survive host-level compromise.
- Tested: restore one to a staging environment quarterly. Untested backups are not backups.

### File integrity monitoring

Run `wp core verify-checksums` and `wp plugin verify-checksums` in a real cron job (server cron, not WP cron). Alert on any flag.

```bash
# /etc/cron.d/wp-integrity (example)
0 3 * * * /var/www/site && wp core verify-checksums && wp plugin verify-checksums --all
```

### External uptime + content monitoring

Tools that fetch the site from outside and alert on:
- Downtime
- Unexpected redirects
- Content changes
- Safe Browsing flags

Examples: UptimeRobot (basic), Sucuri, MalCare, custom Pingdom/StatusCake setups.

## 7. Application-level defenses

### Disable user enumeration

Knowing valid usernames helps targeted brute force. WP exposes them via:
- `/?author=N` redirect to author pages
- REST API `/wp-json/wp/v2/users`

Both can be disabled at the firewall / plugin level if user enumeration is a concern.

### Disable / restrict REST API endpoints

If you don't use the REST API publicly, restrict it to authenticated users. Many plugins enable endpoints by default that leak data.

### Use a strong DB table prefix

Default is `wp_`. A non-default prefix doesn't stop a determined attacker (it's queryable), but it stops some opportunistic SQL injection payloads that hardcode `wp_options`. Set at install; changing later is involved.

### Disable comments if unused

The comment system is the entry point for many spam and XSS attacks. If your site doesn't use comments, disable them site-wide:

```php
add_filter( 'comments_open', '__return_false', 20, 2 );
add_filter( 'pings_open', '__return_false', 20, 2 );
```

## 8. Recovery preparedness

After cleanup, your future self will thank you for:

- Documented current state (active plugin list, theme, custom code locations)
- Repository (or at least zip) of every custom plugin and theme
- Documented credential rotation procedure (who has access to what, how to revoke)
- One-page incident response runbook stored outside the site
- Contact details for the host's abuse team

The first hour of an incident is much easier when you don't have to look up basics.

---

## Minimum acceptable post-compromise hardening

If only a subset is feasible, do at least:

1. 2FA for every admin
2. Strong unique passwords for every user
3. Login attempt limit (plugin or fail2ban)
4. `DISALLOW_FILE_EDIT` in `wp-config.php`
5. PHP execution denied in `wp-content/uploads/`
6. Updated core + plugins + themes; removed unused
7. Automated offsite backups, tested

That's the floor. Everything else is improvement.
