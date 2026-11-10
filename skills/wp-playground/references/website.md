## Playground website workflows

Use this reference for `https://playground.wordpress.net/` setup and sharing, and to choose how to interact with an existing browser site.

## Route first

- For Blueprint JSON structure, schema, resources, steps, or bundles, use the `blueprint` skill; it is the source of truth for Blueprint details.
- For local filesystem mounts, snapshots, Xdebug, or headless validation, return to the `wp-playground` routing procedure and select the local CLI or debugging workflow.
- For a new site or share link, use the Query API and Blueprint URL setup below. Setup URLs apply at page load; do not reload an existing site just to perform a runtime operation.

## Choose an interaction method

Respect a connection method explicitly requested by the user. Otherwise, prefer available WebMCP tools for supported operations. Availability means tools are exposed and callable in this session, not merely that the browser can open Playground.

Read only the reference needed for the selected method:

| Method | When to use | Reference |
| --- | --- | --- |
| WebMCP | Default for supported operations through the open page's site tools. | [WebMCP](webmcp.md) |
| Playground MCP | The user requests it, or WebMCP is unavailable or lacks an operation and a suitable MCP connection is available. | [Playground MCP](mcp.md) |
| Sites API and active site client | The user requests browser JavaScript APIs, or available site tools/MCP do not support the operation. | [Sites API](sites-api.md) |

Fall back per operation, loading the fallback reference only when needed. Keep the intended site when changing methods: do not create a replacement site or reload away the user's current work. Confirm the target with a harmless information/read operation before making changes, and verify the result in that same site.

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
- `site-slug=<slug>`: select a saved browser site by slug. Use the selected interaction method to discover existing slugs first.
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
- GitHub export form prefill: `gh-ensure-auth=yes`, `ghexport-repo-url=<repo-url>`, `ghexport-pr-action=create|update`, `ghexport-playground-root=<path>`, `ghexport-repo-root=<path>`, `ghexport-content-type=plugin|theme|wp-content|custom-paths`, `ghexport-plugin=<plugin-path>`, `ghexport-theme=<theme-dir>`, repeatable ghexport-path (`ghexport-path=<relative-path>`), `ghexport-commit-message=<message>`, `ghexport-allow-include-zip=yes|no`.

## Verification and browser limitations

- For a generated URL, open it in a fresh browser session and confirm versions, login state, installed assets, and landing page.
- If a hosted Blueprint/import fails, verify the URL is public and CORS-enabled.
- For existing-site operations, follow the verification guidance in the selected interaction reference.
- Treat `playground.wordpress.net` as a browser demo/sandbox, not production hosting or guaranteed durable infrastructure.
- Escalate to the CLI or a full WordPress stack when the task needs local filesystem mounts, snapshots, headless validation, durable production-like persistence, native database access, server integration, or production availability guarantees.
