---
name: blueprint
description: Use when creating, editing, or reviewing WordPress Playground blueprint JSON files. Triggers on mentions of blueprints, playground configuration, or requests to set up a WordPress demo environment.
compatibility: "WordPress 6.9+, PHP 7.2.24+. Optionally Playground CLI or a browser"
---

# WordPress Playground Blueprints

## Overview

A Blueprint is a JSON file that declaratively configures a WordPress Playground instance — installing plugins/themes, setting options, running PHP/SQL, manipulating files, and more.

**Core principle:** Blueprints are trusted JSON-only declarations. No arbitrary JavaScript. They work on web, Node.js, and CLI.

## Quick Start Template

```json
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "landingPage": "/wp-admin/",
  "preferredVersions": { "php": "8.3", "wp": "latest" },
  "steps": [{ "step": "login" }]
}
```

## Top-Level Properties

All optional. Only documented keys are allowed — the schema rejects unknown properties.

| Property | Type | Notes |
|----------|------|-------|
| `$schema` | string | Always `"https://playground.wordpress.net/blueprint-schema.json"` |
| `landingPage` | string | Relative path, e.g. `/wp-admin/` |
| `meta` | object | `{ title, author, description?, categories? }` — title and author required |
| `preferredVersions` | object | `{ php, wp }` — both required when present |
| `features` | object | `{ networking?: boolean, intl?: boolean }` — **only** these two keys, nothing else. Networking defaults to `true` |
| `extraLibraries` | array | `["wp-cli"]` — auto-included when any `wp-cli` step is present |
| `constants` | object | Shorthand for `defineWpConfigConsts`. Values: string/boolean/number |
| `plugins` | array | Shorthand for `installPlugin` steps. Strings = wp.org slugs |
| `siteOptions` | object | Shorthand for `setSiteOptions` |
| `login` | boolean or object | `true` = login as admin. Object = `{ username?, password? }` (both default to `"admin"`/`"password"`) |
| `steps` | array | Main execution pipeline. Runs after shorthands |

### preferredVersions Values

- **php:** Major.minor only (e.g. `"8.3"`, `"7.4"`), or `"latest"`. Patch versions like `"7.4.1"` are invalid. Check the schema for currently supported versions.
- **wp:** Recent major versions (e.g. `"6.7"`, `"6.8"`), `"latest"`, `"nightly"`, `"beta"`, or a URL to a custom zip. Check the schema for the full list.

### Shorthands vs Steps

Shorthands (`login`, `plugins`, `siteOptions`, `constants`) are expanded and prepended to `steps` in an **unspecified order**. Use explicit steps when execution order matters.

## Resource References

Resources tell Playground where to find files. Used by `installPlugin`, `installTheme`, `writeFile`, `writeFiles`, `importWxr`, etc.

| Resource Type | Required Fields | Example |
|--------------|----------------|---------|
| `wordpress.org/plugins` | `slug` | `{ "resource": "wordpress.org/plugins", "slug": "woocommerce" }` |
| `wordpress.org/themes` | `slug` | `{ "resource": "wordpress.org/themes", "slug": "astra" }` |
| `url` | `url` | `{ "resource": "url", "url": "https://example.com/plugin.zip" }` |
| `git:directory` | `url`, `ref` | See below |
| `literal` | `name`, `contents` | `{ "resource": "literal", "name": "file.txt", "contents": "hello" }` |
| `literal:directory` | `name`, `files` | See below |
| `bundled` | `path` | References a file within a blueprint bundle (e.g. `{ "resource": "bundled", "path": "/plugin.zip" }`) |
| `zip` | `inner` | Wraps another resource in a ZIP — use when a step expects a zip but your source isn't one (e.g. wrapping a `url` resource pointing to a raw directory) |

### git:directory — Installing from GitHub

```json
{
  "resource": "git:directory",
  "url": "https://github.com/WordPress/gutenberg",
  "ref": "trunk",
  "refType": "branch",
  "path": "/"
}
```

- When using a branch or tag name for `ref`, you **must** set `refType` (`"branch"` | `"tag"` | `"commit"` | `"refname"`). Without it, only `"HEAD"` resolves reliably.
- `path` selects a subdirectory (defaults to repo root).

### literal:directory — Inline File Trees

```json
{
  "resource": "literal:directory",
  "name": "my-plugin",
  "files": {
    "plugin.php": "<?php /* Plugin Name: My Plugin */ ?>",
    "includes": {
      "helper.php": "<?php // helper code ?>"
    }
  }
}
```

- `files` uses nested objects for subdirectories — keys are filenames or directory names, values are **plain strings** (file content) or **objects** (subdirectories). Never use resource references as values.
- **Do NOT use path separators in keys** (e.g. `"includes/helper.php"` is wrong — use a nested `"includes": { "helper.php": "..." }` object).

## Steps Reference

Every step requires `"step": "<name>"`. Any step can optionally include `"progress": { "weight": 1, "caption": "Installing..." }` for UI feedback.

### Plugin & Theme Installation

```json
{
  "step": "installPlugin",
  "pluginData": { "resource": "wordpress.org/plugins", "slug": "gutenberg" },
  "options": { "activate": true, "targetFolderName": "gutenberg" },
  "ifAlreadyInstalled": "overwrite"
}
```

```json
{
  "step": "installTheme",
  "themeData": { "resource": "wordpress.org/themes", "slug": "twentytwentyfour" },
  "options": { "activate": true, "importStarterContent": true },
  "ifAlreadyInstalled": "overwrite"
}
```

- Use `pluginData` / `themeData` — **NOT** the deprecated `pluginZipFile` / `themeZipFile`.
- `pluginData` / `themeData` accept any FileReference or DirectoryReference — a zip URL, a `wordpress.org/plugins` slug, a `git:directory`, or a `literal:directory` (no `zip` wrapper needed).
- `options.activate` controls activation. No need for a separate `activatePlugin`/`activateTheme` step when using `installPlugin`/`installTheme`.
- `ifAlreadyInstalled`: `"overwrite"` | `"skip"` | `"error"`

### Activation (standalone)

Only needed for plugins/themes already on disk (e.g. after `writeFile`/`writeFiles`):

```json
{ "step": "activatePlugin", "pluginPath": "my-plugin/my-plugin.php" }
```
```json
{ "step": "activateTheme", "themeFolderName": "twentytwentyfour" }
```

### File Operations

```json
{ "step": "writeFile", "path": "/wordpress/wp-content/mu-plugins/custom.php", "data": "<?php // code" }
```

`data` accepts a plain string (as shown above) or a resource reference (e.g. `{ "resource": "url", "url": "https://..." }`).

```json
{
  "step": "writeFiles",
  "writeToPath": "/wordpress/wp-content/plugins/",
  "filesTree": {
    "resource": "literal:directory",
    "name": "my-plugin",
    "files": {
      "plugin.php": "<?php\n/*\nPlugin Name: My Plugin\n*/",
      "includes": {
        "helpers.php": "<?php // helpers"
      }
    }
  }
}
```

**`writeFiles` requires a DirectoryReference** (`literal:directory` or `git:directory`) as `filesTree` — not a plain object.

Other file operations: `mkdir`, `cp`, `mv`, `rm`, `rmdir`, `unzip`.

### Running Code

**runPHP:**
```json
{ "step": "runPHP", "code": "<?php require '/wordpress/wp-load.php'; update_option('key', 'value');" }
```
**GOTCHA:** You must `require '/wordpress/wp-load.php';` to use any WordPress functions.

**wp-cli:**
```json
{ "step": "wp-cli", "command": "wp post create --post_type=page --post_title='Hello' --post_status=publish" }
```
The step name is `wp-cli` (with hyphen), NOT `cli` or `wpcli`.

**runSql:**
```json
{ "step": "runSql", "sql": { "resource": "literal", "name": "q.sql", "contents": "UPDATE wp_options SET option_value='val' WHERE option_name='key';" } }
```

### Site Configuration

```json
{ "step": "setSiteOptions", "options": { "blogname": "My Site", "blogdescription": "A tagline" } }
```
```json
{ "step": "defineWpConfigConsts", "consts": { "WP_DEBUG": true } }
```
```json
{ "step": "setSiteLanguage", "language": "en_US" }
```
```json
{ "step": "defineSiteUrl", "siteUrl": "https://example.com" }
```

### Other Steps

| Step | Key Properties |
|------|---------------|
| `login` | `username?`, `password?` (default `"admin"` / `"password"`) |
| `enableMultisite` | (no required props) |
| `importWxr` | `file` (FileReference) |
| `importThemeStarterContent` | `themeSlug?` |
| `importWordPressFiles` | `wordPressFilesZip`, `pathInZip?` — imports a full WordPress directory from a zip |
| `request` | `request: { url, method?, headers?, body? }` |
| `updateUserMeta` | `userId`, `meta` |
| `runWpInstallationWizard` | `options?` — runs the WP install wizard with given options |
| `resetData` | (no props) |

## Common Patterns

### Inline mu-plugin (quick custom code)

```json
{
  "step": "writeFile",
  "path": "/wordpress/wp-content/mu-plugins/custom.php",
  "data": "<?php\n// mu-plugins load automatically — no activation needed, no require wp-load.php\nadd_filter('show_admin_bar', '__return_false');"
}
```

### Inline plugin with multiple files

```json
{
  "step": "writeFiles",
  "writeToPath": "/wordpress/wp-content/plugins/",
  "filesTree": {
    "resource": "literal:directory",
    "name": "my-plugin",
    "files": {
      "my-plugin.php": "<?php\n/*\nPlugin Name: My Plugin\n*/\nrequire __DIR__ . '/includes/main.php';",
      "includes": {
        "main.php": "<?php // main logic"
      }
    }
  }
}
```

Then activate it with a separate step:

```json
{ "step": "activatePlugin", "pluginPath": "my-plugin/my-plugin.php" }
```

### Plugin from a GitHub branch

```json
{
  "step": "installPlugin",
  "pluginData": {
    "resource": "git:directory",
    "url": "https://github.com/user/repo",
    "ref": "feature-branch",
    "refType": "branch",
    "path": "/"
  }
}
```

## Common Mistakes

| Mistake | Correct |
|---------|---------|
| `pluginZipFile` / `themeZipFile` | `pluginData` / `themeData` |
| `"step": "cli"` | `"step": "wp-cli"` |
| Flat object as `writeFiles.filesTree` | Must be a `literal:directory` or `git:directory` resource |
| Path separators in `files` keys | Use nested objects for subdirectories |
| `runPHP` without `wp-load.php` | Always `require '/wordpress/wp-load.php';` for WP functions |
| Invented top-level keys | Only documented keys work — schema rejects unknown properties |
| Inventing proxy URLs for GitHub | Use `git:directory` resource type |
| Omitting `refType` with branch/tag `ref` | Required — only `"HEAD"` works without it |
| Resource references in `literal:directory` `files` values | Values must be plain strings (content) or objects (subdirectories) — never resource refs |
| `features.debug` or other invented feature keys | `features` only supports `networking` and `intl` — use `constants: { "WP_DEBUG": true }` for debug mode |
| `require wp-load.php` in mu-plugin code | Only needed in `runPHP` steps — mu-plugins already run within WordPress |
| Schema URL with `.org` domain | Must be `playground.wordpress.net`, not `playground.wordpress.org` |

## Full Reference

This skill covers the most common steps and patterns. For the complete API, see:

- **Blueprint docs:** https://wordpress.github.io/wordpress-playground/blueprints
- **JSON schema:** https://playground.wordpress.net/blueprint-schema.json

Additional steps not covered above: `runPHPWithOptions` (run PHP with custom `ini` settings), `runWpInstallationWizard`, and resource types `vfs` and `bundled` (for advanced embedding scenarios).

## Blueprint Bundles

Bundles are self-contained packages that include a `blueprint.json` along with all the resources it references (plugins, themes, WXR files, etc.). Instead of hosting assets externally, bundle them alongside the blueprint.

### Bundle Structure

```
my-bundle/
├── blueprint.json          ← must be at the root
├── my-plugin.zip           ← zipped plugin directory
├── theme.zip
└── content/
    └── sample-content.wxr
```

Plugins and themes must be zipped before bundling — `installPlugin` expects a zip, not a raw directory. To create the zip from a plugin directory:

```bash
cd my-bundle
zip -r my-plugin.zip my-plugin/
```

### Referencing Bundled Resources

Use the `bundled` resource type to reference files within the bundle:

```json
{
  "step": "installPlugin",
  "pluginData": {
    "resource": "bundled",
    "path": "/my-plugin.zip"
  },
  "options": { "activate": true }
}
```

```json
{
  "step": "importWxr",
  "file": {
    "resource": "bundled",
    "path": "/content/sample-content.wxr"
  }
}
```

### Creating a Bundle Step by Step

1. Create the bundle directory and add `blueprint.json` at its root.
2. Write your plugin/theme source files in a subdirectory (e.g. `my-plugin/my-plugin.php`).
3. Zip the plugin directory: `zip -r my-plugin.zip my-plugin/`
4. Reference it in `blueprint.json` using `{ "resource": "bundled", "path": "/my-plugin.zip" }`.

Full example — a bundle that installs a custom plugin:

```
dashboard-widget-bundle/
├── blueprint.json
├── dashboard-widget.zip        ← zip of dashboard-widget/
└── dashboard-widget/           ← plugin source (kept for editing)
    └── dashboard-widget.php
```

```json
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "landingPage": "/wp-admin/",
  "preferredVersions": { "php": "8.3", "wp": "latest" },
  "steps": [
    { "step": "login" },
    {
      "step": "installPlugin",
      "pluginData": { "resource": "bundled", "path": "/dashboard-widget.zip" },
      "options": { "activate": true }
    }
  ]
}
```

### Distribution Formats

| Format | How to use |
|--------|-----------|
| ZIP file (remote) | Website: `https://playground.wordpress.net/?blueprint-url=https://example.com/bundle.zip` |
| ZIP file (local) | CLI: `npx @wp-playground/cli server --blueprint=./bundle.zip` |
| Local directory | CLI: `npx @wp-playground/cli server --blueprint=./my-bundle/ --blueprint-may-read-adjacent-files` |
| Git repository directory | Point `blueprint-url` at a repo directory containing `blueprint.json` |

**GOTCHA:** Local directory bundles always need `--blueprint-may-read-adjacent-files` for the CLI to read bundled resources. Without it, any `"resource": "bundled"` reference will fail with a "File not found" error. ZIP bundles don't need this flag — all files are self-contained inside the archive.

## Testing Blueprints

### Inline Blueprints (quick test, no bundles)

Minify the blueprint JSON (no extra whitespace), prepend `https://playground.wordpress.net/#`, and open the URL in a browser:

```
https://playground.wordpress.net/#{"$schema":"https://playground.wordpress.net/blueprint-schema.json","preferredVersions":{"php":"8.3","wp":"latest"},"steps":[{"step":"login"}]}
```

Very large blueprints may exceed browser URL length limits; use the CLI instead.

### Local CLI Testing

**Interactive server** (keeps running, opens in browser):
```bash
# Directory bundle — requires --blueprint-may-read-adjacent-files
npx @wp-playground/cli server --blueprint=./my-bundle/ --blueprint-may-read-adjacent-files

# ZIP bundle — self-contained, no extra flags needed
npx @wp-playground/cli server --blueprint=./bundle.zip
```

**Headless validation** (runs blueprint and exits):
```bash
npx @wp-playground/cli run-blueprint --blueprint=./my-bundle/ --blueprint-may-read-adjacent-files
```

### Testing with the wordpress-playground-server Skill

Use the `wordpress-playground-server` skill to start a local Playground instance with `--blueprint /path/to/blueprint.json`, then verify the expected state with Playwright MCP. For directory bundles, pass `--blueprint-may-read-adjacent-files` as an extra argument.
