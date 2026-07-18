# Blueprints with Playground CLI 3.1.45

Use Blueprint V2 for new files.

```json
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "version": 2,
  "blueprintMeta": { "name": "Local plugin test site", "description": "A reproducible Playground site" },
  "applicationOptions": { "wordpress-playground": { "login": true, "networkAccess": false } },
  "wordpressVersion": "latest",
  "phpVersion": "8.3",
  "plugins": ["query-monitor"],
  "siteOptions": { "blogname": "Local plugin test site" },
  "additionalStepsAfterExecution": []
}
```

V2 network access defaults to `false`; omit it or set it to `false` for an isolated site. Set it to `true` only when outbound requests are required. `login: true` selects the default Playground admin, and object-form login needs both credentials.

Run a local Blueprint or build a snapshot with the parent skill's CLI commands. Use `--blueprint-may-read-adjacent-files` only when a local Blueprint needs bundled neighboring files. For an existing V1 Blueprint without `version`, see [V1 compatibility](../../blueprint/references/v1-compatibility.md); new V2 files do not use `preferredVersions`, `features`, top-level `login`, or `steps`.
