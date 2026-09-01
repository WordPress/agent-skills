# VIP-CLI and the VIP Local Development Environment

**VIP-CLI** (`vip`) is a separate tool from plain WP-CLI (`wp`) — it wraps/extends WP-CLI for VIP-specific operations and also manages the VIP Local Development Environment. Don't route VIP-CLI questions to `wp-wpcli-and-ops` — that skill covers plain WP-CLI against any WordPress install, not VIP's own commands.

## VIP Local Development Environment (`vip dev-env`)

A local environment built to closely mirror a real VIP Platform environment (same services: nginx, php, database, memcached, elasticsearch, wordpress, vip-mu-plugins).

Common commands:

- `vip dev-env create --slug=<name> [--php=8.2]` — create a new environment (defaults to `vip-local` if no `--slug`).
- `vip dev-env start --slug=<name>` — start it. Add `--skip-rebuild` to only (re)start services that aren't currently running.
- `vip dev-env shell --slug=<name>` — shell into a running environment's container.
- `vip dev-env logs --slug=<name> [--service=<service>] [--follow] [--debug]` — logs for one or all services (e.g. `--service=elasticsearch`).
- `vip dev-env list` — list local environments.
- `vip dev-env info --slug=<name>` — environment details.

A local environment's configuration lives in a config file (see VIP docs for the current schema) rather than ad-hoc flags for anything beyond one-off overrides.

## Non-dev-env commands (against real VIP environments)

- `vip logs` — retrieve Runtime Logs (up to the most recent ~500 entries) from an application's web containers.
- `vip cache purge-url` — purge the page cache for a URL from the CLI (see `caching.md` for the programmatic/PHP equivalents).

## When to use which

- Debugging local behavior, or reproducing something before it reaches a real environment → `vip dev-env ...`.
- Investigating a live VIP environment (real logs, real cache state) → plain `vip ...` commands (require VIP-CLI auth against the actual application).
- Anything that is just "run WP-CLI against this WordPress install" with no VIP-specific behavior involved → `wp-wpcli-and-ops`.

## Disallowed WP-CLI commands

Some WP-CLI commands are blocked on VIP because they'd let a user bypass the platform's own deploy/update/backup safety mechanisms. Known disallowed core commands include (non-exhaustive — check `docs.wpvip.com/vip-cli/wp-cli-with-vip-cli/disallowed-commands/` for the current list before assuming a command works or is blocked):

- `check-update`, `download`, `install`, `is-installed`, `update`, `update-db`, `verify-checksums` — core/plugin/theme install-and-update commands. Code changes go through git deploys (`code-deployment.md`), not `wp core update` / `wp plugin install` against a live environment.
- `multisite-convert`, `multisite-install` — multisite conversion/setup is a platform-level operation, not a WP-CLI task on VIP.
- Most `wp db *` subcommands are disallowed — but `wp db query` is allowed and **defaults to read-only**; queries containing `DROP`, `TRUNCATE`, or `CREATE` are blocked outright. For actual backup/export/import workflows, use `vip export sql` (`backups-and-migration.md`), not `wp db export`/`wp db import` against a live VIP environment.
- If a disallowed command's underlying behavior is genuinely needed, the documented workaround is a **custom WP-CLI command** built around `$wpdb->query()` or the relevant WordPress API, not trying to bypass the restriction.

## Source

- https://docs.wpvip.com/technical-references/vip-cli/
- https://docs.wpvip.com/vip-cli/commands/
- https://docs.wpvip.com/vip-cli/commands/dev-env/
- https://docs.wpvip.com/vip-cli/commands/dev-env/create/
- https://docs.wpvip.com/vip-cli/commands/dev-env/start/
- https://docs.wpvip.com/vip-cli/commands/logs/
- https://docs.wpvip.com/vip-local-development-environment/
- https://docs.wpvip.com/vip-cli/wp-cli-with-vip-cli/disallowed-commands/
- https://docs.wpvip.com/vip-cli/wp-cli-with-vip-cli/
