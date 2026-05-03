# REST patterns for AI features

Why per-feature endpoints, what they should look like, and what to avoid.

## Why not the client-side prompt API

WordPress 7.0 ships a client-side JavaScript prompt builder in the `wordpress/wp-ai-client` package. It works, but it's intentionally locked behind a `manage_options` capability check. The reason: the JS API lets the caller send *any* prompt to *any* configured provider. That's fine for Core's own admin tooling. It is not safe for distributed plugins, where you can't predict what user role will hit the UI or what prompts will be constructed client-side.

The recommended pattern: a separate REST endpoint per AI feature, scoped to that feature's permissions and inputs. The actual prompt construction stays server-side. The JS just calls your endpoint with structured input.

## A canonical endpoint

```php
add_action( 'rest_api_init', function () {
    register_rest_route( 'my-plugin/v1', '/summarize-post', array(
        'methods'             => 'POST',
        'permission_callback' => function ( WP_REST_Request $request ) {
            $post_id = (int) $request->get_param( 'post_id' );
            return $post_id && current_user_can( 'edit_post', $post_id );
        },
        'callback'            => 'my_plugin_summarize_post',
        'args'                => array(
            'post_id' => array(
                'required'          => true,
                'type'              => 'integer',
                'sanitize_callback' => 'absint',
            ),
        ),
    ) );
} );

function my_plugin_summarize_post( WP_REST_Request $request ) {
    $post = get_post( (int) $request->get_param( 'post_id' ) );
    if ( ! $post ) {
        return new WP_Error( 'not_found', __( 'Post not found.', 'my-plugin' ), array( 'status' => 404 ) );
    }

    $result = wp_ai_client_prompt( 'Summarize this post in two sentences:' )
        ->using_system_instruction( 'You are a concise WordPress editor.' )
        ->with_text( wp_strip_all_tags( $post->post_content ) )
        ->using_temperature( 0.3 )
        ->generate_text_result();

    return rest_ensure_response( $result );
}
```

What this gives you:

- **Per-feature capability.** `edit_post` on the specific post, not `manage_options`. Editors and authors can use the feature without being admins.
- **Validated input.** `sanitize_callback` runs before your callback, so you never see a non-int post_id.
- **Server-side prompt construction.** The user can't inject system instructions or change the model preference — those are baked into your endpoint.
- **Free error handling.** Both `GenerativeAiResult` and `WP_Error` serialize through `rest_ensure_response()` with the right HTTP status.

## Calling from JS

```js
import apiFetch from '@wordpress/api-fetch';

const result = await apiFetch( {
    path: '/my-plugin/v1/summarize-post',
    method: 'POST',
    data: { post_id: postId },
} );

console.log( result.text, result.tokenUsage, result.providerMetadata );
```

`@wordpress/api-fetch` injects the REST nonce automatically when called from an admin page.

## Patterns by modality

### Streaming text

The dev note doesn't currently document a streaming method on the wrapper — `generate_text_result()` is request/response. If you need streaming UX, fall back to chunking on your end (multiple shorter prompts) or check the `WP_AI_Client_Prompt_Builder` source in case streaming has been added since.

### Image generation that lands in the Media Library

```php
function my_plugin_generate_featured_image( WP_REST_Request $request ) {
    $prompt = $request->get_param( 'prompt' );
    $image  = wp_ai_client_prompt( $prompt )->generate_image();

    if ( is_wp_error( $image ) ) {
        return $image;
    }

    // Persist via existing Media Library helpers.
    $upload = wp_upload_bits( 'ai-' . wp_generate_uuid4() . '.png', null, base64_decode( /* extract from data URI */ ) );
    if ( ! empty( $upload['error'] ) ) {
        return new WP_Error( 'upload_failed', $upload['error'], array( 'status' => 500 ) );
    }

    $attachment_id = wp_insert_attachment( array(
        'post_mime_type' => 'image/png',
        'post_title'     => sanitize_text_field( $prompt ),
        'post_status'    => 'inherit',
    ), $upload['file'] );

    return rest_ensure_response( array( 'attachment_id' => $attachment_id ) );
}
```

Use existing WP media helpers (`wp_upload_bits`, `wp_insert_attachment`, `wp_generate_attachment_metadata`). Don't reinvent uploads.

### Structured data extraction

```php
$schema = array(
    'type'       => 'object',
    'properties' => array(
        'title'     => array( 'type' => 'string' ),
        'tags'      => array( 'type' => 'array', 'items' => array( 'type' => 'string' ) ),
        'category'  => array( 'type' => 'string' ),
    ),
    'required'   => array( 'title' ),
);

$json = wp_ai_client_prompt( 'Extract metadata from: ' . $content )
    ->as_json_response( $schema )
    ->generate_text();

if ( is_wp_error( $json ) ) {
    return $json;
}

return rest_ensure_response( json_decode( $json, true ) );
```

Validate the parsed JSON against your own schema afterward — model output is best-effort, not guaranteed.

## What to avoid

- **Building prompts on the client.** Even with a tight permission_callback, a server-built prompt is auditable, version-controlled, and can be filtered via `wp_ai_client_prevent_prompt`. A client-built prompt is none of those.
- **Stuffing user input into the system instruction.** Treat user-supplied content as data, not instructions. Use `with_text()` for the user payload and `using_system_instruction()` only for the role/format guidance you author.
- **Returning the full `GenerativeAiResult` to anonymous callers.** It includes provider/model metadata that may leak operational details. For public-facing endpoints, project to a smaller response shape.
- **Per-request capability checks inside the callback only.** Use `permission_callback` — REST runs it before the callback, and it's the documented place for authorization. The callback is for logic, not auth.
