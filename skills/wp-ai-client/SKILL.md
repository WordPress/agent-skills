---
name: wp-ai-client
description: "Use when building AI features in a WordPress plugin or theme on WordPress 7.0+ using the in-core AI Client (`wp_ai_client_prompt()`, `WP_AI_Client_Prompt_Builder`). Covers prompt construction, model preferences, REST endpoint patterns for exposing AI features to JS, error handling, and feature detection. Use this — not direct provider SDKs — when the user asks to add text/image/speech/video generation to a WordPress site."
compatibility: "Targets WordPress 7.0+ (PHP 7.4+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WP AI Client

## When to use

Use this skill when the task involves:

- adding an AI-powered feature (text, image, speech, video generation) to a plugin or theme on WP 7.0+,
- replacing direct calls to OpenAI/Anthropic/Google SDKs with the provider-agnostic in-core API,
- migrating from the standalone `wordpress/php-ai-client` or `wordpress/wp-ai-client` Composer packages now that 7.0 bundles them,
- exposing an AI feature to the block editor or custom JS via a REST endpoint,
- diagnosing "the model isn't responding" / "no provider configured" / "feature shows but never works".

If the task is to write a *provider plugin* (e.g., adding a new AI service), route to `wp-ai-connectors` instead.

## Inputs required

- Repo root (run `wordpress-router` and `wp-project-triage` first).
- Target WP version: this skill is **WP 7.0+ only**. If the project must support 6.x, see the migration section in `references/prompt-builder.md`.
- Whether the feature runs server-side (PHP only), client-side (JS), or both.
- Which modality is needed (text / image / speech / video).

## Procedure

### 0) Triage and confirm WP 7.0+

1. Run triage: `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. Detect AI Client availability: `node skills/wp-ai-client/scripts/detect_ai_client.mjs`

If the project's `Requires at least` is `< 7.0`, decide: bump the requirement (recommended), or use the conditional autoloader pattern in `references/prompt-builder.md#migration` to keep older versions working.

### 1) Check feature support before showing UI

Never assume an AI feature will work just because WP 7.0 is installed — site owners may have no provider configured, or their provider may not support every modality. Use `is_supported_for_*()` builder methods, which run synchronously and incur no API cost:

```php
$builder = wp_ai_client_prompt( 'test' )->using_temperature( 0.7 );
if ( ! $builder->is_supported_for_text_generation() ) {
    return; // Skip registering UI.
}
```

Conditionally enqueue scripts, hide blocks, or render a notice based on this check. See `references/prompt-builder.md#feature-detection` for all support methods.

### 2) Build the prompt with the fluent builder

Entry point is `wp_ai_client_prompt( $optional_text )`, which returns a `WP_AI_Client_Prompt_Builder`. Chain configuration, then call a generator:

```php
$result = wp_ai_client_prompt( 'Summarize the following post.' )
    ->using_system_instruction( 'You are a concise WordPress editor.' )
    ->using_temperature( 0.3 )
    ->using_model_preference( 'claude-sonnet-4-6', 'gpt-5.4', 'gemini-3.1-pro-preview' )
    ->generate_text_result();
```

Model preferences are *preferences*, not requirements. The Client falls back to any compatible model. See `references/prompt-builder.md` for the full method list (with_text/with_file/with_history, using_max_tokens/top_p/top_k/stop_sequences, as_json_response, as_output_modalities).

### 3) Expose to JS via a per-feature REST endpoint

Do **not** use the client-side JS prompt API in distributed plugins — it requires `manage_options` and lets the caller send any prompt to any configured provider. Instead, register a REST endpoint scoped to your single feature, with a tight permission callback:

```php
register_rest_route( 'my-plugin/v1', '/summarize', array(
    'methods'             => 'POST',
    'permission_callback' => fn() => current_user_can( 'edit_posts' ),
    'callback'            => 'my_plugin_rest_summarize',
    'args'                => array(
        'content' => array( 'required' => true, 'type' => 'string' ),
    ),
) );

function my_plugin_rest_summarize( WP_REST_Request $request ) {
    $result = wp_ai_client_prompt( 'Summarize: ' . $request->get_param( 'content' ) )
        ->generate_text_result();
    return rest_ensure_response( $result );
}
```

`GenerativeAiResult` and `WP_Error` both serialize cleanly through `rest_ensure_response()`, with the right HTTP status code attached automatically on errors. See `references/rest-patterns.md`.

### 4) Handle errors

Generator methods return `WP_Error` on failure (no exceptions — the WordPress wrapper catches them). Always check:

```php
$result = wp_ai_client_prompt( $prompt )->generate_text_result();
if ( is_wp_error( $result ) ) {
    return $result; // Pass through to REST or log.
}
```

The `wp_ai_client_prevent_prompt` filter lets you block specific prompts before they execute (useful for capability gating, content policies, dev-mode kill switches). See `references/error-handling.md`.

### 5) Credentials are someone else's problem

Do not handle API keys. The Connectors API (in core) reads keys from env var → PHP constant → database (in that order) and the **Settings → Connectors** screen surfaces them to admins. If you need to hint to site owners that no provider is set up, use feature detection (step 1) plus a link to `Settings → Connectors`.

### 6) Function calling: `using_abilities()` is the bridge to the Abilities API

If your feature needs the model to *call* something — read a post, update an attachment, classify content — pass registered ability IDs to `using_abilities()`. The AI Client converts them into function declarations the model can invoke; when the model calls one, execution routes back through the Abilities API's permission and execution machinery. This makes the AI Client agentic without writing function-calling boilerplate. Pair this with `wp-abilities-api` to define the abilities themselves.

```php
$result = wp_ai_client_prompt( 'Summarize the latest 5 posts.' )
    ->using_abilities( 'core/get-posts', 'core/get-post' )
    ->generate_text_result();
```

Abilities you pass must already be registered server-side via `wp_register_ability()`. Their `permission_callback` runs every time the model attempts to invoke them.

## Verification

- `is_supported_for_*()` returns `true` in your test environment with at least one configured provider.
- Your REST endpoint returns the expected modality and a `GenerativeAiResult` payload (token usage, provider/model metadata visible).
- With the provider's API key removed/invalidated, `is_supported_*()` returns `false` and your UI gracefully hides or shows a useful notice.
- The `wp_ai_client_prevent_prompt` filter, if used, blocks calls without leaking the prompt content to logs.

## Failure modes / debugging

- **"AI feature shows but always errors"**: usually no provider configured. Confirm at least one provider plugin is active (`AI Provider for Anthropic|Google|OpenAI` or a community provider) and a key is set in Settings → Connectors.
- **`call to undefined function wp_ai_client_prompt()`**: site is on WP < 7.0. Either bump the floor or use the conditional autoloader pattern.
- **"Works for admin, fails for editors"**: the JS code is calling the high-privilege client-side prompt API instead of your scoped REST endpoint. Switch to a per-feature endpoint.
- **`WP_Error` with HTTP 4xx but no useful detail**: the underlying provider returned a vague error. Pull `getProviderMetadata()` off the result for the actual upstream message.
- **Different model than expected ran**: `using_model_preference()` is a preference. Inspect `getProviderMetadata()` / `getModelMetadata()` on the result to see what actually answered.

## Escalation

For canonical detail before inventing patterns:

- AI Client dev note: https://make.wordpress.org/core/2026/03/24/introducing-the-ai-client-in-wordpress-7-0/
- PHP AI Client SDK source: https://github.com/WordPress/php-ai-client
- WP AI Client (REST/JS package): https://github.com/WordPress/wp-ai-client
- Trac ticket: https://core.trac.wordpress.org/ticket/64591

References:
- `references/prompt-builder.md`
- `references/rest-patterns.md`
- `references/error-handling.md`
