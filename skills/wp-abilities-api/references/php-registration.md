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
        'label'       => __( 'Get Site Info', 'my-plugin' ),
        'description' => __( 'Returns basic site information.', 'my-plugin' ),
        'category'    => 'my-plugin',
        'execute_callback' => 'my_plugin_get_info_callback',
        'meta'        => [ 'show_in_rest' => true ],
    ] );
} );
```

## Common primitives

- `wp_register_ability_category( $category_id, $args )`
- `wp_register_ability( $ability_id, $args )`

## Key arguments for `wp_register_ability()`

| Argument | Description |
|----------|-------------|
| `label` | Human-readable name for UI (e.g., command palette) |
| `description` | What the ability does |
| `category` | Category ID (must be registered first) |
| `execute_callback` | Function that executes the ability |
| `input_schema` | JSON Schema for expected input (enables validation) |
| `output_schema` | JSON Schema for returned output |
| `permission_callback` | Optional function to check if current user can execute |
| `meta.show_in_rest` | Set `true` to expose via REST API |
| `meta.readonly` | Set `true` if ability is informational only |

## Recommended patterns

- Namespace IDs (e.g. `my-plugin:feature.edit`).
- Treat IDs as stable API; changing IDs is a breaking change.
- Use `input_schema` and `output_schema` for validation and to help AI agents understand usage.
- Always include a `permission_callback` for abilities that modify data.

## References

- Abilities API handbook: https://developer.wordpress.org/apis/abilities-api/
- Dev note: https://make.wordpress.org/core/2025/11/10/abilities-api-in-wordpress-6-9/
