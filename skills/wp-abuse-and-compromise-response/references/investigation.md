# Investigation — detailed commands and queries

Extension of step 3 in [SKILL.md](../SKILL.md). When the cheap checks turn up something, dig deeper here.

## File-system investigation

### Find recently modified PHP files

```bash
# Modified in the last 30 days under WP core (should match release timestamps only)
find wp-admin wp-includes -name "*.php" -mtime -30 -ls

# Modified in the last 7 days site-wide
find . -name "*.php" -mtime -7 -ls

# Suspiciously small PHP files (web shells are often tiny)
find . -name "*.php" -size -1k -mtime -90 -ls
```

### Find files that shouldn't exist where they are

```bash
# .php in uploads (NEVER legitimate)
find wp-content/uploads -name "*.php" -o -name "*.phtml" -o -name "*.phar"

# .htaccess in uploads (rare to be legitimate; usually attacker bypass)
find wp-content/uploads -name ".htaccess"

# Files with no extension that contain PHP
find . -type f ! -name "*.*" -exec grep -l "<?php" {} \;
```

### Grep for known malware patterns

```bash
# Obfuscated payload signatures
grep -rl "eval(gzinflate(base64_decode" . 2>/dev/null
grep -rl "eval(base64_decode" . 2>/dev/null
grep -rl "preg_replace.*\/e.*base64" . 2>/dev/null   # legacy /e modifier RCE

# Web shell signatures
grep -rl "eval(\$_POST\|eval(\$_GET\|eval(\$_REQUEST" .
grep -rl "assert(\$_POST\|assert(\$_GET\|assert(\$_REQUEST" .
grep -rl "system(\$_\|shell_exec(\$_\|passthru(\$_\|exec(\$_" .

# Known malware-family file names
find . -name "wp-vcd.php" -o -name "wp-tmp.php" -o -name "wp-feed.php"
find . -iname "c99.php" -o -iname "r57.php" -o -iname "wso.php" -o -iname "b374k.php"
```

### Find plugin directories not from the .org repo

```bash
# Plugins that exist locally but aren't tracked by WP-CLI's plugin list
wp plugin list --format=csv | tail -n +2 | cut -d, -f1 > /tmp/known-plugins.txt
ls wp-content/plugins/ | sort > /tmp/dir-plugins.txt
diff /tmp/known-plugins.txt /tmp/dir-plugins.txt
```

## Database investigation

### Recently created users

```sql
SELECT ID, user_login, user_email, user_registered, user_status
FROM wp_users
ORDER BY user_registered DESC
LIMIT 30;
```

Look for:
- Recent additions you don't recognize
- Emails on unusual domains (gmail/yandex/protonmail are common in compromises; corporate emails are not)
- High `ID` values clustered together (often a sign of bulk-added users)
- `user_login` patterns like `admin1`, `adminer`, `wp_admin`, single-letter handles

### Hidden admin users

Some compromises add admin capabilities via `wp_usermeta` rather than the role column:

```sql
SELECT u.ID, u.user_login, u.user_email, um.meta_value
FROM wp_users u
JOIN wp_usermeta um ON u.ID = um.user_id
WHERE um.meta_key = 'wp_capabilities'
  AND um.meta_value LIKE '%administrator%';
```

### Autoloaded options carrying malicious payloads

```sql
SELECT option_id, option_name, LEFT(option_value, 300) AS preview, autoload
FROM wp_options
WHERE autoload = 'yes'
  AND (option_value LIKE '%eval(%'
       OR option_value LIKE '%base64_decode%'
       OR option_value LIKE '%gzinflate%'
       OR option_value LIKE '%<script%'
       OR option_value LIKE '%<iframe%');
```

### Look for suspicious cron events

```sql
SELECT option_value
FROM wp_options
WHERE option_name = 'cron';
```

Parse the result (it's a PHP-serialized array). Or via WP-CLI:

```bash
wp cron event list
```

Suspicious entries:
- Hook names that don't match any known plugin or theme
- Events scheduled to fire very frequently (every minute, every 5 minutes)
- Events with `next_run_gmt` far in the future (sleeper jobs)

### Posts with injected content

```sql
-- Posts with script tags (frequently injected)
SELECT ID, post_title, post_modified, LEFT(post_content, 200)
FROM wp_posts
WHERE post_status IN ('publish', 'draft')
  AND (post_content LIKE '%<script%'
       OR post_content LIKE '%<iframe%'
       OR post_content LIKE '%base64%');

-- Posts modified in bulk recently (sign of an injection sweep)
SELECT DATE(post_modified) AS day, COUNT(*) AS modified_count
FROM wp_posts
GROUP BY day
ORDER BY day DESC
LIMIT 30;
```

A sudden spike in modified posts on a single day usually indicates an injection sweep.

### Unfamiliar tables

```sql
SHOW TABLES;
```

Stock WordPress (single-site) has 12 tables: `wp_commentmeta`, `wp_comments`, `wp_links`, `wp_options`, `wp_postmeta`, `wp_posts`, `wp_term_relationships`, `wp_term_taxonomy`, `wp_termmeta`, `wp_terms`, `wp_usermeta`, `wp_users`.

Plugins add their own tables — most legitimate ones use clearly-named prefixes (e.g. `wp_woocommerce_*`, `wp_yoast_*`). Unknown tables with generic names like `wp_data`, `wp_log`, `wp_temp` deserve scrutiny.

## Log investigation

### Brute-force / credential-stuffing patterns

In access logs:
```
grep "POST .*wp-login.php" access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

Many POSTs from a single IP = brute force attempt. Many POSTs from many IPs in a short window = credential-stuffing or distributed brute force.

### XML-RPC abuse

```
grep "xmlrpc.php" access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

`xmlrpc.php` is often abused for:
- Amplified brute force (one request tries many credentials via `system.multicall`)
- Pingback DDoS (the site is used as a reflector to attack others)

If you see traffic to it and don't use XML-RPC, disable it.

### Suspicious GET patterns

```
grep "uploads/.*\.php" access.log
grep "wp-content/.*\.php?.*=.*base64" access.log
```

Either pattern is a strong signal — visitors should not be requesting PHP files from `uploads/`, and base64-looking query parameters are a backdoor invocation pattern.

### Error log signals

Recent PHP errors with stack traces pointing to unusual files (`/tmp/`, weird `wp-content` paths) often reveal where backdoors live:

```
tail -1000 error.log | grep -i "fatal\|parse error" | head -50
```

## File integrity — depth check

The cheap `wp core verify-checksums` only catches files that should exist but have been modified. It does not catch:

- Files added to core directories that shouldn't be there
- Plugin/theme files for plugins NOT in the .org repo (premium / custom)
- Modifications to `wp-config.php` (intentionally not checksummed)

For deeper checks:

```bash
# Compare your wp-admin and wp-includes against a fresh download
mkdir /tmp/clean-wp && cd /tmp/clean-wp
wp core download
diff -rq /tmp/clean-wp/wordpress/wp-admin /path/to/site/wp-admin | head -50
diff -rq /tmp/clean-wp/wordpress/wp-includes /path/to/site/wp-includes | head -50
```

Any "Only in /path/to/site/..." line is a file present in the live install but not in clean core — strong signal.

## When investigation hits a wall

If after running everything above you can't find the compromise mechanism:

1. **Compromise may be at the host level** — server-wide malware, SSH key compromise, control panel breach. Contact the host.
2. **Compromise may be in a custom plugin/theme you've already cleared.** Re-audit those by hand, line by line.
3. **Compromise may live in `mu-plugins/`** which is easy to miss. See [common-injection-points.md](common-injection-points.md) §1.
4. **Compromise may be in scheduled tasks at the OS level**, not WP cron. Check `crontab -l` and `/etc/cron.*/` if you have shell access.
5. **Bring in an external scanner** (Sucuri SiteCheck, Wordfence, MalCare) to compare findings — they catch some things heuristic scans miss.
