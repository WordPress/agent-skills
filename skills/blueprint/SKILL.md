---
name: blueprint
description: Use when creating, editing, or reviewing WordPress Playground Blueprint JSON files.
compatibility: "WordPress 6.9+, PHP 7.2.24+. Optionally Playground CLI or a browser"
license: GPL-2.0-or-later
---

# WordPress Playground Blueprints

## Default: Blueprint V2

Use Blueprint V2 for all new Blueprints. It requires `"version": 2` and uses declarative fields before imperative steps. Validate against the schema; unknown properties are rejected.

```json
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "version": 2,
  "blueprintMeta": {
    "name": "Plugin test site",
    "description": "A reproducible local site for plugin development"
  },
  "applicationOptions": {
    "wordpress-playground": {
      "login": true,
      "networkAccess": false
    }
  },
  "wordpressVersion": "latest",
  "phpVersion": "8.3",
  "plugins": ["query-monitor"],
  "siteOptions": {
    "blogname": "Plugin test site"
  },
  "additionalStepsAfterExecution": []
}
```

| V2 field | Use |
|---|---|
| `version` | Required; set to `2`. |
| `blueprintMeta` | Site metadata, including `name` and `description`. |
| `applicationOptions.wordpress-playground` | Playground-specific `login` and `networkAccess`. |
| `wordpressVersion`, `phpVersion` | Declarative versions; use a supported major.minor PHP value. |
| `plugins`, `siteOptions`, `constants` | Declarative site configuration. |
| `additionalStepsAfterExecution` | Work without a V2 declarative field or with required ordering. |

`applicationOptions.wordpress-playground.networkAccess` defaults to `false` in V2. Keep it omitted or explicitly `false` unless outbound requests are needed. `login: true` selects Playground's default admin login. Object-form login needs both `username` and `password`; neither credential is optional.

For an existing V1 file with no `version`, see the one-hop compatibility reference: [references/v1-compatibility.md](references/v1-compatibility.md).

## Procedural V2 work

Use `additionalStepsAfterExecution` only after exhausting the V2 declarative
fields. Step names, resource shapes, and payload keys are versioned schema
contracts, so validate each procedural entry against the current V2 schema
instead of adapting a V1 `steps` example. Keep ordering-dependent work in this
array and keep setup such as plugins, site options, login, and network policy
declarative.

The V1 resource and step catalog is intentionally isolated in
[references/v1-compatibility.md](references/v1-compatibility.md); do not copy
those V1 forms into a V2 Blueprint.

Local directory bundles need `--blueprint-may-read-adjacent-files` through the CLI; ZIP bundles are self-contained. Before handoff, run the Blueprint and confirm expected plugins, options, network policy, and login state.

See the [Blueprint schema](https://playground.wordpress.net/blueprint-schema.json) and [Playground Blueprint documentation](https://wordpress.github.io/wordpress-playground/blueprints).
