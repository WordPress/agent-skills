# WP-CLI doctor (`wp doctor`)

Use this for quick “production readiness” checks.

## Install (if missing)

- `wp package install wp-cli/doctor-command`

Docs:

- Default checks: https://make.wordpress.org/cli/handbook/doctor-default-checks/
- Customize checks: https://make.wordpress.org/cli/handbook/guides/doctor/doctor-customize-config/

## Recommended usage

- `wp doctor check --all` (run every registered check)
- `wp doctor check autoload-options-size constant-savequeries-falsy constant-wp-debug-falsy` (perf-focused run)
- `wp doctor check --all --spotlight` (show only warnings and errors)
- `wp doctor list` (to see available checks)

`wp doctor check` needs either `--all` or at least one check name; with neither it exits with "Please specify one or more checks, or use --all."

Especially relevant to performance:

- `autoload-options-size` (autoloaded options threshold)
- `constant-savequeries-falsy` / `constant-wp-debug-falsy` (avoid perf-costly debug flags in prod)
- cron checks (count/duplicates)

