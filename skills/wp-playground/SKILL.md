---
name: wp-playground
description: "Use for WordPress Playground workflows: fast disposable WP instances in the browser or locally via @wp-playground/cli (server, run-blueprint, build-snapshot), auto-mounting plugins/themes, switching WP/PHP versions, blueprints, and debugging (Xdebug)."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Playground CLI requires Node.js 20.18+; runs WP in WebAssembly with SQLite."
---

# WordPress Playground

## When to use

- Spin up a disposable WordPress to test a plugin/theme without full stack setup.
- Run or iterate on Playground Blueprints (JSON) locally.
- Build a reproducible snapshot of a site for sharing or CI.
- Switch WP/PHP versions quickly to reproduce issues.
- Debug plugin/theme code with Xdebug in an isolated Playground.

## Inputs required

- Host machine readiness: Node.js ≥ 20.18, `npm`/`npx` available.
- Project path to mount (`--auto-mount` or explicit mount mapping).
- Desired WP version/PHP version (optional; defaults to latest WP, PHP 8.3).
- Blueprint location/URL if running a blueprint.
- Port preference if 9400 conflicts.
- Whether Xdebug is needed.

## Procedure

### 0) Guardrails

- Playground instances are ephemeral and SQLite-backed; **never** point at production data.
- Confirm Node ≥ 20.18 (`node -v`) before running CLI.
- If mounting local code, ensure it is clean of secrets; Playground copies files into an in-memory FS.

### 1) Quick local spin-up (auto-mount)

```bash
cd <plugin-or-theme-root>
npx @wp-playground/cli@latest server --auto-mount
```
- Opens on http://localhost:9400 by default. Auto-detects plugin/theme and installs it.
- Add `--wp=<version>` / `--php=<version>` as needed.
- For classic full installs already present, add `--skip-wordpress-setup` and mount the whole tree.

### 2) Manual mounts or multiple mounts

- Use `--mount=/host/path:/vfs/path` (repeatable) when auto-mount is insufficient (multi-plugin, mu-plugins, custom content).
- Mount before install with `--mount-before-install` for bootstrapping installer flows.
- Reference: `references/cli-commands.md`

### 3) Run a Blueprint (no server needed)

```bash
npx @wp-playground/cli@latest run-blueprint --blueprint=<file-or-url>
```
- Use for scripted setup/CI validation. Supports remote URLs and local files.
- Allow bundled assets in local blueprints with `--blueprint-may-read-adjacent-files` when required.
- See `references/blueprints.md` for structure and common flags.

### 4) Build a snapshot for sharing

```bash
npx @wp-playground/cli@latest build-snapshot --blueprint=<file> --outfile=./site.zip
```
- Produces a ZIP you can load in Playground or attach to bug reports.

### 5) Debugging with Xdebug

- Start with `--xdebug` (or `--enable-xdebug` depending on CLI release) to expose an IDE key, then connect VS Code/PhpStorm to the host/port shown in CLI output.
- Combine with `--auto-mount` for plugin/theme debugging.
- Checklist: `references/debugging.md`

### 6) Version switching

- Use `--wp=` to pin WP (e.g., 7.0.0) and `--php=` to test compatibility.
- If feature depends on Gutenberg trunk, prefer the latest WP release plus plugin if available; Playground images track stable WP plus bundled Gutenberg.

### 7) Browser-only workflows (no CLI)

- Launch quick previews with URL fragments or query params:
  - Fragment: `https://playground.wordpress.net/#<base64-or-json-blueprint>`
  - Query: `https://playground.wordpress.net/?blueprint-url=<public-url-or-zip>`
- Use the live Blueprint Editor (playground.wordpress.net) to author blueprints with schema help; paste JSON and copy a shareable link.

## Verification

- Verify mounted code is active (plugin listed/active; theme selected).
- For blueprints/snapshots, re-run with `--verbosity=debug` to confirm steps executed.
- Run targeted smoke (e.g., `wp plugin list` inside Playground shell via browser terminal if exposed) or UI click-path.

## Failure modes / debugging

- **CLI exits complaining about Node**: upgrade to ≥ 20.18.
- **Mount not applied**: check path, use absolute path, add `--verbosity=debug`.
- **Blueprint cannot read local assets**: add `--blueprint-may-read-adjacent-files`.
- **Port already used**: `--port=<free-port>`.
- **Slow/locked UI**: disable `--experimental-multi-worker` if enabled; or enable it to improve throughput on CPU-bound runs.

## Escalation

- If PHP extensions or native DB access are required, Playground may be unsuitable; fall back to full WP stack or wp-env/Docker.
- For browser-only embedding or VS Code extension specifics, consult the upstream docs: https://wordpress.github.io/wordpress-playground/
