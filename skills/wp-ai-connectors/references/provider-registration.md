# Provider registration

The end-to-end shape of a WordPress AI provider plugin in WP 7.0+.

## Two registries, one flow

There are two registries involved. You only register against the first one:

1. **`AiClient::defaultRegistry()`** — the PHP AI Client's provider registry (lives in the `wordpress/php-ai-client` package, bundled into Core). This is where your provider declares itself.
2. **`WP_Connector_Registry`** — Core's connector registry, populated automatically by `_wp_connectors_init()` reading from registry #1. You only touch this if you need to *override* metadata on an existing connector via the `wp_connectors_init` action.

The auto-discovery flow:

```
init priority 10 → _wp_connectors_init() runs:
  1. Registers built-in connectors (Anthropic, Google, OpenAI) with hardcoded defaults.
  2. Iterates AiClient::defaultRegistry()->getProviders().
  3. For each provider, builds a connector array; merges metadata on top of any defaults
     (provider registry values take precedence).
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
    'type'           => 'ai_provider',                 // Currently the only type rendered on the screen.
    'authentication' => array(
        'method'          => 'api_key',                            // 'api_key' or 'none'.
        'credentials_url' => 'https://provider.example/api-keys',  // Where users get their key.
        'setting_name'    => 'connectors_ai_my_provider_api_key',  // Auto-generated; don't customize.
    ),
    'plugin'         => array(
        'slug' => 'ai-provider-for-my-provider',  // Optional. Enables install/activate UI.
    ),
)
```

## Authentication methods

Only two methods are supported in WP 7.0:

- **`api_key`** — single API key, looked up from env var → PHP constant → database (in that order).
- **`none`** — no authentication needed. Use for local providers like Ollama running on `localhost:11434`.

Other authentication methods (OAuth, JWT, mTLS) are not yet supported by the Settings → Connectors screen, though the underlying registry accepts arbitrary `authentication` data. Until that lands, providers needing other auth must ship their own admin UI for credentials.

## API key naming convention

For `api_key` connectors, names are derived from the provider ID (lowercase alphanumeric + underscores):

| Source | Pattern | Example for ID `my_provider` |
| --- | --- | --- |
| Database setting | `connectors_ai_{id}_api_key` | `connectors_ai_my_provider_api_key` |
| Environment variable | `{ID}_API_KEY` (uppercased) | `MY_PROVIDER_API_KEY` |
| PHP constant | `{ID}_API_KEY` (uppercased) | `define( 'MY_PROVIDER_API_KEY', '...' );` |

These naming patterns are not configurable — overriding `setting_name` in the connector array does not work.

## Provider class contract

The exact PHP interface lives in `wordpress/php-ai-client` and may evolve as the SDK matures. Read the source rather than memorizing it:

- Source: https://github.com/WordPress/php-ai-client
- Look for the `ProviderInterface` (or equivalent) and the existing flagship provider implementations under `src/Providers/` for working examples.

The shape is roughly:

- A class with a static or instance method that returns the provider's metadata (name, ID, description, logo, credentials URL).
- A method to list available models with their capabilities (modalities supported, context window, pricing, recency).
- A method to execute a request given a normalized prompt builder result and an authenticated credential.
- The provider is expected to translate from the SDK's normalized request shape to the upstream API and back.

When in doubt, copy from `wordpress/ai-provider-for-anthropic`, `wordpress/ai-provider-for-google`, or `wordpress/ai-provider-for-openai`. They are the reference implementations.

## Canonical bootstrap (verbatim from `ai-provider-for-anthropic`)

This is the actual `plugin.php` from `WordPress/ai-provider-for-anthropic` v1.0.2. Copy this shape — it's the documented pattern across all three flagship plugins:

```php
<?php
/**
 * Plugin Name: AI Provider for Anthropic
 * Plugin URI: https://github.com/WordPress/ai-provider-for-anthropic
 * Description: AI Provider for Anthropic for the WordPress AI Client.
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Version: 1.0.2
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
- **`add_action( 'init', ..., 5 )`** — runs before `_wp_connectors_init` at priority 10.

## Hook timing — what works and what doesn't

The Connectors API runs `_wp_connectors_init()` on `init` priority 10. Your provider must be registered before that.

| Hook | Priority | Works? |
| --- | --- | --- |
| `plugins_loaded` | any | yes |
| `init` | 0–9 | yes |
| `init` | 10+ | no (registry already queried) |
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

Per the dev note, only `ai_provider` connectors with `api_key` (or `none`) authentication get the full admin UI in WP 7.0. The PHP registry accepts other types and methods, but the screen ignores them. Future releases are expected to expand this — track #64789 and the Connectors API dev note's "Looking ahead" section.
