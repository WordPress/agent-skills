# `WP_AI_Client_Prompt_Builder` reference

Complete fluent API for the in-core AI Client (WP 7.0+).

## Entry point

```php
$builder = wp_ai_client_prompt( $optional_text = null );
```

Returns a `WP_AI_Client_Prompt_Builder`. Chain configuration methods, then call a generator. Passing prompt text directly is a shortcut for `->with_text( $text )`.

## Configuration methods

| Configuration | Method |
| --- | --- |
| Prompt text | `with_text( string )` |
| File input | `with_file( File )` |
| Conversation history (multi-turn) | `with_history( array )` |
| Function call response (multi-turn function calling) | `with_function_response( FunctionResponse )` |
| Pre-built message parts | `with_message_parts( MessagePart ...)` |
| System instruction | `using_system_instruction( string )` |
| Temperature | `using_temperature( float )` |
| Max tokens | `using_max_tokens( int )` |
| Top-p / Top-k | `using_top_p( float )`, `using_top_k( int )` |
| Stop sequences | `using_stop_sequences( array )` |
| Candidate count | `using_candidate_count( int )` |
| Model preference (ordered list) | `using_model_preference( ...$model_ids )` |
| Force a specific model | `using_model( ModelInterface )` |
| Force a specific provider | `using_provider( string $providerIdOrClassName )` |
| Bind registered Abilities for function calling | `using_abilities( ...$ability_ids )` |
| Function declarations (manual) | `using_function_declarations( FunctionDeclaration ...)` |
| Web search configuration | `using_web_search( WebSearch )` |
| Presence / frequency penalties | `using_presence_penalty( float )`, `using_frequency_penalty( float )` |
| Request options (HTTP transport) | `using_request_options( RequestOptions )` |
| Top log probabilities | `using_top_logprobs( ?int )` |
| Output modalities | `as_output_modalities( ...$modality_enums )` |
| Output file type (image/audio/video) | `as_output_file_type( FileTypeEnum )` |
| Output media orientation | `as_output_media_orientation( MediaOrientationEnum )` |
| Output MIME type | `as_output_mime_type( string )` |
| Output schema (raw JSON Schema) | `as_output_schema( array )` |
| Structured JSON response | `as_json_response( ?array $schema = null )` |

The skill's main SKILL.md and the dev note focus on the most-used subset (the first ~12 rows). The advanced rows above are real but rarely needed — they're documented here for completeness, not for everyday use.

### Function calling via the Abilities API

`using_abilities()` is the integration point between the AI Client and the Abilities API. Pass registered ability IDs (server-side abilities, registered via `wp_register_ability()`); the AI Client converts them into function declarations the model can call. When the model invokes one, the AI Client routes the call back through the Abilities API's permission and execution machinery.

```php
$result = wp_ai_client_prompt( 'Add an alt text to image #123 if it doesn\'t have one yet.' )
    ->using_abilities( 'core/get-attachment', 'core/update-attachment' )
    ->generate_text_result();
```

This makes the AI Client agentic without you writing function-calling boilerplate. The abilities you pass must already be registered. See the `wp-abilities-api` skill for the registration side.

## Generator methods

Each modality has a "raw" generator (returns the content directly) and a `*_result()` generator (returns a `GenerativeAiResult` with metadata).

### Text

```php
$text  = wp_ai_client_prompt( 'Write a haiku about WordPress.' )->generate_text();
$texts = wp_ai_client_prompt( 'Write a tagline.' )->generate_texts( 4 );  // 4 variants
$res   = wp_ai_client_prompt( $prompt )->generate_text_result();           // with metadata
```

### Image

```php
use WordPress\AiClient\Files\DTO\File;

$image  = wp_ai_client_prompt( 'A neon WordPress logo' )->generate_image();
$images = wp_ai_client_prompt( $prompt )->generate_images( 4 );
$res    = wp_ai_client_prompt( $prompt )->generate_image_result();
```

`generate_image()` returns a `File` DTO. Read the data with `$image->getDataUri()` for inline embedding, or persist via the Media Library however your plugin already handles uploads.

### Other modalities

- `generate_speech()` / `generate_speech_result()`
- `convert_text_to_speech()` / `convert_text_to_speech_result()`
- `generate_video()` / `generate_video_result()`
- `generate_result()` — multimodal, when `as_output_modalities()` includes more than one

## Structured output

Pass a JSON Schema and the model returns a JSON-encoded string matching it:

```php
$schema = array(
    'type'  => 'array',
    'items' => array(
        'type'       => 'object',
        'properties' => array(
            'plugin_name' => array( 'type' => 'string' ),
            'category'    => array( 'type' => 'string' ),
        ),
        'required' => array( 'plugin_name', 'category' ),
    ),
);

$json = wp_ai_client_prompt( 'List 5 popular WordPress plugins.' )
    ->as_json_response( $schema )
    ->generate_text();

$data = json_decode( $json, true );
```

## Multimodal output

```php
use WordPress\AiClient\Messages\Enums\ModalityEnum;

$result = wp_ai_client_prompt( 'Recipe for chocolate cake with step photos.' )
    ->as_output_modalities( ModalityEnum::text(), ModalityEnum::image() )
    ->generate_result();

foreach ( $result->toMessage()->getParts() as $part ) {
    if ( $part->isText() ) {
        echo wp_kses_post( $part->getText() );
    } elseif ( $part->isFile() && $part->getFile()->isImage() ) {
        echo '<img src="' . esc_url( $part->getFile()->getDataUri() ) . '">';
    }
}
```

## Feature detection

These methods are synchronous, deterministic, and free — they match the builder's configuration against the available models, no API call. Use them before showing UI:

- `is_supported_for_text_generation()`
- `is_supported_for_image_generation()`
- `is_supported_for_text_to_speech_conversion()`
- `is_supported_for_speech_generation()`
- `is_supported_for_video_generation()`
- `is_supported_for_music_generation()`
- `is_supported_for_embedding_generation()`
- `is_supported( ?CapabilityEnum $capability = null )` — general form, takes any capability enum

```php
$builder = wp_ai_client_prompt( 'test' )->using_temperature( 0.7 );
if ( ! $builder->is_supported_for_text_generation() ) {
    return; // No suitable model available; skip UI.
}
```

## `GenerativeAiResult`

Returned by `generate_*_result()` methods. Useful methods:

- `getTokenUsage()` — input/output (and optional thinking) token counts
- `getProviderMetadata()` — which provider handled this request
- `getModelMetadata()` — which model the provider routed to
- `toMessage()` — raw `Message` for multimodal inspection

The object is serializable; `rest_ensure_response( $result )` works directly in REST callbacks.

## Architecture (worth knowing)

The AI Client is two layers:

1. **`wordpress/php-ai-client`** — the framework-agnostic PHP SDK, bundled into Core. camelCase methods, throws exceptions.
2. **`WP_AI_Client_Prompt_Builder`** — Core's WordPress wrapper. snake_case methods, returns `WP_Error`, integrates with WordPress HTTP, the Connectors API, and the hooks system.

`wp_ai_client_prompt()` is the recommended entry point. It returns the wrapper, which catches SDK exceptions and converts them to `WP_Error` for you.

### A class-name nuance worth knowing

The dev note documents the Core 7.0 wrapper class as `WP_AI_Client_Prompt_Builder`. The standalone `wordpress/wp-ai-client` package (used on WP < 7.0) returns a different class name — `WordPress\AI_Client\Builders\Prompt_Builder_With_WP_Error`, a subclass of `WordPress\AI_Client\Builders\Prompt_Builder` that adds the `WP_Error` translation. The fluent method names are identical between the two; both proxy to the underlying `php-ai-client` SDK via `__call`. So:

- **Type hints in published code**: prefer interface-style typing over the concrete class name when possible. If you must reference the class, use `WP_AI_Client_Prompt_Builder` for Core 7.0+ and the fully-qualified plugin class for WP < 7.0 — handle both paths if your plugin supports both.
- **Method names**: identical across both. Code that uses `wp_ai_client_prompt( ... )->using_temperature( 0.7 )->generate_text()` works on either.

## Migration

If your plugin used the standalone Composer packages before WP 7.0:

### Recommended: bump to WP 7.0

Update your plugin header to `Requires at least: 7.0` and remove the Composer dependencies on `wordpress/php-ai-client` and its transitive deps. Replace `AI_Client::prompt()` calls with `wp_ai_client_prompt()`. Remove `wordpress/wp-ai-client` if you weren't using its REST/JS layer.

### If you must support WP < 7.0

`wordpress/php-ai-client` is loaded by Core on 7.0+. Loading it via Composer too will cause duplicate-class errors. Wrap the autoloader:

```php
if ( ! function_exists( 'wp_get_wp_version' ) || version_compare( wp_get_wp_version(), '7.0', '<' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}
```

Composer doesn't allow more granular conditional autoloading without splitting into two Composer setups. The `wordpress/wp-ai-client` package handles 7.0 transparently — no change needed.

## Sources

- Dev note: https://make.wordpress.org/core/2026/03/24/introducing-the-ai-client-in-wordpress-7-0/
- PHP AI Client repo: https://github.com/WordPress/php-ai-client
- WP AI Client repo: https://github.com/WordPress/wp-ai-client
- `WP_AI_Client_Prompt_Builder` source — read it directly when in doubt about a method signature; the dev note is canonical for the public surface but the class is the source of truth.
