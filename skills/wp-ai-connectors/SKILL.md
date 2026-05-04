---
name: wp-ai-connectors
description: "Use when building a WordPress AI provider plugin that registers with the in-core AI Client (WP 7.0+) so it shows up in Settings → Connectors and becomes available to every plugin using `wp_ai_client_prompt()`. Covers the PHP AI Client provider registry, the Connectors API auto-discovery flow, the `wp_connectors_init` override hook, API key sources (env / constant / database), and the connector array shape. Use this — not `wp-ai-client` — when the user wants to integrate a new AI service (Anthropic, OpenAI, Google, OpenRouter, Ollama, Mistral, custom) at the *provider* level rather than build a feature on top."
compatibility: "Targets WordPress 7.0+ (PHP 7.4+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WP AI Connectors

## When to use

Use this skill when the task involves:

- writing a plugin that integrates a new AI provider (commercial API, self-hosted Ollama, OpenRouter, Mistral, etc.) with the WordPress AI Client,
- overriding metadata for a built-in connector (Anthropic, Google, OpenAI) — for example, customizing the description or pre-filling the credentials URL for an internal deployment,
- diagnosing "my provider plugin is installed but doesn't appear in Settings → Connectors,"
- understanding why a provider's API key is being read from the wrong source (env vs constant vs database).

If the task is to *consume* AI features (build a summarization endpoint, add image generation to a block), route to `wp-ai-client` instead.

## Inputs required

- Repo root (run `wordpress-router` and `wp-project-triage` first).
- Provider being integrated: name, ID slug (lowercase alphanumeric + underscores), authentication method (`api_key` or `none`).
- Models the provider exposes and the modalities each supports.
- Public credentials URL (where users go to get an API key) and a logo URL if you have one.

## Procedure

### 0) Triage and confirm scope

1. Run triage: `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. Confirm this is a *provider* plugin, not a *feature* plugin. The two have different shapes:
   - **Provider plugin**: registers with the `AiClient::defaultRegistry()` so other plugins can use the provider.
   - **Feature plugin**: calls `wp_ai_client_prompt()` to build something. That's `wp-ai-client` territory.
3. Set the plugin header's version requirements. Recommended: `Requires at least: 7.0` and `Requires PHP: 7.4`. The official Anthropic/Google/OpenAI provider plugins set `Requires at least: 6.9` because they bundle `wordpress/php-ai-client` as a Composer dep and use a `class_exists()` guard at registration — choose that path only if you have a clear reason to support 6.9.

### 1) Register with the PHP AI Client provider registry

Provider registration happens at the SDK level, not the WordPress level. The `wordpress/php-ai-client` package (bundled in WP 7.0 Core) maintains a registry accessed via `AiClient::defaultRegistry()`. Your plugin's bootstrap registers a provider class on that registry — passing the class name, not an instance.

The canonical pattern, taken verbatim from `WordPress/ai-provider-for-anthropic` `plugin.php`:

```php
namespace WordPress\AnthropicAiProvider;

use WordPress\AiClient\AiClient;
use WordPress\AnthropicAiProvider\Provider\AnthropicProvider;

function register_provider(): void {
    if ( ! class_exists( AiClient::class ) ) {
        return; // SDK not loaded; AI Client missing or WP < 7.0 without the Composer package.
    }

    $registry = AiClient::defaultRegistry();

    if ( $registry->hasProvider( AnthropicProvider::class ) ) {
        return; // Idempotent — don't double-register.
    }

    $registry->registerProvider( AnthropicProvider::class );
}

add_action( 'init', __NAMESPACE__ . '\\register_provider', 5 );
```

Notes:

- The method is `registerProvider()`, not `register()`. Argument is a class name string, not an instance.
- `class_exists( AiClient::class )` makes the plugin safely activate on sites without the SDK.
- `hasProvider()` makes the registration idempotent.
- `init` priority 5 runs before `_wp_connectors_init` at priority 10. Priorities between `plugins_loaded` and `init` priority 9 also work; `init` priority 5 is what every official provider plugin uses, so match it for consistency.

The provider class itself (`AnthropicProvider` in this example) implements the SDK's provider interface and lives in your plugin's `src/` directory. See `references/provider-registration.md` for the full annotated pattern and where to look in the SDK source for the current interface contract.

### 2) Let auto-discovery handle the connector

Once your provider is in `AiClient::defaultRegistry()`, the Connectors API discovers it automatically and creates the connector entry with the right metadata. **You do not need to call `register()` on the connector registry yourself.** The flow:

1. WordPress fires `init`.
2. `_wp_connectors_init()` runs, registers built-in connectors (Anthropic/Google/OpenAI), then queries `AiClient::defaultRegistry()` for everything else.
3. Your provider's metadata is merged on top of any defaults (provider registry values win).
4. The `wp_connectors_init` action fires, giving plugins a final chance to override.

If your provider used `api_key` auth, the database setting `connectors_ai_{your_id}_api_key` is created automatically and the env var / constant pattern `{YOUR_ID}_API_KEY` (uppercased) is wired up.

### 3) Override metadata only when needed

Use `wp_connectors_init` if you need to change an existing connector's display data — for example, an agency overriding the Anthropic connector description for a white-label install:

```php
add_action( 'wp_connectors_init', function ( WP_Connector_Registry $registry ) {
    if ( $registry->is_registered( 'anthropic' ) ) {
        $connector = $registry->unregister( 'anthropic' );
        $connector['description'] = __( 'Custom description for our managed Anthropic deployment.', 'my-plugin' );
        $registry->register( 'anthropic', $connector );
    }
} );
```

Notes:

- Always `is_registered()` before `unregister()`. Unregistering a missing connector triggers `_doing_it_wrong()`.
- `unregister()` returns the data; mutate it; pass back to `register()`.
- IDs must match `/^[a-z0-9_]+$/`.
- Outside the `wp_connectors_init` callback, query through `wp_get_connector()` / `wp_get_connectors()` — do not access the registry directly.

### 4) Confirm the API key source order

For `api_key` connectors, the AI Client looks up the key in this order. Document this in your provider plugin's readme so admins know:

1. **Environment variable** — `{PROVIDER_ID}_API_KEY` (uppercased)
2. **PHP constant** — `define( '{PROVIDER_ID}_API_KEY', '...' );` in `wp-config.php`
3. **Database** — the `connectors_ai_{provider_id}_api_key` setting, edited via Settings → Connectors

Database storage is unencrypted but masked in the UI. Encryption is being explored upstream ([#64789](https://core.trac.wordpress.org/ticket/64789)).

### 5) Verify the connector card appears

Check Settings → Connectors. You should see a card with your provider's name, description, logo, a "Get API key" link pointing at `authentication.credentials_url`, and a status indicator showing where the key is being read from (or "not configured").

If the connector isn't showing up:

- Confirm the provider class actually registers — add a temporary `error_log()` in your registration callback and reload.
- Confirm the registration runs *before* `_wp_connectors_init` (priority 10 on `init`). Use `init` priority 5 or earlier.
- Confirm the connector ID matches `/^[a-z0-9_]+$/` — uppercase or hyphens silently fail.
- Confirm `type` is `ai_provider`. The Settings → Connectors screen currently only renders that type; other types are stored but not surfaced.

## Verification

- `wp_is_connector_registered( 'your_provider_id' )` returns `true` after `init`.
- `wp_get_connector( 'your_provider_id' )` returns the expected `name`, `description`, `type`, `authentication`, and `plugin.slug` (if set).
- The connector card renders on Settings → Connectors with the correct logo, description, and credentials link.
- Setting an API key via env var, constant, and database (in turn) shows the right source on the card.
- A feature plugin calling `wp_ai_client_prompt()->is_supported_for_text_generation()` returns `true` once your provider is configured.

## Failure modes / debugging

- **Connector doesn't appear**: registration runs too late (after `_wp_connectors_init`), or `type` isn't `ai_provider`, or ID has invalid characters.
- **"Settings → Connectors shows the card but says no key configured" even though `MY_PROVIDER_API_KEY` is set**: confirm the constant/env var name matches `{PROVIDER_ID}_API_KEY` exactly (uppercased ID, `_API_KEY` suffix). The system does not respect alternate naming.
- **Override not taking effect**: hooked too late, or hooked outside `wp_connectors_init`. Setting the registry instance outside `init` triggers `_doing_it_wrong()`.
- **Duplicate-ID error during `register()`**: another plugin already registered that ID. Use `is_registered()` first; if you need to override, follow the unregister-modify-register pattern.
- **Provider works locally but not on a managed host**: the host may have set `MY_PROVIDER_API_KEY` as a sealed env var. Env beats constant beats database — that's the intended priority and the host's value will win.

## Escalation

For canonical detail before inventing patterns:

- Connectors API dev note: https://make.wordpress.org/core/2026/03/18/introducing-the-connectors-api-in-wordpress-7-0/
- AI Client dev note (architecture and provider plugin list): https://make.wordpress.org/core/2026/03/24/introducing-the-ai-client-in-wordpress-7-0/
- PHP AI Client source (registry contract): https://github.com/WordPress/php-ai-client
- Reference provider plugins:
  - https://wordpress.org/plugins/ai-provider-for-anthropic/
  - https://wordpress.org/plugins/ai-provider-for-google/
  - https://wordpress.org/plugins/ai-provider-for-openai/
- Community provider testing call (OpenRouter, Ollama, Mistral patterns): https://make.wordpress.org/ai/2026/03/25/call-for-testing-community-ai-connector-plugins/

References:
- `references/provider-registration.md`
- `references/capabilities-declaration.md`
- `references/community-providers.md`
