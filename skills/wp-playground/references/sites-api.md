## Sites API and active site client

Use this reference for browser JavaScript operations on the Playground website when selected by the [interaction router](website.md#choose-an-interaction-method).

- `window.playgroundSites` manages saved browser sites and the active site selection.
- `window.playground` is the `PlaygroundClient` for the active WordPress runtime; `playgroundSites.getClient()` returns that client after the site is ready.

## Manage browser sites with `window.playgroundSites`

Use `window.playgroundSites` on the top-level `https://playground.wordpress.net/` page. It is not available immediately during page load, so wait for the global and then call `isReady()` before site-manager work.

```js
while (!window.playgroundSites) {
	await new Promise((resolve) => setTimeout(resolve, 50));
}
await window.playgroundSites.isReady();
```

Available site-manager operations:

- `list()`: inspect known sites, active site, names, slugs, and storage types.
- `createNewTemporarySite(slug?, settings?)`: create and switch to a fresh in-memory site. Settings use `phpVersion`, `wpVersion`, `networking`, `language`, and `multisite`.
- `setActiveSite(slug)`: switch to an existing site and wait for it to boot.
- `isReady()`: wait until the active site and its client are ready.
- `getClient()`: get the active site's `PlaygroundClient`.
- `saveInBrowser(name?)`: persist the active site to OPFS browser storage.
- `saveToLocalFileSystem(name?, handle?)`: persist the active site to a user-selected local directory when the browser supports it.
- `rename(newName)`: rename the active saved site.
- `setPhpVersion(version)`: change PHP version and reboot the active saved site.
- `setNetworking(enabled)`: toggle outbound networking and reboot the active saved site.
- `delete(slug)`: delete a saved site when the user explicitly asked for deletion.

Storage behavior:

- `temporary`: in memory only; resets on reload.
- `opfs`: saved in browser storage for `playground.wordpress.net`; survives reloads.
- `local-fs`: saved to a user-selected local directory; Chromium/File System Access API only.

Important constraints:

- `createNewTemporarySite()` accepts only version/site boot settings: `phpVersion`, `wpVersion`, `networking`, `language`, and `multisite`. The JS names are `phpVersion` and `wpVersion`, not `php` and `wp`.
- It does not install plugins/themes or run Blueprints; use a URL/Blueprint workflow for that.
- `saveInBrowser()` and `saveToLocalFileSystem()` are safe on already-saved sites.
- `rename()`, `setPhpVersion()`, and `setNetworking()` operate on the active saved site. Switch with `setActiveSite(slug)` first when targeting a specific site. Save a temporary site first.
- `delete(slug)` deletes a saved site's persisted data; do not call it unless the user asked for deletion.

## Interact with the active WordPress site

Use the active `PlaygroundClient` after the site is booted. If the user says `window.palyground`, treat it as a typo for `window.playground`.

```js
await window.playgroundSites?.isReady();
const client = window.playgroundSites?.getClient() || window.playground;
await client.isReady();
```

Available active-site operations:

- File inspection: `listFiles`, `readFileAsText`, `readFileAsBuffer`, `fileExists`, `isFile`, `isDir`, `isSymlink`, `readlink`, and `realpath` in the `/wordpress` virtual filesystem.
- File mutation: `mkdir`, `mkdirTree`, `writeFile`, `mv`, `cp`, `chmod`, `symlink`, `unlink`, `rmdir`, and `unzip`. `mv` moves or renames files. unlink deletes files, while `playgroundSites.delete(slug)` deletes a saved site. `rmdir` is for empty directories.
- PHP execution: run PHP snippets with `run({ code })`; inspect the returned output/status/error fields. Require `/wordpress/wp-load.php` before using WordPress APIs such as `wp_insert_post`, `get_option`, `get_stylesheet`, or `wp_get_theme`.
- Web requests: call WordPress routes with `request({ path, method, headers, body })` and inspect status/body. Use it for admin pages such as `/wp-admin/` and REST routes such as `/wp-json/wp/v2/posts`; remember admin/nonce behavior depends on login state.
- Browser navigation: send the visible Playground frame to a WordPress path with `goTo(path)`.
- State checks: verify installed/active plugins and themes through WordPress PHP APIs or filesystem checks before claiming setup succeeded.
- MU plugins: write files under `/wordpress/wp-content/mu-plugins/`, then request or navigate to a WordPress route to force loading.

Keep the distinction clear:

- `playgroundSites` manages site records and persistence.
- `window.playground` / `getClient()` manipulates the active WordPress runtime.
- Query API / `blueprint-url` sets up a site at page load.

## Verification

- Before changes, inspect `window.playgroundSites.list()` to confirm the intended active site.
- After site-manager operations, verify `window.playgroundSites.list()` shows the expected active site and storage type.
- For client operations, run a harmless read first, such as `await client.listFiles('/wordpress')`, before writing files or changing state. Verify the requested state after the operation.
- After switching sites or rebooting, wait for readiness and reacquire the active client before further operations.
