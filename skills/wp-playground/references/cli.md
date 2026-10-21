## Playground CLI workflows

Use this reference for local WordPress Playground runs with `@wp-playground/cli`: disposable or persisted local servers, mounted plugins/themes, Blueprint execution, snapshots, version switching, and local smoke tests.

## Prerequisites

- Node.js 20.18+ with `npm`/`npx` available.
- A local project, plugin, theme, Blueprint file, or Blueprint bundle path.
- A free local port when using `server`; the default is `9400`.

Check the installed CLI help when exact flags matter:

```bash
npx @wp-playground/cli@latest --help
npx @wp-playground/cli@latest start --help
npx @wp-playground/cli@latest server --help
```

## Quick local development

Use `start` for the common local plugin/theme workflow. It detects the project type, mounts the project, opens a browser, enables admin auto-login, and persists the site between sessions.

```bash
cd <plugin-or-theme-root>
node -v
npx @wp-playground/cli@latest start
```

- Use `npx @wp-playground/cli@latest start --reset` when the persisted site should be recreated from scratch.
- Use `server` with explicit `--wp=<version>` and `--php=<version>` when reproducing compatibility issues instead of relying on moving defaults.

## Advanced local server

Use `server` when you need full manual control, a disposable site, CI-style behavior, custom mounts, or a Blueprint-backed server:

```bash
npx @wp-playground/cli@latest server --auto-mount
```

- `--auto-mount[=<path>]` detects a WordPress directory, plugin, theme, wp-content directory, or PHP/HTML directory.
- Add `--port=<free-port>` when the default port is busy.
- For existing WordPress files, prefer `--wordpress-install-mode=install-from-existing-files-if-needed` to skip setup when a site is already present.
- Use `--wordpress-install-mode=do-not-attempt-installing` only when WordPress files and database integration are already handled by the mounted tree.

## Manual mounts

Use explicit mounts when auto-mount is not enough:

```bash
npx @wp-playground/cli@latest server \
  --mount=/absolute/host/path:/wordpress/wp-content/plugins/my-plugin
```

- Use absolute host paths.
- Repeat `--mount=` for multiple plugins, mu-plugins, themes, or custom content.
- Use `--mount-before-install` when installer or Blueprint steps need mounted files before WordPress setup completes.
- On Windows or when colon-separated mappings are awkward, use `--mount-dir "/host/path" "/vfs/path"` or `--mount-dir-before-install "/host/path" "/vfs/path"`.

## Run a Blueprint

For headless setup or CI-style validation:

```bash
npx @wp-playground/cli@latest run-blueprint --blueprint=<file-or-url>
```

- Use the `blueprint` skill for Blueprint JSON structure and schema details.
- Add `--blueprint-may-read-adjacent-files` when a local Blueprint directory or bundle references nearby files.
- Add `--verbosity=debug` when step execution needs inspection.

## Start a server from a Blueprint

```bash
npx @wp-playground/cli@latest server --blueprint=<file-or-url>
```

For local directory bundles:

```bash
npx @wp-playground/cli@latest server \
  --blueprint=./my-bundle/ \
  --blueprint-may-read-adjacent-files
```

ZIP bundles are self-contained and do not need adjacent-file access.

## Build a snapshot

```bash
npx @wp-playground/cli@latest build-snapshot \
  --blueprint=<file-or-url> \
  --outfile=./site.zip
```

- Use snapshots for shareable repro cases or CI artifacts.
- Re-run with `--verbosity=debug` if the generated site does not contain the expected state.

## Version switching

- Use `--wp=<version>` to pin WordPress.
- Use `--php=<version>` to pin PHP.
- Prefer explicit versions for bug reproduction and compatibility testing.
- Use the CLI help or current Playground docs to confirm supported version values and defaults.

## Verification

- Confirm the plugin appears in the admin plugin list and is active when expected.
- Confirm the selected theme is active when testing themes.
- For Blueprints, verify expected options, pages, plugins, themes, or files after the run.
- For snapshots, load the ZIP in a fresh Playground instance before sharing it as a repro artifact.

## Failure modes

- **Node version error**: upgrade to Node.js 20.18+.
- **Mount not applied**: use an absolute path, verify the virtual path, and rerun with `--verbosity=debug`.
- **Blueprint cannot read local assets**: add `--blueprint-may-read-adjacent-files` for local directory bundles.
- **Port already used**: pass `--port=<free-port>`.
- **Need a fresh persisted `start` site**: rerun with `start --reset`.
- **Need breakpoints or runtime logs**: return to the `wp-playground` routing procedure and select the debugging workflow.
