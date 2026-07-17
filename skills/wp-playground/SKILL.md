---
name: wp-playground
description: Use when creating or debugging disposable WordPress environments with WordPress Playground, its CLI, Blueprints, snapshots, mounts, version switching, or Xdebug.
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Playground CLI requires Node.js 20.18+; runs WP in WebAssembly with SQLite."
---

# WordPress Playground

Playground is disposable and SQLite-backed: never point it at production data or mount secrets. This guidance targets `@wp-playground/cli` **3.1.45**; pin that version and confirm Node.js 20.18 or later with `node -v`.

## Default local workflow: `start`

Use `start` for normal local plugin, theme, `wp-content`, or WordPress work. It auto-detects and mounts the project, opens the browser, and persists local state.

```powershell
npx @wp-playground/cli@3.1.45 start --path=. --wp=latest --php=8.3
npx @wp-playground/cli@3.1.45 start --path=. --xdebug
```

For local debugging that pins the default PHP explicitly:

```powershell
npx @wp-playground/cli@3.1.45 start --path=. --php=8.3 --xdebug
```

PHP 8.3 is the default. Audited choices are `5.2`, `7.4`, and `8.0` through `8.5`; use `--php=<major.minor>` to reproduce the target.

## Advanced workflow: `server`

Use `server` only for low-level controls such as advanced mounting, worker count, or existing WordPress tree preparation.

```powershell
npx @wp-playground/cli@3.1.45 server --auto-mount=. --workers=auto
npx @wp-playground/cli@3.1.45 server --auto-mount=. --wordpress-install-mode=install-from-existing-files-if-needed
```

`--workers=4` and `--workers=auto` are server-only. Use a positive integer for a fixed count or `auto` for one worker per CPU core minus one. Do not put worker or install-mode controls on `start`.

## Blueprints, snapshots, and debugging

```powershell
npx @wp-playground/cli@3.1.45 run-blueprint --blueprint=./blueprint.json --blueprint-may-read-adjacent-files
npx @wp-playground/cli@3.1.45 build-snapshot --blueprint=./blueprint.json --outfile=./site.zip
```

Use the adjacent-files consent flag only for a local Blueprint that needs files beside it. New Blueprint files use V2; see [references/blueprints.md](references/blueprints.md).

Use `--xdebug` for debugging and configure the IDE with the host, port, and path mapping printed by the CLI. Verify the mount is active and a breakpoint resolves from its local path. If mounting fails, use an absolute `--mount=/host/path:/vfs/path`; if the port is occupied, choose `--port=<free-port>`. Use `--verbosity=debug` where supported.

Native PHP extensions, external database workflows, and production-only infrastructure need a full WordPress stack. See [CLI commands](references/cli-commands.md) and [debugging](references/debugging.md).
