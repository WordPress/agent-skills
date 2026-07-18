# Blueprint V1 compatibility

Use this reference only to maintain a Blueprint that has no `version`. New work uses V2 in the parent skill.

V1 omits `version`, uses `preferredVersions`, `features.networking`, top-level `login`, and `steps`; it does not use `blueprintMeta`, `applicationOptions`, or `additionalStepsAfterExecution`.

```json
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "preferredVersions": { "php": "8.3", "wp": "latest" },
  "features": { "networking": true },
  "login": true,
  "steps": []
}
```

Networking is version-specific: V1 `features.networking` defaults to `true`, while V2 `applicationOptions.wordpress-playground.networkAccess` defaults to `false`.

V1 supports these exact login forms:

```json
{ "login": true }
```

```json
{ "login": { "username": "admin", "password": "password" } }
```

Boolean `true` selects Playground's default admin login. Object-form login requires both credentials.

## V1 top-level fields

| Property | Purpose |
|---|---|
| `landingPage` | Relative route such as `/wp-admin/`. |
| `meta` | `{ title, author, description?, categories? }`; title and author are required. |
| `preferredVersions` | `{ php, wp }`; use major.minor PHP values such as `"8.3"`. |
| `features` | `{ networking?, intl? }`; networking defaults to `true`. |
| `extraLibraries` | Libraries such as `wp-cli`. |
| `constants`, `plugins`, `siteOptions`, `login` | Shorthands expanded before `steps` in unspecified order. |
| `steps` | Imperative pipeline. |

`preferredVersions.php` accepts major.minor values or `latest`; patch versions are
invalid. `preferredVersions.wp` accepts supported WordPress versions, `latest`,
`nightly`, `beta`, or a custom ZIP URL. Use explicit `steps` when ordering
matters because shorthand expansion order is unspecified.

## Resource references

V1 steps use these resources for plugins, themes, files, imports, and bundles.

| Resource type | Required fields | Example |
|---|---|---|
| `wordpress.org/plugins` | `slug` | `{ "resource": "wordpress.org/plugins", "slug": "woocommerce" }` |
| `wordpress.org/themes` | `slug` | `{ "resource": "wordpress.org/themes", "slug": "astra" }` |
| `url` | `url` | `{ "resource": "url", "url": "https://example.com/plugin.zip" }` |
| `git:directory` | `url`, `ref` | Git checkout directory; set `refType` for named refs. |
| `literal` | `name`, `contents` | `{ "resource": "literal", "name": "file.txt", "contents": "hello" }` |
| `literal:directory` | `name`, `files` | Nested directory tree whose leaves are strings. |
| `bundled` | `path` | File inside a Blueprint bundle. |
| `zip` | `inner` | Wraps another resource when an operation requires a ZIP. |

### Git directories

```json
{
  "resource": "git:directory",
  "url": "https://github.com/WordPress/gutenberg",
  "ref": "trunk",
  "refType": "branch",
  "path": "/"
}
```

For branch or tag refs, set `refType` to `branch`, `tag`, `commit`, or
`refname`; only `HEAD` resolves reliably without it. `path` selects a
subdirectory and defaults to the repository root.

### Literal directory trees

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

Use nested objects for directories. File contents must be plain strings; do not
put resource references or path separators in `files` keys.

## V1 step catalog

Every V1 step requires `"step": "<name>"`. A step can include
`"progress": { "weight": 1, "caption": "Installing..." }` for UI feedback.

### Plugin and theme installation

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

Use `pluginData` and `themeData`, not the older `pluginZipFile` or
`themeZipFile`. Each accepts a file or directory resource such as a ZIP URL,
wordpress.org resource, `git:directory`, or `literal:directory`.
`options.activate` avoids a separate activation step. `ifAlreadyInstalled` is
`overwrite`, `skip`, or `error`.

### Activation and file operations

```json
{ "step": "activatePlugin", "pluginPath": "my-plugin/my-plugin.php" }
```

```json
{ "step": "activateTheme", "themeFolderName": "twentytwentyfour" }
```

```json
{ "step": "writeFile", "path": "/wordpress/wp-content/mu-plugins/custom.php", "data": "<?php // code" }
```

`writeFile.data` is a plain string or a file resource.

```json
{
  "step": "writeFiles",
  "writeToPath": "/wordpress/wp-content/plugins/",
  "filesTree": {
    "resource": "literal:directory",
    "name": "my-plugin",
    "files": {
      "plugin.php": "<?php /* Plugin Name: My Plugin */ ?>",
      "includes": { "helpers.php": "<?php // helpers" }
    }
  }
}
```

`writeFiles.filesTree` requires a `literal:directory` or `git:directory`;
other V1 file operations are `mkdir`, `cp`, `mv`, `rm`, `rmdir`, and `unzip`.

### Code, SQL, and configuration

```json
{ "step": "runPHP", "code": "<?php require '/wordpress/wp-load.php'; update_option('key', 'value');" }
```

Require `/wordpress/wp-load.php` before calling WordPress functions in
`runPHP` code.

```json
{ "step": "wp-cli", "command": "wp post create --post_type=page --post_title='Hello' --post_status=publish" }
```

The step name is `wp-cli`, not `cli` or `wpcli`.

```json
{ "step": "runSql", "sql": { "resource": "literal", "name": "q.sql", "contents": "UPDATE wp_options SET option_value='val' WHERE option_name='key';" } }
```

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

### Other V1 steps

```json
{ "step": "importWordPressFiles", "wordPressFilesZip": { "resource": "bundled", "path": "/wordpress-files.zip" }, "pathInZip": "/wordpress" }
```

```json
{ "step": "request", "request": { "url": "https://example.com", "method": "GET" } }
```

```json
{ "step": "updateUserMeta", "userId": 1, "meta": { "locale": "en_US" } }
```

| Step | Key payload contract |
|---|---|
| `enableMultisite` | No required properties. |
| `importWxr` | `file` (FileReference). |
| `importThemeStarterContent` | Optional `themeSlug`. |
| `importWordPressFiles` | `wordPressFilesZip`; optional `pathInZip`. |
| `request` | `request: { url, method?, headers?, body? }`. |
| `updateUserMeta` | `userId` and `meta`. |
| `runWpInstallationWizard` | Optional `options`. |
| `resetData` | No required properties. |

### Bundles

A V1 bundle keeps `blueprint.json` at its root alongside referenced assets.
Use a bundled resource for a plugin archive or WXR file:

```json
{
  "step": "installPlugin",
  "pluginData": { "resource": "bundled", "path": "/my-plugin.zip" },
  "options": { "activate": true }
}
```

Local directory bundles require `--blueprint-may-read-adjacent-files` through
the CLI; ZIP bundles are self-contained. Follow the current Playground CLI
reference for commands rather than reviving legacy CLI flags.

## Common V1 mistakes

| Mistake | Correct |
|---|---|
| `pluginZipFile` / `themeZipFile` | `pluginData` / `themeData` |
| `"step": "cli"` | `"step": "wp-cli"` |
| Flat `writeFiles.filesTree` object | Use a `literal:directory` or `git:directory` resource |
| `runPHP` without `wp-load.php` | Require it before WordPress functions |
| Missing `refType` for a named Git ref | Set `branch`, `tag`, `commit`, or `refname` |
| Invented `features` key | V1 supports only `networking` and `intl` |
| Object login with one credential | Supply both `username` and `password` |

To migrate a substantial V1 edit, add `"version": 2`, convert `preferredVersions` to `wordpressVersion` and `phpVersion`, move `meta` to `blueprintMeta`, move networking and login under `applicationOptions.wordpress-playground`, and keep remaining procedural work in `additionalStepsAfterExecution`.
