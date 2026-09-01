# Evaluating third-party plugin compatibility

VIP does **not** maintain a list of pre-approved plugins, and the incompatibilities list VIP does publish is explicitly *not* exhaustive — absence from that list is not a compatibility guarantee.

## Where incompatibilities actually come from

Almost every real-world VIP plugin incompatibility traces back to one of the constraints already covered elsewhere in this skill:

- **Filesystem writes** — a plugin that writes generated files (custom CSS, cached templates, resized images, log files) directly to a local path instead of through `WP_Filesystem`/the uploads API will fail on VIP's read-only web tier (`file-system-and-media.md`).
- **Direct file-manipulation of uploads** — plugins that assume a real directory tree for `wp-content/uploads` (e.g., custom rmdir/chmod logic) will misbehave against the VIP File System's object-store model (`file-system-and-media.md`).
- **Image manipulation assumptions** — plugins that shell out to local image-processing binaries or expect to write intermediate files outside `/tmp/` need adaptation.
- **Restricted functions** — a plugin using an uncached lookup VIP flags (`restricted-functions-and-code-review.md`) isn't necessarily broken, but will show up in code review the same as first-party code would.

Some plugins expose a filter/setting that redirects their writes into `/uploads` instead of an arbitrary local path — when evaluating a flagged plugin, check for that before ruling it out entirely.

## How to actually evaluate a plugin before adding it

1. Check `docs.wpvip.com/plugins/incompatibilities/` for a known issue — but don't stop there; it's a non-exhaustive, explicitly-partial list.
2. Read the plugin's own filesystem/cache-writing behavior in its source (look for `fopen`/`file_put_contents`/direct `wp-content` path writes, `WP_Filesystem` usage, or heavy reliance on local file caching).
3. Install and exercise every feature you actually need on a **non-production environment** (`security-and-access-controls.md` — non-production exists exactly for this). Testing in a non-VIP local environment is not sufficient, because the read-only filesystem and restricted functions are VIP-specific and won't fail locally.
4. If the plugin fails only on a specific feature (e.g., an export-to-file button) and the rest of the plugin is otherwise fine, that's a scoped known-limitation to document, not necessarily a reason to reject the whole plugin.

## Guardrails

- Don't tell a user a plugin is "definitely compatible" solely because it's absent from VIP's incompatibilities list.
- Don't recommend testing a plugin's VIP-specific behavior only in a local/non-VIP environment (wp-env, Local, etc.) — the constraints that actually break plugins on VIP (read-only FS, restricted functions) don't exist in a generic local environment.

## Source

- https://docs.wpvip.com/plugins/incompatibilities/
- https://docs.wpvip.com/plugins/third-party-plugins/
- https://docs.wpvip.com/plugins/installing-plugins/
