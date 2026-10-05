# WP-CLI doctor (`wp doctor`)

Use this for quick “production readiness” checks.

## Install (if missing)

Install the latest compatible stable release:

- `wp package install 'wp-cli/doctor-command:*@stable'`

This lets Composer choose the newest stable release compatible with your WP-CLI and other installed packages.
Omitting the constraint can select a development branch. Keep the quotes so the shell passes `*` unchanged.

Docs:

- Package installation and authentication: https://developer.wordpress.org/cli/commands/package/install/
- Composer version constraints: https://getcomposer.org/doc/articles/versions.md
- Default checks: https://make.wordpress.org/cli/handbook/doctor-default-checks/
- Customize checks: https://make.wordpress.org/cli/handbook/guides/doctor/doctor-customize-config/

## Recommended usage

- `wp doctor check`
- `wp doctor list` (to see available checks)

Especially relevant to performance:

- `autoload-options-size` (autoloaded options threshold)
- `constant-savequeries-falsy` / `constant-wp-debug-falsy` (avoid perf-costly debug flags in prod)
- cron checks (count/duplicates)

