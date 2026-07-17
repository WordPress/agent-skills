# Debugging Playground CLI 3.1.45

For a normal local debugging session, use `start`:

```powershell
npx @wp-playground/cli@3.1.45 start --path=. --php=8.3 --xdebug
```

It auto-detects the project, opens the browser, and retains local state. Configure VS Code or PhpStorm using the host, port, and path mapping printed by the CLI, then confirm a breakpoint resolves from mounted code.

Use `server` only for advanced controls:

```powershell
npx @wp-playground/cli@3.1.45 server --auto-mount=. --workers=auto --xdebug
npx @wp-playground/cli@3.1.45 server --auto-mount=. --wordpress-install-mode=install-from-existing-files-if-needed --xdebug
```

If a breakpoint fails, verify the IDE listens on the printed port and maps the local project to the reported VFS path. Add `--verbosity=debug` where supported, use an absolute `--mount=/host/path:/vfs/path` if auto-detection is wrong, and choose another `--port=<free-port>` when 9400 is occupied. Playground runs WP in WebAssembly with SQLite; native extensions or production infrastructure need a full WordPress stack.
