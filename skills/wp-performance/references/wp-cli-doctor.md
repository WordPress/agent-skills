# WP-CLI doctor (`wp doctor`)

Use this for quick “production readiness” checks.

## Install (if missing)

Check `wp cli version`, then choose a released package version compatible with that WP-CLI version.
For WP-CLI 2.12.x, for example:

- `wp package install wp-cli/doctor-command:v2.3.0`

An unversioned install can select a development branch that requires a newer WP-CLI.
For other WP-CLI versions, check the release's `composer.json` requirements before installing.
The `:@stable` constraint selects a stable release but does not guarantee compatibility with an older WP-CLI.

Docs:

- Package installation and authentication: https://developer.wordpress.org/cli/commands/package/install/
- Example release requirements: https://github.com/wp-cli/doctor-command/blob/v2.3.0/composer.json
- Default checks: https://make.wordpress.org/cli/handbook/doctor-default-checks/
- Customize checks: https://make.wordpress.org/cli/handbook/guides/doctor/doctor-customize-config/

## Recommended usage

- `wp doctor check`
- `wp doctor list` (to see available checks)

Especially relevant to performance:

- `autoload-options-size` (autoloaded options threshold)
- `constant-savequeries-falsy` / `constant-wp-debug-falsy` (avoid perf-costly debug flags in prod)
- cron checks (count/duplicates)

