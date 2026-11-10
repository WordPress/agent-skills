# PHP registration quick guide

Key concepts and entrypoints for the WordPress Abilities API:

- Register ability categories and abilities in PHP.
- Use the Abilities API init hooks to ensure registration occurs at the right lifecycle time.

## Hook order (critical)

**Categories must be registered before abilities.** Use the correct hooks:

1. `wp_abilities_api_categories_init` — Register categories here first.
2. `wp_abilities_api_init` — Register abilities here (after categories exist).

**Warning:** Registering abilities outside `wp_abilities_api_init` triggers `_doing_it_wrong()` and the registration will fail.

```php
// 1. Register category first
add_action( 'wp_abilities_api_categories_init', function() {
    wp_register_ability_category( 'my-plugin', [
        'label' => __( 'My Plugin', 'my-plugin' ),
    ] );
} );

// 2. Then register abilities
add_action( 'wp_abilities_api_init', function() {
    wp_register_ability( 'my-plugin/get-info', [
        'label'               => __( 'Get Site Info', 'my-plugin' ),
        'description'         => __( 'Returns basic site information.', 'my-plugin' ),
        'category'            => 'my-plugin',
        'execute_callback'    => 'my_plugin_get_info_callback',
        'permission_callback' => 'my_plugin_get_info_permissions',
        'meta'                => [
            'show_in_rest' => true,
            'mcp'          => [
                'public' => true, // Expose via the bundled WordPress MCP adapter.
            ],
            'annotations'  => [
                'readonly'    => true,
                'destructive' => false,
                'idempotent'  => true,
            ],
        ],
    ] );
} );
```

## Common primitives

- `wp_register_ability_category( $category_id, $args )`
- `wp_register_ability( $ability_id, $args )`

## Key arguments for `wp_register_ability()`

| Argument | Required? | Description |
|----------|-----------|-------------|
| `label` | **Required** | Human-readable name for UI (e.g., command palette). |
| `description` | **Required** | What the ability does. |
| `category` | **Required** | Category ID (must be registered first via `wp_abilities_api_categories_init`). |
| `execute_callback` | **Required** | Function that runs when the ability is invoked. Receives mixed input (per `input_schema`), returns mixed result or `WP_Error`. |
| `permission_callback` | **Required** | Function that checks whether the current user may execute. Receives the same mixed input as `execute_callback`; returns `bool` or `WP_Error`. WP core throws `InvalidArgumentException` if this is missing — there is no implicit default. |
| `input_schema` | Optional | JSON Schema for expected input (enables validation). Required when the ability accepts input. |
| `output_schema` | Optional | JSON Schema for returned output (enables validation of the result). |
| `meta.show_in_rest` | Optional (default `false`) | Set `true` to expose via the `wp-abilities/v1` REST API namespace. |
| `meta.mcp.public` | Optional (default `false`) | Set `true` to expose the ability as a tool via the bundled WordPress MCP adapter. Independent from `show_in_rest`. |
| `meta.mcp.type` | Optional (default `'tool'`) | One of `'tool'`, `'resource'`, `'prompt'`. Controls how the bundled MCP adapter projects the ability. Values outside this enum silently coerce to `'tool'`. |
| `meta.annotations.readonly` | **Strongly recommended** (default `null`) | `true` if the ability does not modify its environment. |
| `meta.annotations.destructive` | **Strongly recommended** (default `null`) | `true` if the ability may perform destructive updates. `false` for additive-only updates. |
| `meta.annotations.idempotent` | **Strongly recommended** (default `null`) | `true` if calling the ability repeatedly with the same arguments has no additional effect. |

The three annotations under `meta.annotations` are *hints* for tooling and documentation — core does not enforce them at runtime, so a missing or `null` value is silently legal. That permissiveness is exactly why every registration should populate them explicitly: MCP / Command Palette / agent surfaces and review tooling reason about ability safety from these values *without* invoking the callback. A `readonly: null` ability is treated as "behavior unknown," which is a worse signal than either `true` or `false`. Treat the absence of an annotation as a bug, not a default.

### `show_in_rest` vs `mcp.public` — they target different surfaces

These two meta keys answer different questions and do not imply each other:

- `show_in_rest` controls visibility on the WordPress core REST namespace `wp-abilities/v1` (the abilities REST API). Clients that talk to that namespace see the ability iff this is `true`.
- `mcp.public` is read by the bundled WordPress MCP adapter package. The adapter's default MCP server only surfaces abilities whose `meta.mcp.public` is strictly `true`. Without it, the ability is registered but invisible to MCP clients connecting through that adapter.

A plugin can set both, either, or neither. If you want the ability discoverable to agents through MCP, set `mcp.public => true`. If you also want it on the abilities REST namespace (for tooling that talks to `wp-abilities/v1` directly), set `show_in_rest => true`. The two surfaces are independent.

## Recommended patterns

- Namespace ability IDs as `<plugin-slug>/<verb-noun>` (e.g., `my-plugin/get-info`, `my-plugin/update-thing`). Slash-separated.
- Treat IDs as stable API; changing an ID is a breaking change for any consumer that holds a reference.
- Use `input_schema` and `output_schema` for validation and to help AI agents understand usage.
- **Always include a `permission_callback`.** It is required on every registration — there is no implicit default.
- **Always set all three `meta.annotations` keys (`readonly`, `destructive`, `idempotent`) explicitly.** Leaving them at the `null` default broadcasts "behavior unknown" to every consumer that reads this metadata before invoking the ability. The cost of writing them is three lines; the cost of omitting them is opaque safety surface.

## References

- Abilities API handbook: https://developer.wordpress.org/apis/abilities-api/
- Dev note: https://make.wordpress.org/core/2025/11/10/abilities-api-in-wordpress-6-9/
- WordPress MCP adapter package — source of `meta.mcp.public` / `meta.mcp.type` contract. The adapter ships as a packaged dependency; verify the meta-key names against the package version your plugin pulls in.
