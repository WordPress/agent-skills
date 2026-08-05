## Debugging WordPress Playground

- Start CLI with Xdebug: `server --auto-mount --xdebug` (or `--enable-xdebug` depending on release). The CLI prints host/port and IDE key to configure your debugger.
- If breakpoints are not hit, confirm:
  - IDE listens on the port shown by CLI.
  - Path mappings include the mounted VFS path used by Playground.
- For slow or stuck runs:
  - Add `--verbosity=debug` to see step-level logs.
  - Disable `--experimental-multi-worker` if it was enabled.
- For mount issues:
  - Prefer absolute paths in `--mount`.
  - Use `--mount-before-install` when installer steps need files present early.
- To inspect runtime state:
  - Open the Playground browser console; the Service Worker logs network/FS events.
  - Use the “Terminal” tab (if available) to run WP-CLI inside the instance.
