# Error handling and prompt prevention

The AI Client follows WordPress conventions: `WP_Error` on failure, semantic HTTP status codes when returned through REST, and a filter for blocking prompts before they execute.

## Generators return `WP_Error`

The wrapper catches `Exception` subclasses from the underlying SDK and converts them to `WP_Error`. (It does **not** catch a PHP `TypeError` from a wrong-typed argument — that's an `Error`, not an `Exception` — so match the builder signatures in `references/prompt-builder.md`.) Never wrap calls in try/catch for SDK failures — check `is_wp_error()`:

```php
$result = wp_ai_client_prompt( 'Summarize this text.' )
    ->with_text( $text )
    ->generate_text_result();

if ( is_wp_error( $result ) ) {
    error_log(
        sprintf(
            'AI request failed [%s]: %s',
            $result->get_error_code(),
            $result->get_error_message()
        )
    );
    $upstream_data = $result->get_error_data();
    return $result;
}

$provider_metadata = $result->getProviderMetadata();
$model_metadata    = $result->getModelMetadata();
```

The error path must use only `WP_Error` methods: `get_error_code()`, `get_error_message()`, and `get_error_data()`. `getProviderMetadata()` and `getModelMetadata()` belong exclusively to the successful `GenerativeAiResult` path after `is_wp_error( $result )` returns false.

When passed to `rest_ensure_response()`, a `WP_Error` automatically receives a meaningful HTTP status code based on the underlying failure. You don't need to map status codes manually.

## Common error categories

The Core wrapper maps caught SDK exceptions to a small set of **stable `WP_Error` codes** in `WP_AI_Client_Prompt_Builder::exception_to_wp_error()` (for example, a prevented prompt yields code `prompt_prevented` with HTTP status 503). The code is assigned by Core, not the provider plugin; the provider- and failure-specific detail rides in the error *message* and `get_error_data()`. Read that method for the current code list. General categories you should handle:

- **No provider configured / no compatible model.** `is_supported_*()` would have returned `false` had you checked first. The error from a generator in this state is still meaningful, but the user-facing fix is "configure a provider in Settings → Connectors."
- **Rate limited / quota exhausted.** Provider-specific. Usually `429`-class. Surface a generic "try again shortly" to the user; log the upstream message for ops.
- **Validation error from the model.** Most common with `as_json_response()` if the schema is too strict or the prompt is ambiguous. Loosen the schema, lower temperature, or add an explicit example to the system instruction.
- **Provider returned an opaque error.** Log the `WP_Error` code, message, and data. Do not use `GenerativeAiResult` metadata methods on the error object.

## The `wp_ai_client_prevent_prompt` filter

This filter runs before any AI call. Returning `true` blocks the prompt: no API call is made, `is_supported_*()` returns `false`, and generators return a `WP_Error`. Use it for capability gating, dev-mode kill switches, content policy enforcement, or per-environment restrictions.

```php
add_filter(
    'wp_ai_client_prevent_prompt',
    function ( bool $prevent, $builder ): bool {
        // Block all prompts in staging unless explicitly opted in.
        if ( defined( 'WP_ENVIRONMENT_TYPE' ) && 'staging' === wp_get_environment_type() ) {
            return ! defined( 'MY_PLUGIN_AI_ENABLED_IN_STAGING' );
        }
        return $prevent;
    },
    10,
    2
);
```

The filter receives a **clone** of the builder, intended for read-only inspection — you can call query-style methods on it (e.g., to check what model preference or modality is configured), but mutations on the clone do not affect the actual builder. So you can inspect what's about to be sent — the system instruction, model preferences, modalities — and decide based on that. You can't (and shouldn't) read user prompt text out of the builder for content moderation; do moderation upstream of the builder, in your REST callback or business logic.

### Combining with `is_supported_*()`

When `wp_ai_client_prevent_prompt` returns `true`, the support checks return `false`. This is by design: your UI naturally hides itself when prompts are prevented. You don't need a separate check.

## Surfacing errors in the editor

If your feature runs in the block editor, return errors as a normal REST error and let `@wordpress/api-fetch` reject. Display via the `core/notices` store:

```js
import apiFetch from '@wordpress/api-fetch';
import { dispatch } from '@wordpress/data';

try {
    const result = await apiFetch( {
        path: '/my-plugin/v1/summarize-post',
        method: 'POST',
        data: { post_id: postId },
    } );
    // use result.text
} catch ( error ) {
    dispatch( 'core/notices' ).createErrorNotice(
        error.message || 'AI request failed.',
        { type: 'snackbar' }
    );
}
```

## Logging without leaking prompts

Don't dump full prompts into PHP error logs — they may contain user content, PII, or trade secrets. Log:

- error code,
- HTTP status (from `$error->get_error_data()['status']` if present),
- provider/model metadata only after a `*_result()` call returned a successful `GenerativeAiResult`,
- a short hash of the prompt for correlation if you really need it.

Keep the actual prompt text in your application's audit log, behind whatever access controls you already use for sensitive content.
