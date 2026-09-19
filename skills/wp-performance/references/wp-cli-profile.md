# WP-CLI profiling (`wp profile`)

Use this when you need actionable profiling without a browser.

## Install (if missing)

`wp profile` comes from a WP-CLI package:

- `wp package install wp-cli/profile-command`

Docs:

- https://wpcli.dev/docs/profile/stage
- https://wpcli.dev/docs/profile/hook
- https://wpcli.dev/docs/profile/eval

## Recommended sequence

1. Stage overview:
   - `wp profile stage --fields=stage,time,cache_ratio [--url=<url>]`
2. Hooks hotspot:
   - `wp profile hook --spotlight [--url=<url>]`
   - then drill into a specific hook:
     - `wp profile hook init --spotlight [--url=<url>]`
3. Targeted evaluation:
   - `wp profile eval 'do_action(\"init\");' --hook=init`

## `--fields` column names differ per command

`--fields` only accepts columns that exist in that command's table. A wrong name does not give a clean error: profile-command crashes with a PHP TypeError (`Unsupported operand types: string + null` in `Formatter.php`; seen on PHP 8.4, WP-CLI 2.12, profile-command).

| Command | First column | Other columns |
| --- | --- | --- |
| `wp profile stage` | `stage` | `time`, `query_time`, `query_count`, `cache_ratio`, `cache_hits`, `cache_misses`, `hook_time`, `hook_count`, `request_time`, `request_count` |
| `wp profile stage <stage>` and `wp profile hook --spotlight` | `hook` | `callback_count`, `time`, `query_time`, `query_count`, `cache_ratio`, `cache_hits`, `cache_misses`, `request_time`, `request_count` |
| `wp profile hook <hook>` and `wp profile hook --all` | `callback` | `location`, `time`, `query_time`, `query_count`, `cache_ratio`, `cache_hits`, `cache_misses`, `request_time`, `request_count` |

If unsure, run the command once without `--fields` to see the header.

Tips:

- Add `--allow-root` when running as root.
- Use `--url` to profile specific site/route behavior.
- Use `--skip-plugins` / `--skip-themes` to isolate culprit components (careful: behavior changes).

