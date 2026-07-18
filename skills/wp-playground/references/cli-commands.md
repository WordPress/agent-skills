# Playground CLI 3.1.45 commands

Pin `@wp-playground/cli@3.1.45`. PHP 8.3 is the default; choices are `"5.2"`, `"7.4"`, and `"8.0"` through `"8.5"`.

## Normal local work: `start`

`start` auto-detects a plugin, theme, `wp-content`, or WordPress directory, mounts it, opens a browser, and persists state.

```powershell
npx @wp-playground/cli@3.1.45 start --path=. --wp=latest --php=8.3
npx @wp-playground/cli@3.1.45 start --path=. --xdebug
npx @wp-playground/cli@3.1.45 start --path=. --php=8.3 --xdebug
```

## Advanced control: `server`

`server` is for advanced mounting, worker controls, and existing-tree setup.

```powershell
npx @wp-playground/cli@3.1.45 server --auto-mount=. --workers=auto
npx @wp-playground/cli@3.1.45 server --auto-mount=. --wordpress-install-mode=install-from-existing-files-if-needed
```

`--workers=4` fixes the count; `--workers=auto` uses one worker per CPU core minus one. Both are server-only. Valid install modes are `download-and-install`, `install-from-existing-files`, `install-from-existing-files-if-needed`, and `do-not-attempt-installing`.

## Batch Blueprint operations

```powershell
npx @wp-playground/cli@3.1.45 run-blueprint --blueprint=./blueprint.json --blueprint-may-read-adjacent-files
npx @wp-playground/cli@3.1.45 build-snapshot --blueprint=./blueprint.json --outfile=./site.zip
```

Use the adjacent-files flag only when a local Blueprint reads bundled files next to its JSON file. `run-blueprint` exits after execution; `build-snapshot` writes the requested ZIP.
