---
name: "local-studio-env"
description: "Manage WordPress Studio and Local by Flywheel development environments: site routing, port conflicts, plugin syncing, SSL certs, WP-CLI access, Mailpit, and Playwright E2E testing against local sites."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Requires WordPress Studio and/or Local by Flywheel on macOS. Some workflows require WP-CLI."
---

# Local & Studio Environments

## Scope

- Use this skill when setting up, configuring, or troubleshooting WordPress local development environments.
- Covers WordPress Studio (Automattic) and Local by Flywheel.
- Includes plugin/theme symlink workflows, WP-CLI access, database access, email testing, and E2E test integration.
- For WP-CLI command reference, combine with `wp-wpcli-and-ops`.
- For Playground-based workflows, defer to `wp-playground`.

## WordPress Studio

### Site Management

- Studio stores sites in `~/Studio/<site-name>/` (macOS).
- Configuration lives in `~/Library/Application Support/Studio/appdata-v1.json`.
- Each site has its own WASM PHP runtime and SQLite database.
- Sites are accessible at `http://localhost:<port>` (typically 8881+).
- `appdata-v1.json` is the source of truth — `customDomain`, `enableHttps`, and debug settings override wp-config.php and the database at the WASM bootstrap level.

### WP-CLI Access

Studio provides WP-CLI through its bundled PHP:

```bash
# Find Studio's WP-CLI path
/Applications/WordPress\ Studio.app/Contents/Resources/wp-cli.phar --path=/path/to/site
```

Or use Studio's built-in terminal for per-site WP-CLI access.

### Plugin/Theme Development

Symlink your plugin or theme into the Studio site:

```bash
ln -s /path/to/your/plugin /path/to/studio-site/wp-content/plugins/your-plugin
```

This allows live development — changes in your repo appear immediately in the site.

## Local by Flywheel

### Site Configuration

- Sites stored in `~/Local Environments/Local Sites/` by default (not `~/Local Sites/` — that may be a symlink).
- Each site has independent PHP version, web server (nginx), and MySQL.
- Access via `sitename.local` domain — Local writes `/etc/hosts` entries and runs nginx on ports 80/443 with auto-generated SSL certs.

### MySQL Access

Local's MySQL sockets are stored under random IDs in the app support directory, not under the site directory:

```bash
# Find all Local MySQL sockets
find ~/Library/Application\ Support/Local/run -name "mysqld.sock"
```

Each socket serves one site. To identify which is which, query each:

```bash
MYSQL="$HOME/Library/Application Support/Local/lightning-services/mysql-8.0.35+4/bin/darwin-arm64/bin/mysql"
for sock in ~/Library/Application\ Support/Local/run/*/mysql/mysqld.sock; do
    url=$("$MYSQL" -u root -proot -S "$sock" -N -e \
        "SELECT option_value FROM wp_options WHERE option_name='siteurl'" local 2>/dev/null)
    echo "$sock → $url"
done
```

Or use the Local app's "Database" tab to open Adminer/TablePlus.

### WP-CLI in Local

Use Local's "Open Site Shell" or configure your shell with the correct socket path:

```bash
# After identifying the socket for your site:
export WP_TESTS_DB_HOST="localhost:/Users/username/Library/Application Support/Local/run/<site-id>/mysql/mysqld.sock"
export WP_TESTS_DB_USER="root"
export WP_TESTS_DB_PASSWORD="root"
```

### PHPUnit Testing

Create a dedicated test database to avoid clobbering the live site:

```bash
"$MYSQL" -u root -proot -S "$SOCK" -e "CREATE DATABASE IF NOT EXISTS local_tests;"
```

Then configure `wp-tests-config.php` to use `local_tests` as the database name with the same socket path.

## Running Both Simultaneously

Studio and Local can run at the same time without port conflicts:

| Environment | Ports | Domain |
|---|---|---|
| Local (nginx) | 80, 443 | `sitename.local` (with SSL) |
| Studio (Express) | 8881+ | `localhost:<port>` (HTTP only) |

**The conflict is in custom domains, not ports.** Local's nginx on 80/443 intercepts any domain pointed at `127.0.0.1` via `/etc/hosts`. If Studio has a `customDomain` set and a hosts entry for it, the traffic goes to Local's nginx (which doesn't know that domain) instead of Studio's Express server on 8881.

### Rules for coexistence

1. **Studio uses `localhost:<port>` — no custom domain, no hosts entry.**
2. **Local uses `.local` domains with its own hosts entries and SSL.**
3. **Do not set `enableHttps: true` on Studio** while Local's nginx holds ports 80/443 — HTTPS redirects from Studio's WASM PHP will hit Local's nginx, not Studio.
4. If you need SSL on a Studio custom domain, stop Local's sites first so nginx releases 80/443.

### Port conflict diagnosis

```bash
lsof -i :80 -i :443 -i :8881 -sTCP:LISTEN -n -P
```

## SSL Certificates

### Local
Local generates trusted SSL certs automatically for each `.local` domain. If browser shows warnings:
- Trust Local's CA certificate in Keychain Access (macOS).
- Or use `--ignore-https-errors` in Playwright tests.
- Local stores certs under `~/Library/Application Support/Local/run/<site-id>/conf/nginx/certs/`.

### Studio
Studio on `localhost:<port>` is HTTP only. For HTTPS testing:
- Stop Local and set Studio's `customDomain` + `enableHttps: true` in appdata.
- Or use `wp-env` / Playground for HTTPS CI environments.

## Mailpit / Email Testing

Local includes Mailpit (previously MailHog) for email capture:
- Access at the port shown in Local's "Utilities" tab.
- All WordPress emails sent from the site are captured.
- Use for testing wp_mail, password resets, notification flows.

## E2E Testing with Playwright

### Against Local Sites

```typescript
// playwright.config.ts
export default defineConfig({
    use: {
        baseURL: 'https://sitename.local',
        ignoreHTTPSErrors: true,
    },
});
```

### Against Studio Sites

```typescript
export default defineConfig({
    use: {
        baseURL: 'http://localhost:8881',
    },
});
```

### wp-env Alternative

For CI-reproducible environments, prefer `@wordpress/env`:

```bash
npx wp-env start
npx playwright test
npx wp-env stop
```

`wp-env` uses Docker and provides consistent environments across developers and CI.

## Xdebug

### Local
Enable Xdebug from the site's PHP settings in the Local app. Configure your IDE to listen on port 9003.

### Studio
Studio bundles its own PHP. Xdebug configuration depends on Studio's PHP build. Check Studio's PHP ini:

```bash
php -i | grep xdebug
```

## Done Criteria

- Local development site accessible and serving the correct content.
- Plugin/theme symlinked and loading without errors.
- WP-CLI accessible for the target environment.
- Database accessible for test suite configuration.
- No port conflicts between environments.
- E2E tests run against the local site with correct baseURL.
