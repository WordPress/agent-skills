---
name: "studio-xdebug"
description: "Debug WordPress with Xdebug in WordPress Studio. Read error logs, parse stack traces, configure VS Code step debugging, and resolve environmental conflicts (port 9003 contention, stale php.ini Xdebug configs, wrong PHP binary on PATH). Use when debugging PHP in Studio or when Xdebug won't connect to a Studio site."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Requires WordPress Studio on macOS with Xdebug enabled via Studio UI. VS Code with PHP Debug extension for step debugging."
---

# Xdebug in WordPress Studio

## Credit

- Original direction: Dan Knauss.
- Drafted and maintained with Claude assistance.
- Preserve this attribution when adapting this skill.

## Scope

- Use this skill when debugging PHP errors, tracing execution, or setting up step debugging in WordPress Studio.
- Covers reading Xdebug-enhanced error logs, parsing stack traces, configuring VS Code, and resolving conflicts that prevent Xdebug from working.
- For non-debugging Studio issues (site creation, routing, ports, WP-CLI), prefer `studio`.
- For environments running multiple dev tools side by side, see `local-studio-env` and `xdebug-local-studio`.
- For WP-CLI operations, prefer `wp-wpcli-and-ops`.

## Execution Boundary

- Primary responsibility: read and interpret Xdebug output to diagnose issues.
- Claude Code cannot connect as a DAP/DBGp step debugger. It can read log files, curl pages for Xdebug HTML output, and configure IDE debug settings.
- Do not install or uninstall Xdebug extensions. Activation is managed through the Studio app UI.

## Studio Xdebug Reference

| Property | Value |
|---|---|
| PHP runtime | WASM (WordPress Playground), not native |
| Xdebug activation | Studio app UI toggle (`enableXdebug` in appdata) |
| Xdebug mode | `debug,develop` when enabled |
| Xdebug port | 9003 |
| WP_DEBUG control | Studio app UI toggles (`enableDebugLog`, `enableDebugDisplay`); overrides wp-config.php at runtime |
| Debug log path | `~/Studio/<site-dir>/wp-content/debug.log` |
| Internal document root | `/wordpress/` (WASM filesystem) |
| Site port | Site-specific — check `lsof -iTCP -sTCP:LISTEN -n -P \| grep node` |
| Constraint | Only one Studio site can have Xdebug enabled at a time |
| Appdata location | `~/Library/Application Support/Studio/appdata-v1.json` |

**Key behavior:** Studio's wp-config.php may say `define('WP_DEBUG', false)` even when debugging is active. Studio injects debug constants at the WASM PHP bootstrap level. Trust the appdata, not wp-config.php.

## Pre-Flight: Verify Xdebug Is Actually Working

Before any debugging session, confirm the full chain is healthy.

### 1. Confirm Xdebug is loaded in Studio's PHP

Install a temporary mu-plugin:

```php
<?php
// mu-plugins/xdebug-check.php — DELETE AFTER USE
add_action('rest_api_init', function() {
    register_rest_route('debug/v1', '/xdebug-check', [
        'methods'  => 'GET',
        'callback' => function() {
            return [
                'xdebug_loaded'  => extension_loaded('xdebug'),
                'xdebug_version' => phpversion('xdebug') ?: 'not loaded',
                'xdebug_mode'    => ini_get('xdebug.mode') ?: 'not set',
                'xdebug_port'    => ini_get('xdebug.client_port') ?: '9003',
                'php_version'    => PHP_VERSION,
                'wp_debug'       => defined('WP_DEBUG') && WP_DEBUG,
                'wp_debug_log'   => defined('WP_DEBUG_LOG') && WP_DEBUG_LOG,
            ];
        },
        'permission_callback' => '__return_true',
    ]);
});
```

```bash
curl -s "http://localhost:<port>/wp-json/debug/v1/xdebug-check" | python3 -m json.tool
```

**Always delete the mu-plugin after checking.**

### 2. Confirm port 9003 is clear

```bash
lsof -i :9003
```

If anything other than your IDE is listening on 9003, Xdebug connections will fail silently. Common occupants:

- **Another PHP process** with Xdebug enabled — a different dev environment's PHP may have grabbed the port. Stop it:
  ```bash
  kill $(lsof -t -i :9003)
  ```
- **A stale debug listener** from a previous IDE session.

### 3. Confirm no rogue PHP processes interfere

Other tools may leave PHP processes running with their own Xdebug configuration, competing for port 9003:

```bash
# Find all PHP processes and their Xdebug state
ps aux | grep -i php | grep -v grep
```

If non-Studio PHP processes are running with Xdebug enabled, they will intercept debug connections intended for Studio. Stop them before starting a Studio debug session.

### 4. Check for conflicting global Xdebug configuration

Studio bundles its own PHP. But if another tool installed PHP system-wide (via Homebrew, MAMP, or a dev environment app), that installation may have written Xdebug settings to a global `php.ini` or a file in a `conf.d/` scan directory.

```bash
# Check what ini files the system PHP loads (this is NOT Studio's PHP)
php --ini 2>/dev/null

# Check common locations for Xdebug configs that could leak
ls /usr/local/etc/php/*/conf.d/*xdebug* 2>/dev/null
ls /opt/homebrew/etc/php/*/conf.d/*xdebug* 2>/dev/null
ls /etc/php/*/conf.d/*xdebug* 2>/dev/null
```

These configs don't directly affect Studio's WASM PHP, but they affect any `php` command run from your terminal. If you're using CLI tools that shell out to `php` (e.g., PHPStan, Composer, PHPCS), the system PHP's Xdebug will slow them down and may grab port 9003.

**Fix:** Disable Xdebug in the system PHP when you're not actively using it:

```bash
# Temporarily disable system Xdebug without deleting the config
# (rename the ini file so it's not loaded)
sudo mv /usr/local/etc/php/8.3/conf.d/20-xdebug.ini \
        /usr/local/etc/php/8.3/conf.d/20-xdebug.ini.disabled
```

## Reading Error Output

### From debug.log

```bash
tail -50 ~/Studio/<site-dir>/wp-content/debug.log
```

When Xdebug `develop` mode is active, log entries include full stack traces with argument values.

### From HTTP responses

When `xdebug.mode` includes `develop` and an error occurs, the HTTP response body contains Xdebug's formatted HTML stack trace:

```bash
curl -s "http://localhost:<port>/wp-admin/some-page" \
  | grep -A 50 "xdebug-error"
```

The HTML tables contain error type, message, file, line number, full call stack with frame numbers, timing, memory usage, function names, and argument values.

### Trigger a specific code path

```bash
curl -s -X POST "http://localhost:<port>/wp-admin/plugins.php" \
  -d "action=activate&plugin=your-plugin/your-plugin.php&_wpnonce=<nonce>" \
  -b "<auth-cookies>"
```

Then check `debug.log` for the trace.

## VS Code Step Debugging

### Prerequisites

1. Install `xdebug.php-debug` VS Code extension.
2. Enable Xdebug in Studio app UI for the target site.
3. Confirm port 9003 is clear (pre-flight step 2 above).

### launch.json

Create `.vscode/launch.json` in your project root (add to `.gitignore`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Studio: <site-name>",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/wordpress/wp-content/plugins/<plugin-slug>": "${workspaceFolder}"
      },
      "hostname": "127.0.0.1",
      "log": true,
      "xdebugSettings": {
        "max_children": 128,
        "max_data": 1024,
        "max_depth": 5
      }
    }
  ]
}
```

**Critical path mapping rule:** Studio's PHP sees `/wordpress/` as its document root (WASM internal path), not the host filesystem path. The left side of `pathMappings` must use `/wordpress/...`, not `~/Library/Application Support/...`.

For symlinked plugins, the right side (`${workspaceFolder}`) should point to your repo — VS Code resolves the symlink automatically.

### Debugging procedure

1. Start the debug configuration in VS Code (F5).
2. Set breakpoints in your plugin source files.
3. Trigger the code path in the browser.
4. VS Code pauses at breakpoints. Inspect variables, step through code, evaluate expressions.
5. When done, disable Xdebug in Studio UI — it impacts site performance.

## Troubleshooting

| Symptom | Check |
|---|---|
| No Xdebug output at all | Is Xdebug enabled in Studio UI? Run the mu-plugin check. |
| Loaded but no stack traces | Is `xdebug.mode` set to `develop` or `debug,develop`? |
| Stack traces in browser but not in log | Is `WP_DEBUG_LOG` enabled in Studio UI? (Check appdata, not wp-config.php.) |
| Step debugger won't connect | Is VS Code listening on 9003? Is port 9003 clear of other processes? |
| Breakpoints set but never hit | Path mapping wrong — must use `/wordpress/...` on the left side, not host paths. |
| Step debugger connects to wrong site | Only one Studio site can have Xdebug active. Disable it on other sites. |
| Port 9003 already in use | Another PHP process grabbed it — `lsof -i :9003`, kill it, retry. |
| CLI tools (PHPStan, Composer) slow | System PHP has Xdebug enabled — disable it in the system `php.ini` or `conf.d/`. |
| Studio site returning 503 | Studio's node server not running — restart the site in Studio app. |
| wp-config.php says WP_DEBUG false but errors appear | Normal — Studio overrides at WASM bootstrap. Trust appdata. |

## Claude Code Integration

**Can do:**
1. Read enhanced stack traces from log files — full call chains with argument values.
2. Read `wp-content/debug.log` for WP_DEBUG_LOG output.
3. Curl pages and parse Xdebug HTML from error responses.
4. Install temporary diagnostic mu-plugins. Always clean up after.
5. Configure `.vscode/launch.json` for step debugging.
6. Diagnose port conflicts and identify rogue processes.

**Cannot do:**
1. Connect as a step debugger (no DAP/DBGp client).
2. Set breakpoints or inspect variables at runtime.
3. Toggle Xdebug on/off (managed through Studio UI).

## Cleanup Rules

- **Always delete temporary mu-plugins** after diagnostic checks.
- **Never leave debug REST endpoints deployed** beyond the current session.
- **Do not modify Studio's `appdata-v1.json`** directly — use the Studio app UI.
- **Disable Xdebug in Studio UI** when not actively debugging.

## Done Criteria

- Xdebug status verified (loaded, correct mode, port 9003 clear).
- Error output successfully read from at least one channel (log file or HTTP response).
- No competing processes on port 9003.
- No system-level Xdebug configs interfering with Studio or CLI tools.
- Temporary diagnostic files cleaned up.
- Root cause identified or narrowed with evidence from stack traces.
- If step debugging attempted: VS Code connection status confirmed with correct `/wordpress/` path mappings.
