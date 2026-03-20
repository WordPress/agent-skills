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

- Studio manages sites in `~/Library/Application Support/com.wordpress.studio/` (macOS).
- Each site has its own PHP runtime and SQLite or MySQL database.
- Sites are accessible at `localhost:<port>` or custom `.test` domains.

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

- Sites stored in `~/Local Sites/` by default.
- Each site has independent PHP version, web server (nginx/Apache), and MySQL.
- Access via `sitename.local` domain with Local's DNS routing.

### MySQL Access

```bash
# Local provides MySQL socket access
mysql -u root -proot -S /path/to/site/run/mysql/mysqld.sock
```

Or use the Local app's "Database" tab to open Adminer/TablePlus.

### WP-CLI in Local

Use Local's "Open Site Shell" or configure your shell:

```bash
# Add to your test scripts
export WP_TESTS_DB_HOST="localhost:/Users/username/Local Sites/sitename/run/mysql/mysqld.sock"
export WP_TESTS_DB_USER="root"
export WP_TESTS_DB_PASSWORD="root"
```

### Plugin Syncing

For PHPUnit integration tests against a Local site:

```bash
# Install WP test suite pointing to Local's MySQL
bash bin/install-wp-tests.sh wordpress_test root root "localhost:/path/to/mysqld.sock"
```

## Port Conflicts

When Studio and Local run simultaneously, or when other services occupy ports:

- Check port usage: `lsof -i :80` / `lsof -i :443` / `lsof -i :3306`
- Studio typically uses high ports (e.g., 8881+).
- Local uses ports configured per-site.
- Resolve by stopping conflicting services or changing port assignments.

## SSL Certificates

### Local
Local generates trusted SSL certs automatically. If browser shows warnings:
- Trust Local's CA certificate in Keychain Access (macOS).
- Or use `--ignore-https-errors` in Playwright tests.

### Studio
Studio sites default to HTTP. For HTTPS testing, use a reverse proxy or Playground.

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
