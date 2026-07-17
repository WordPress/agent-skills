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

## V1 field and step catalog

| Property | Purpose |
|---|---|
| `landingPage` | Relative route such as `/wp-admin/`. |
| `meta` | `{ title, author, description?, categories? }`; title and author are required. |
| `preferredVersions` | `{ php, wp }`; use major.minor PHP values. |
| `features` | `{ networking?, intl? }`; networking defaults to `true`. |
| `extraLibraries` | Libraries such as `wp-cli`. |
| `constants`, `plugins`, `siteOptions`, `login` | Shorthands expanded before `steps` in unspecified order. |
| `steps` | Imperative pipeline. |

Common V1 steps are `installPlugin`, `installTheme`, `activatePlugin`, `activateTheme`, `writeFile`, `writeFiles`, `runPHP`, `wp-cli`, `runSql`, `setSiteOptions`, `defineWpConfigConsts`, `setSiteLanguage`, `defineSiteUrl`, `enableMultisite`, `importWxr`, `importWordPressFiles`, `request`, `updateUserMeta`, and `resetData`.

To migrate a substantial V1 edit, add `"version": 2`, convert `preferredVersions` to `wordpressVersion` and `phpVersion`, move `meta` to `blueprintMeta`, move networking and login under `applicationOptions.wordpress-playground`, and keep remaining procedural work in `additionalStepsAfterExecution`.
