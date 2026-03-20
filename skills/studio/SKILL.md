---
name: "studio"
description: "WordPress Studio development environment: site creation, WP-CLI, plugin/theme development, SQLite databases, Playwright E2E testing, Xdebug, and resolving environmental conflicts (port collisions, stale DNS, conflicting PHP/WP-CLI configs). Use when working in WordPress Studio or troubleshooting Studio site issues."
---

# WordPress Studio

## Scope

- Use this skill when developing in WordPress Studio (Automattic).
- Covers site creation, WP-CLI access, plugin/theme development, database access, E2E testing, and debugging.
- Includes defensive checks for environmental conflicts caused by other tools occupying ports, writing `/etc/hosts` entries, or installing global PHP/WP-CLI configs.
- For WP-CLI command reference, combine with `wp-wpcli-and-ops`.
- For Playground-based workflows, defer to `wp-playground`.
- For environments that also run Local by Flywheel, see `local-studio-env` for cross-environment workflows.

## Site Management

- Studio manages sites in `~/Library/Application Support/com.wordpress.studio/` (macOS).
- Each site gets its own PHP runtime and SQLite database by default.
- Sites are accessible at `http://localhost:<port>` — Studio assigns ports automatically (typically 8881+).
- Custom `.test` domains are not used by default; Studio relies on `localhost` with port isolation.

### Creating Sites

Use the Studio app GUI or:

```bash
# List existing Studio sites
ls ~/Library/Application\ Support/com.wordpress.studio/
```

Each site directory contains a full WordPress installation with `wp-content/`, `wp-config.php`, and Studio's bundled PHP.

## WP-CLI Access

Studio bundles its own PHP and WP-CLI. Do not rely on a system or globally-installed WP-CLI.

```bash
# Use Studio's bundled WP-CLI
/Applications/WordPress\ Studio.app/Contents/Resources/wp-cli.phar \
    --path=/path/to/studio-site

# Or use Studio's built-in terminal (preferred — automatically sets the right PHP and path)
```

### Conflict: Wrong PHP version or WP-CLI config

If `wp` commands return unexpected PHP versions or connect to wrong databases:

1. Check for a global WP-CLI config overriding Studio's settings:
   ```bash
   cat ~/.wp-cli/config.yml 2>/dev/null
   ```
   If this file exists and sets `path:` or `php:`, it will shadow Studio's bundled PHP. Either remove conflicting entries or use `--path=` and Studio's explicit binary to override.

2. Check which PHP binary is being used:
   ```bash
   which php
   php -v
   ```
   If this isn't Studio's PHP, another tool installed a global PHP that takes precedence on `$PATH`.

## Plugin and Theme Development

Symlink your development plugin or theme into the Studio site:

```bash
ln -s /path/to/your-plugin \
    ~/Library/Application\ Support/com.wordpress.studio/site-name/wp-content/plugins/your-plugin
```

Changes in your repo appear immediately in the site — no copy step needed.

### Verifying the Symlink

```bash
# Confirm it resolved correctly
ls -la ~/Library/Application\ Support/com.wordpress.studio/site-name/wp-content/plugins/your-plugin

# Activate via WP-CLI
/Applications/WordPress\ Studio.app/Contents/Resources/wp-cli.phar \
    --path=~/Library/Application\ Support/com.wordpress.studio/site-name \
    plugin activate your-plugin
```

## Database Access

Studio uses SQLite by default. The database file is at:

```
~/Library/Application Support/com.wordpress.studio/site-name/wp-content/database/.ht.sqlite
```

To inspect:

```bash
sqlite3 ~/Library/Application\ Support/com.wordpress.studio/site-name/wp-content/database/.ht.sqlite
```

```sql
-- List tables
.tables

-- Check options
SELECT option_name, option_value FROM wp_options WHERE option_name IN ('siteurl', 'home', 'blogname');
```

### Conflict: MySQL processes blocking port 3306

If another tool left a MySQL process running on port 3306, Studio's SQLite won't be affected directly. But plugins that hardcode MySQL assumptions may fail. Check:

```bash
lsof -i :3306
```

If a rogue MySQL process is running, stop it:

```bash
# Find and stop the process
kill $(lsof -t -i :3306)
```

## Port Conflicts

Studio assigns `localhost` ports automatically. When a port is already occupied:

### Diagnosis

```bash
# Check what's using common ports
lsof -i :80
lsof -i :443
lsof -i :8881
lsof -i :8882
```

### Common Conflict Sources

- **Web servers** (nginx, Apache, Caddy) installed by other tools or Homebrew
- **DNS routing daemons** that write `/etc/hosts` entries claiming `.local` or `.test` domains
- **Container runtimes** (Docker Desktop) binding to low ports
- **Other dev environment tools** whose background processes persist after the app is closed — check Activity Monitor or:
  ```bash
  # Find persistent background processes on common dev ports
  for port in 80 443 3306 8080 8443 8881 8882; do
      pid=$(lsof -t -i :$port 2>/dev/null)
      if [ -n "$pid" ]; then
          echo "Port $port: PID $pid — $(ps -p $pid -o comm= 2>/dev/null)"
      fi
  done
  ```

### Resolution

1. Stop the conflicting process, or
2. Restart Studio — it will find the next available port, or
3. If a tool wrote `/etc/hosts` entries that interfere with `localhost` resolution:
   ```bash
   grep -v "^#" /etc/hosts | grep -i "localhost\|\.local\|\.test"
   ```
   Remove stale entries that another tool left behind (requires `sudo`).

## E2E Testing with Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
    use: {
        baseURL: 'http://localhost:8881', // Match your Studio site's port
    },
    webServer: {
        // Studio manages the server — no command needed
        // Just ensure the site is running in Studio before tests
        url: 'http://localhost:8881',
        reuseExistingServer: true,
    },
});
```

### Pre-flight Check

Before running tests, verify Studio is serving:

```bash
curl -sI http://localhost:8881 | head -5
```

If this fails, open Studio and start the site.

### wp-env Alternative for CI

For CI-reproducible environments where Studio isn't available:

```bash
npx wp-env start
npx playwright test
npx wp-env stop
```

`wp-env` uses Docker and provides consistent environments across developers and CI. Studio is for local development; `wp-env` is for reproducibility.

## Xdebug

Studio bundles its own PHP. Xdebug configuration must target Studio's PHP, not a system PHP.

### Check Xdebug Status

```bash
# Using Studio's PHP
/Applications/WordPress\ Studio.app/Contents/Resources/php -m | grep xdebug

# Check configuration
/Applications/WordPress\ Studio.app/Contents/Resources/php -i | grep xdebug
```

### Conflict: Global php.ini Xdebug Settings

If another tool installed Xdebug system-wide and configured it in a global `php.ini`, Studio's PHP may pick up conflicting settings. Check:

```bash
# Find which ini files Studio's PHP is loading
/Applications/WordPress\ Studio.app/Contents/Resources/php --ini
```

If extra `.ini` files from `/usr/local/etc/php/` or Homebrew paths appear, they may override Studio's intended configuration. Studio's PHP should only load its own bundled config.

### IDE Configuration

Configure your IDE (VS Code, PhpStorm) to listen on port 9003 and set path mappings:

| IDE path | Server path |
|---|---|
| `/path/to/your-plugin` | `/path/to/studio-site/wp-content/plugins/your-plugin` |

For symlinked plugins, the path mapping must use the **symlink target** (your repo), not the symlink itself.

## Troubleshooting Checklist

When a Studio site isn't working:

1. **Site not loading** — Is Studio running? Is the site started? Check `curl -sI http://localhost:<port>`.
2. **Wrong content** — Verify you're hitting the right port. Check `wp option get siteurl`.
3. **Plugin not appearing** — Verify symlink resolves: `ls -la wp-content/plugins/your-plugin`.
4. **WP-CLI wrong output** — Check for global `~/.wp-cli/config.yml` conflicts. Use Studio's bundled WP-CLI explicitly.
5. **Port occupied** — Run the port scan from the Port Conflicts section above.
6. **DNS oddity** — Check `/etc/hosts` for stale entries from other tools.
7. **Xdebug not connecting** — Verify Studio's PHP has Xdebug loaded, not a different PHP binary.

## Done Criteria

- Studio site accessible at `http://localhost:<port>` and serving correct content.
- Plugin/theme symlinked and activated without errors.
- WP-CLI commands work using Studio's bundled binary.
- SQLite database accessible and queryable.
- No port conflicts with other services.
- E2E tests run against the Studio site with correct baseURL.
- No stale `/etc/hosts` entries or global configs interfering with Studio's operation.
