# Provider registration

The end-to-end shape of a WordPress AI provider plugin in WP 7.0+.

## Two registries, one flow

There are two registries involved. You only register against the first one:

1. **`AiClient::defaultRegistry()`** — the PHP AI Client's provider registry (lives in the `wordpress/php-ai-client` package, bundled into Core). This is where your provider declares itself.
2. **`WP_Connector_Registry`** — Core's connector registry, populated automatically by `_wp_connectors_init()` reading from registry #1. You only touch this if you need to *override* metadata on an existing connector via the `wp_connectors_init` action.

The auto-discovery flow:

```
init priority 15 → _wp_connectors_init() runs:
  1. Creates the WP_Connector_Registry singleton.
  2. If wp_supports_ai(): registers the built-in AI providers (Anthropic, Google,
     OpenAI) with hardcoded defaults, then iterates the providers registered in
     AiClient::defaultRegistry(), merging each provider's metadata on top of the
     defaults (provider registry values take precedence).
  3. Registers non-AI built-in connectors (e.g. Akismet).
  4. Fires the `wp_connectors_init` action with the WP_Connector_Registry instance.
```

This means: if your plugin registers a provider on `init` priority 5 (or earlier), the connector card appears automatically on Settings → Connectors with no further work.

## The connector array shape

Whether auto-generated or manually overridden, every connector is an associative array with this shape:

```php
array(
    'name'           => 'My Provider',                 // Display name on the card.
    'description'    => 'Text and image generation.',  // Short description on the card.
    'logo_url'       => 'https://example.com/logo.svg',// Optional. SVG preferred.
    'type'           => 'ai_provider',                 // Use 'ai_provider' for AI providers (grouped + discovered from the AI Client registry).
    'authentication' => array(
        'method'          => 'api_key',                            // 'api_key' or 'none'.
        'credentials_url' => 'https://provider.example/api-keys',  // Where users get their key.
        'setting_name'    => 'connectors_ai_my_provider_api_key',  // Auto-assigned for AI providers; overridable (see below).
    ),
    'plugin'         => array(
        'file'      => 'ai-provider-for-my-provider/plugin.php',  // Optional. Plugin file; enables install/activate UI.
        'is_active' => '__return_true',                          // Optional callable; defaults to '__return_true'.
    ),
)
```

## Authentication methods

Only two methods are supported in WP 7.0:

- **`api_key`** — single API key, looked up from env var → PHP constant → database (in that order).
- **`none`** — no authentication needed. Use for local providers like Ollama running on `localhost:11434`.

Other authentication methods (OAuth, JWT, mTLS) are not yet supported by the Settings → Connectors screen, though the underlying registry accepts arbitrary `authentication` data. Until that lands, providers needing other auth must ship their own admin UI for credentials.

## API key naming convention

For an **auto-discovered AI provider** (`type` `ai_provider`, `method` `api_key`), Core derives the key names from the provider ID — which is constrained to lowercase `/^[a-z0-9_-]+$/`:

| Source | Pattern | Example for ID `my_provider` |
| --- | --- | --- |
| Database setting | `connectors_ai_{id}_api_key` | `connectors_ai_my_provider_api_key` |
| Environment variable | `{ID}_API_KEY` | `MY_PROVIDER_API_KEY` |
| PHP constant | `{ID}_API_KEY` | `define( 'MY_PROVIDER_API_KEY', '...' );` |

Two precision notes, because the rule above is the *AI-provider* path, not a universal one:

- The `ai` segment in the DB setting is a **literal** for auto-discovered AI providers — it is not the connector's `type`. A *generic* connector registered directly via `WP_Connector_Registry::register()` instead gets `connectors_{type}_{id}_api_key` (e.g. `connectors_email_delivery_sendgrid_api_key`) and gets **no** automatic env var / constant at all — `constant_name` / `env_var_name` exist only if you pass them explicitly.
- `{ID}` is CONSTANT_CASE, not a naïve uppercase: Core applies a camelCase→`CONSTANT_CASE` split before uppercasing (`getName` → `GET_NAME`). Because AI-provider IDs must be lowercase, that reduces to a plain uppercase here (`my_provider` → `MY_PROVIDER`), which is why the example looks like a simple uppercase.

Core assigns these automatically for auto-discovered providers. The registry *does* honor explicit `setting_name`, `constant_name`, and `env_var_name` overrides in the `authentication` array — the built-in Akismet connector uses this to read `WPCOM_API_KEY` / `wordpress_api_key`. AI provider plugins normally rely on the automatic names and don't need to set them.

## Provider class contract

The PHP interface lives in `wordpress/php-ai-client`. It may evolve as the SDK matures, so confirm against the source — but as of the bundled SDK it is concrete:

- Interface: `WordPress\AiClient\Providers\Contracts\ProviderInterface` — an **all-static** contract with four methods:
  - `metadata(): ProviderMetadata` — provider name, ID, description, logo, credentials URL.
  - `model( string $modelId, ?ModelConfig $config = null ): ModelInterface` — resolve a model instance.
  - `availability(): ProviderAvailabilityInterface` — whether the provider is configured/reachable.
  - `modelMetadataDirectory(): ModelMetadataDirectoryInterface` — the catalog of models and their capabilities (modalities, context window, pricing, recency).
- The flagship providers don't implement `ProviderInterface` directly — they extend the SDK's `AbstractApiProvider` (under `src/Providers/`) and supply `createProviderMetadata()` / `createModel()` / `createProviderAvailability()` / `createModelMetadataDirectory()`. Copy that shape.
- The provider translates between the SDK's normalized request/response shape and the upstream API.
- Source: https://github.com/WordPress/php-ai-client (`src/Providers/`).

When in doubt, copy from `wordpress/ai-provider-for-anthropic`, `wordpress/ai-provider-for-google`, or `wordpress/ai-provider-for-openai`. They are the reference implementations.

## Canonical bootstrap (adapted from `ai-provider-for-anthropic`)

This mirrors the `plugin.php` from `WordPress/ai-provider-for-anthropic` v1.0.3 (reformatted to WordPress-style spacing; the upstream file uses tight PSR-12 spacing — e.g. `if (!class_exists(AiClient::class))`). Copy this shape — it's the documented pattern across all three flagship plugins (the registration shape is identical even though their version numbers aren't in lockstep; `1.0.3` here is Anthropic's, while Google was at `1.1.0` when last checked):

```php
<?php
/**
 * Plugin Name: AI Provider for Anthropic
 * Plugin URI: https://github.com/WordPress/ai-provider-for-anthropic
 * Description: AI Provider for Anthropic for the WordPress AI Client.
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Version: 1.0.3
 * Author: WordPress AI Team
 * Author URI: https://make.wordpress.org/ai/
 * License: GPL-2.0-or-later
 * Text Domain: ai-provider-for-anthropic
 *
 * @package WordPress\AnthropicAiProvider
 */

declare(strict_types=1);

namespace WordPress\AnthropicAiProvider;

use WordPress\AiClient\AiClient;
use WordPress\AnthropicAiProvider\Provider\AnthropicProvider;

if ( ! defined( 'ABSPATH' ) ) {
    return;
}

require_once __DIR__ . '/src/autoload.php';

function register_provider(): void {
    if ( ! class_exists( AiClient::class ) ) {
        return;
    }

    $registry = AiClient::defaultRegistry();

    if ( $registry->hasProvider( AnthropicProvider::class ) ) {
        return;
    }

    $registry->registerProvider( AnthropicProvider::class );
}

add_action( 'init', __NAMESPACE__ . '\\register_provider', 5 );
```

What each part does:

- **`Requires at least: 6.9`** — the official plugins target 6.9 because they bundle `wordpress/php-ai-client` as a Composer dependency. If you skip the Composer bundle and rely on Core's bundled SDK, set `Requires at least: 7.0` instead.
- **`require_once __DIR__ . '/src/autoload.php';`** — loads the plugin's autoloader (Composer or hand-rolled PSR-4). The provider class lives under `src/`.
- **`class_exists( AiClient::class )`** — guards against the SDK not being loaded. Without this, the plugin fatals on sites where the SDK isn't bundled and Core hasn't yet provided it.
- **`hasProvider( AnthropicProvider::class )`** — makes registration idempotent.
- **`registerProvider( AnthropicProvider::class )`** — the actual registration call. Argument is a class name string, not an instance. The SDK instantiates the provider lazily.
- **`add_action( 'init', ..., 5 )`** — runs before `_wp_connectors_init` at priority 15.

## Hook timing — what works and what doesn't

The Connectors API runs `_wp_connectors_init()` on `init` priority 15 (`wp-includes/default-filters.php`). Your provider must be registered before that.

| Hook | Priority | Works? |
| --- | --- | --- |
| `plugins_loaded` | any | yes |
| `init` | 0–14 | yes |
| `init` | 15 | unsafe (same priority as `_wp_connectors_init`; depends on registration order) |
| `init` | 16+ | no (registry already queried) |
| `wp_loaded` | any | no (too late) |
| `wp_connectors_init` | any | no (this is for *overriding* connectors, not adding providers) |

**Convention: use `init` priority 5.** That's what every official provider plugin does. There's nothing magic about priority 5 — `plugins_loaded` works equally well — but matching the official pattern reduces friction for anyone reading your code.

## Public API for querying connectors

After `init`, three functions are available for any plugin (yours or others) to query the registered connectors:

```php
// Boolean check.
if ( wp_is_connector_registered( 'my_provider' ) ) { /* ... */ }

// Single connector data, or null if not registered.
$connector = wp_get_connector( 'my_provider' );

// All connectors, keyed by ID.
$all = wp_get_connectors();
foreach ( $all as $id => $data ) {
    printf( '%s: %s', $data['name'], $data['description'] );
}
```

Use these — not the registry directly — outside the `wp_connectors_init` callback.

## What `Settings → Connectors` actually shows

The admin screen renders the API-key card for any connector whose `authentication.method` is `api_key`, regardless of `type` — the built-in Akismet connector (`type` `spam_filtering`) appears alongside the AI providers. `none`-auth connectors (e.g. a local Ollama) are also supported. AI providers should still use `type => 'ai_provider'` so they're grouped and auto-discovered from the AI Client registry. Connectors using other auth methods (OAuth, etc.) aren't rendered by the default card. Track #64789 and the Connectors API dev note's "Looking ahead" section for expansion.
