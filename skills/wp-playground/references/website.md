## Playground website workflows

Use this reference when the agent must use `https://playground.wordpress.net/` itself: create a browser Playground site, share a Playground URL, manage saved sites, or interact with the currently running WordPress site from DevTools/browser automation.

## Route first

- For Blueprint JSON structure, schema, resources, steps, or bundles, use the `blueprint` skill first; the Blueprint skill is the source of truth for Blueprint details.
- For local filesystem mounts, snapshots, Xdebug, or headless validation, return to the `wp-playground` routing procedure and select the local CLI or debugging workflow.

## Working model for agents

`playground.wordpress.net` gives the agent three useful control surfaces:

- **URL setup**: Query API parameters and Blueprint URLs create or open a site in a desired state. Use this before the site boots.
- **Site manager**: `window.playgroundSites` manages the website's saved browser sites. Use it to list, create, switch, save, rename, delete, or reconfigure sites.
- **Active site client**: `window.playground` is the `PlaygroundClient` for the currently running WordPress site. `playgroundSites.getClient()` returns the same client after the active site is ready. Use it to inspect files, write files, run PHP, make HTTP-style WordPress requests, and navigate.

Use the website/site-manager layer to create or choose a site. Use the active site client to change WordPress itself.

## Decide what to do

| User intent | Agent action |
| --- | --- |
| Share a quick reviewer/demo site | Build a `https://playground.wordpress.net/?...` URL with Query API parameters. |
| Share a multi-step setup | Use the `blueprint` skill to create/review the Blueprint, then pass it as a URL fragment or `?blueprint-url=`. |
| Create a blank temporary site from the browser | Open `playground.wordpress.net`, then call `playgroundSites.createNewTemporarySite()`. |
| Keep a temporary site after reload | Call `playgroundSites.saveInBrowser()` for OPFS persistence. |
| Switch between saved browser sites | Call `playgroundSites.list()` and `playgroundSites.setActiveSite(slug)`. |
| Change PHP version or networking on an existing saved site | Save it first, then call `setPhpVersion()` or `setNetworking()`. |
| Inspect or modify WordPress files/content | Get the active client with `playgroundSites.getClient()` or `window.playground`, then use client file/PHP/request methods. |

## Create or open a site with a URL

For a blank disposable Playground site, use `https://playground.wordpress.net/` with no query parameters.

Use Query API URLs when the setup is simple enough to express as URL parameters:

```text
https://playground.wordpress.net/?php=8.4&wp=latest&plugin=gutenberg&networking=yes&url=/wp-admin/post-new.php
```

Practical URL parameters for agents:

- `php=<version>` and `wp=<version>`: choose runtime versions.
- `plugin=<slug>` and `theme=<slug>`: install WordPress.org assets; repeat the parameter for multiple assets, such as `?plugin=gutenberg&plugin=woocommerce&networking=yes`.
- `networking=yes|no`: allow or block downloads for plugins, themes, translations, imports, and PR builds. Use `networking=no` or omit networking for offline/simple tests.
- `login=yes|no`: control admin auto-login. Use `login=no` to prevent automatic admin login; admin pages will require manual login.
- `multisite=yes|no`: choose single-site or multisite mode at boot.
- `url=/path/`: choose the first page to show. Use `/wp-admin/` for the dashboard or `/wp-admin/site-editor.php` for the Site Editor.
- `language=<locale>`: set a WordPress locale such as `de_DE`; pair with `networking=yes` so translations can download.
- `import-site=<zip-url>`: import a public, URL-encoded, CORS-enabled site ZIP.
- `import-wxr=<wxr-url>`: import a public, URL-encoded, CORS-enabled WordPress export XML/WXR file.
- `site-slug=<slug>`: select a saved browser site by slug. Use `playgroundSites.list()` when you need to discover slugs first.
- `if-stored-site-missing=prompt`: ask the user whether to save a new site when `site-slug` is missing.
- `blueprint-url=<url>`: load a public Blueprint JSON file or Blueprint bundle ZIP.
- `lazy`: show a Run button and defer loading until clicked, useful for tutorials and click-to-run demos.
- `mode=browser-full-screen|seamless`: choose browser UI or a full-width WordPress view.
- `page-title=<title>`: customize the browser tab title when comparing instances.
- `can-save=no`: remove save options from the UI.
- `overlay=blueprints`: open the Blueprint Gallery on load.

Use these rules:

- Use Query API links for simple, shareable setup.
- Use Blueprint URLs/fragments for multi-step setup, files, content creation, custom code, or bundled assets.
- Do not explain Blueprint schema here; delegate the Blueprint body to the `blueprint` skill.
- Hosted Blueprint JSON, ZIP bundles, imports, and referenced assets must be public and served with `Access-Control-Allow-Origin: *`.
- Browser URLs cannot read arbitrary local files or local directory bundles. Use hosted assets or the CLI for local paths.
- If a missing `site-slug` prompt appears, confirm the user's intent before creating or saving a new browser site.

Small inline Blueprints can be shared with a URL fragment:

```text
https://playground.wordpress.net/#<encodeURIComponent(JSON.stringify(blueprint))>
```

Large Blueprints and bundles should use:

```text
https://playground.wordpress.net/?blueprint-url=<public-json-or-zip-url>
```

Base64-encoded Blueprint fragments are also supported when a channel rewrites JSON characters.

Other URL capabilities the agent may need:

- Experimental builds: `core-pr=<number>` for WordPress core PRs, `gutenberg-pr=<number>` for Gutenberg PRs, `gutenberg-branch=<branch>` such as `trunk`.
- Runtime extension: `php-extension=<manifest-url>`; accepts HTTP(S) URLs and may be repeated.
- Browser MCP bridge: `mcp=yes`, optional `mcp-port=<port>`; default port is `7999`.
- GitHub export form prefill: `gh-ensure-auth=yes`, `ghexport-repo-url=<repo-url>`, `ghexport-pr-action=create|update`, `ghexport-playground-root=<path>`, `ghexport-repo-root=<path>`, `ghexport-content-type=plugin|theme|wp-content|custom-paths`, `ghexport-plugin=<plugin-path>`, `ghexport-theme=<theme-dir>`, repeatable ghexport-path (`ghexport-path=<relative-path>`), `ghexport-commit-message=<message>`, `ghexport-allow-include-zip=yes|no`.

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

- For a generated URL, open it in a fresh browser session and confirm versions, login state, installed assets, and landing page.
- For `playgroundSites`, verify `sites.list()` shows the expected active site and storage type.
- For client operations, run a harmless read first, such as `await client.listFiles('/wordpress')`, before writing files or changing state.
- If a hosted Blueprint/import fails, verify the URL is public and CORS-enabled.
- Treat `playground.wordpress.net` as a browser demo/sandbox, not production hosting or guaranteed durable infrastructure.
- Escalate to the CLI or a full WordPress stack when the task needs local filesystem mounts, snapshots, headless validation, durable production-like persistence, native database access, server integration, or production availability guarantees.
