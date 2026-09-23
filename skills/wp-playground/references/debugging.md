## Debugging WordPress Playground

- Start CLI with Xdebug: `server --auto-mount --xdebug`. The CLI prints host/port and IDE key to configure your debugger; if the installed CLI help differs, follow `npx @wp-playground/cli@latest server --help`.
- If breakpoints are not hit, confirm:
  - IDE listens on the port shown by CLI.
  - Path mappings include the mounted VFS path used by Playground.
- For slow or stuck runs:
  - Add `--verbosity=debug` to see step-level logs.
  - Use `--debug` to print the PHP error log when boot fails.
  - Adjust request workers with `--workers=<n|auto>`; use `--workers=1` to isolate worker-related behavior.
- For mount issues:
  - Prefer absolute paths in `--mount`.
  - Use `--mount-before-install` when installer steps need files present early.
- To inspect runtime state:
  - Open the Playground browser console; the Service Worker logs network/FS events.
  - Use the “Terminal” tab (if available) to run WP-CLI inside the instance.
