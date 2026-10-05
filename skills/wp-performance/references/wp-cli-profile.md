# WP-CLI profiling (`wp profile`)

Use this when you need actionable profiling without a browser.

## Install (if missing)

`wp profile` comes from a WP-CLI package. Check `wp cli version`, then choose a compatible released version.
For WP-CLI 2.12.x, for example:

- `wp package install wp-cli/profile-command:v2.1.1`

An unversioned install can select a development branch that requires a newer WP-CLI.
For other WP-CLI versions, check the release's `composer.json` requirements before installing.
The `:@stable` constraint selects a stable release but does not guarantee compatibility with an older WP-CLI.

Docs:

- Package installation and authentication: https://developer.wordpress.org/cli/commands/package/install/
- Example release requirements: https://github.com/wp-cli/profile-command/blob/v2.1.1/composer.json
- https://wpcli.dev/docs/profile/stage
- https://wpcli.dev/docs/profile/hook
- https://wpcli.dev/docs/profile/eval

## Recommended sequence

1. Stage overview:
   - `wp profile stage --fields=stage,time,cache_ratio [--url=<url>]`
   - then drill into the slowest stage, for example:
     - `wp profile stage bootstrap --fields=hook,time,cache_ratio --spotlight [--url=<url>]`
2. Hooks hotspot:
   - `wp profile hook --spotlight [--url=<url>]`
   - then drill into a specific hook:
     - `wp profile hook init --spotlight [--url=<url>]`
3. Targeted evaluation:
   - `wp profile eval 'do_action("init");' --hook=init`

Tips:

- Use `--url` to profile specific site/route behavior.
- Use `--skip-plugins` / `--skip-themes` to isolate culprit components (careful: behavior changes).

