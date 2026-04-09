---
name: wp-env
description: "Use when setting up, configuring, or troubleshooting local WordPress development environments with @wordpress/env (wp-env). Triggers on mentions of wp-env, local WordPress development, Docker-based WordPress, or requests to start/stop/configure a local WordPress instance."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Requires Docker and Node.js 18.12+."
---

# @wordpress/env (wp-env)

Zero-config, Docker-based local WordPress development environment for plugins, themes, and core.

## When to use

- User asks to set up a local WordPress development environment
- Project contains a `.wp-env.json` file
- User mentions `wp-env`, `@wordpress/env`, or Docker-based WordPress development
- User wants to run WP-CLI commands, PHPUnit tests, or debug with Xdebug locally
- Triage detects a plugin or theme project that needs a local WordPress instance

**wp-env or wp-playground?** For a quick local WordPress, prefer the **wp-playground** skill by default — it's faster, disposable, and needs no Docker. Use **wp-env** when the task actually requires it:

- the repo already contains a `.wp-env.json`
- a real MySQL database is needed (PHPUnit against the DB, `wp db` commands, data that survives restarts)
- arbitrary commands must run inside the environment (shell access, Composer, full WP-CLI via `wp-env run`)
- this is a WordPress core or Gutenberg checkout
- the user explicitly asks for wp-env or Docker

## Inputs required

1. **Docker status** -- verify Docker is installed and running: `docker info`
2. **Node.js version** -- must be >= 18.12.0: `node -v`
3. **Project type** -- plugin, theme, or full site (check for `.wp-env.json`, plugin headers, or `style.css` theme headers)
4. **Existing config** -- read `.wp-env.json` and `.wp-env.override.json` if present

## Procedure

### 1. Install wp-env

```sh
# Global (recommended)
npm -g install @wordpress/env

# Or project-local
npm i @wordpress/env --save-dev
# Then use: npx wp-env start
```

### 2. Start the environment

```sh
wp-env start
```

Default credentials:
- **URL:** http://localhost:8888/wp-admin/
- **Username:** `admin`
- **Password:** `password`

Common start options:
- `wp-env start --update` -- pull latest sources and reconfigure
- `wp-env start --xdebug` -- enable Xdebug (debug mode)
- `wp-env start --xdebug=profile,trace` -- multiple Xdebug modes
- `wp-env start --auto-port` -- find available ports when defaults are busy

### 3. Auto-detection (no config file)

When no `.wp-env.json` exists, wp-env scans the current directory:

| Detected type | How detected | Auto-config |
|--------------|-------------|-------------|
| Plugin | `Plugin Name:` header in a root `.php` file | `{ "plugins": ["."] }` |
| Theme | `Theme Name:` header in `style.css` | `{ "themes": ["."] }` |
| Core | `wp-includes/version.php` exists | `{ "core": "." }` |

### 4. Configure with `.wp-env.json`

Place at the project root. All fields are optional.

```json
{
  "core": null,
  "phpVersion": "8.1",
  "plugins": [
    ".",
    "https://downloads.wordpress.org/plugin/akismet.zip",
    "WordPress/classic-editor"
  ],
  "themes": [],
  "port": 8888,
  "multisite": false,
  "phpmyadmin": false,
  "config": {
    "WP_DEBUG": true,
    "SCRIPT_DEBUG": true
  },
  "mappings": {
    "wp-content/mu-plugins": "./mu-plugins"
  },
  "lifecycleScripts": {
    "afterStart": "wp-env run cli wp rewrite structure /%postname%/"
  }
}
```

#### Source string formats (for `core`, `plugins`, `themes`, `mappings`)

| Format | Example |
|--------|---------|
| Local path | `"."`, `"./path"`, `"../path"` |
| GitHub shorthand | `"WordPress/classic-editor"`, `"owner/repo#branch"` |
| ZIP URL | `"https://downloads.wordpress.org/plugin/akismet.zip"` |
| Git SSH | `"ssh://user@host/repo.git#ref"` |

**GOTCHA:** WordPress.org plugin/theme slugs (bare names like `"akismet"`) do NOT work. Use the full ZIP URL.

#### Local overrides with `.wp-env.override.json`

Create `.wp-env.override.json` next to `.wp-env.json` for personal settings (gitignored). Only `config` and `mappings` are **merged** -- all other fields (including `plugins` and `themes` arrays) **fully replace** the base.

### 5. Run commands in containers

```sh
# WP-CLI commands
wp-env run cli wp user list
wp-env run cli wp plugin list
wp-env run cli wp option update blogname "My Site"
wp-env run cli "wp rewrite structure /%postname%/"

# Run commands in a specific directory
wp-env run cli --env-cwd=wp-content/plugins/my-plugin composer install

# PHPUnit tests
wp-env run cli --env-cwd=wp-content/plugins/my-plugin vendor/bin/phpunit

# Pass flags with -- separator
wp-env run cli php -- --version

# MySQL access
wp-env run mysql mysql -- --user=root --password=password wordpress
```

Available containers: `mysql`, `wordpress`, `cli`, `composer`, `phpmyadmin`.

### 6. Manage the environment

```sh
wp-env stop                    # Stop and free ports
wp-env reset development       # Reset dev database (keeps test)
wp-env reset all               # Reset all databases
wp-env logs                    # Stream PHP/Docker logs
wp-env logs --no-watch         # Print logs and exit
wp-env status                  # Show URLs, ports, config
wp-env status --json           # Machine-readable status
wp-env cleanup                 # Remove containers/volumes (keep images)
wp-env destroy                 # Remove everything including images
```

### 7. Xdebug setup

```sh
wp-env start --xdebug          # Enable debug mode
wp-env start --xdebug=coverage # For code coverage
wp-env start                   # Disable Xdebug (restart without flag)
```

Modes: `debug`, `profile`, `trace`, `develop`, `coverage`.

IDE listens on port **9003**. VS Code `launch.json` needs:
```json
{
  "type": "php",
  "request": "launch",
  "name": "Listen for Xdebug",
  "port": 9003,
  "pathMappings": {
    "/var/www/html/wp-content/plugins/your-plugin": "${workspaceFolder}"
  }
}
```

### 8. Multisite

```json
{ "multisite": true, "plugins": ["."] }
```

## Verification

- [ ] `wp-env status` shows running containers with correct ports
- [ ] `http://localhost:8888/wp-admin/` loads the WordPress admin
- [ ] `wp-env run cli wp plugin list` shows expected plugins
- [ ] Plugin/theme under development appears in the WordPress admin
- [ ] Database resets work: `wp-env reset development`

## Failure modes / debugging

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Cannot connect to Docker daemon" | Docker not running | Start Docker Desktop |
| "Port 8888 already in use" | Port conflict | Use `--auto-port` or set custom `port` in `.wp-env.json` |
| Plugin not appearing | Missing `Plugin Name:` header in main PHP file | Add standard plugin header comment |
| "Could not find a valid source" | Invalid source string in config | Use full ZIP URL for wp.org plugins, not bare slugs |
| Stale environment after source changes | Cached Docker volumes | `wp-env start --update` or `wp-env destroy && wp-env start` |
| White screen / PHP errors | Corrupted database | `wp-env reset all && wp-env start` |
| Override not taking effect | Wrong merge behavior | `plugins`/`themes` in override **replace** base arrays; only `config`/`mappings` merge |
| Tests environment not accessible | Wrong port | Test environment runs on port 8889 by default |
| Xdebug not connecting | IDE not listening or wrong port | Ensure IDE listens on port 9003 with correct `pathMappings` |
| npm global install permission error | Node installed to a system path | Use `nvm`, or install locally: `npm i -D @wordpress/env` and run via `npx wp-env` |

## Escalation

- Docker issues beyond wp-env scope (networking, disk space, WSL2 backend)
- Custom Docker Compose configurations that conflict with wp-env
- CI/CD pipeline integration requiring non-standard Docker setups
- WordPress Playground runtime (`--runtime=playground`) is experimental and has limited feature parity

## References

- [Official documentation](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/)
- [Getting started guide](https://developer.wordpress.org/block-editor/getting-started/devenv/get-started-with-wp-env/)
- [Source code](https://github.com/WordPress/gutenberg/tree/trunk/packages/env)
