# Registering meta

Use this file when adding or changing a meta key registration.

## Functions

- [`register_post_meta( $post_type, $key, $args )`](https://developer.wordpress.org/reference/functions/register_post_meta/) and [`register_term_meta( $taxonomy, $key, $args )`](https://developer.wordpress.org/reference/functions/register_term_meta/) set the subtype; `''` means all post types or taxonomies.
- [`register_meta( $object_type, $key, $args )`](https://developer.wordpress.org/reference/functions/register_meta/) for `user`, `comment`, and others, without a subtype.

Register each key once, either for one subtype or for all subtypes. Core reads the two registrations differently per feature, so a key registered both ways behaves inconsistently.

## Arguments

| Key | Default | Notes |
|-----|---------|-------|
| `type` | `'string'` | `string`, `boolean`, `integer`, `number`, `array`, `object`. |
| `label`, `description` | `''` | REST schema `title` and `description`; the bindings UI shows the label. |
| `single` | `false` | `true` for one value per object. |
| `default` | not set | Returned when no row exists. Must pass the schema, including `format`. |
| `sanitize_callback` | `null` | Runs on every add or update, also outside REST. |
| `auth_callback` | `null` | Narrows `edit_post` (or `edit_term`, `edit_user`) for meta writes. Default: denied for protected keys, allowed otherwise. |
| `show_in_rest` | `false` | `true`, or an array with `schema` and/or `prepare_callback`. |
| `revisions_enabled` | `false` | Post meta only; the post type must support `revisions`. |

`register_meta()` returns `false` when an array key in REST has no `schema.items`, when `default` fails the schema, or when `revisions_enabled` is not possible.

## Stored values

- Stored scalars come back from `get_post_meta()` as strings; REST casts them using the schema. A registered `default` keeps its PHP type.
- Schema validation runs only for REST writes. For `object` and `array` keys, the `sanitize_callback` must enforce the shape for PHP writes too, for example by rebuilding the array from the allowed keys.
- `object` keys need `show_in_rest.schema.properties`; `array` keys need `show_in_rest.schema.items`.
- Object schemas reject undeclared properties.
- `single => true` arrays and objects are stored serialized and cannot be filtered with `meta_query`. Use `single => false` (one row per value) for filterable lists, and `'type' => 'NUMERIC'` in `meta_query` for numbers. Query performance: [wp-performance](../../wp-performance/SKILL.md).

## Protected keys

Keys starting with `_` are protected: hidden from the Custom Fields meta box, not writable through REST without an `auth_callback`, never output by `core/post-meta`. They are still in REST responses if `show_in_rest` is set (SKILL.md, step 5).

## Example

```php
add_action( 'init', 'myplugin_register_meta', 20 );

function myplugin_can_edit_book_meta( $allowed, $meta_key, $post_id ) {
	return current_user_can( 'edit_post', $post_id );
}

function myplugin_register_meta() {
	register_post_meta(
		'myplugin_book',
		'myplugin_isbn',
		array(
			'type'              => 'string',
			'label'             => __( 'ISBN', 'my-plugin' ),
			'single'            => true,
			'default'           => '',
			'sanitize_callback' => 'sanitize_text_field',
			'auth_callback'     => 'myplugin_can_edit_book_meta',
			'show_in_rest'      => true,
			'revisions_enabled' => true,
		)
	);

	register_post_meta(
		'myplugin_book',
		'myplugin_page_count',
		array(
			'type'              => 'integer',
			'label'             => __( 'Page count', 'my-plugin' ),
			'single'            => true,
			'default'           => 0,
			'sanitize_callback' => 'absint',
			'auth_callback'     => 'myplugin_can_edit_book_meta',
			'show_in_rest'      => true,
		)
	);
}
```

The post type registers `'show_in_rest' => true` and `'supports' => array( 'title', 'editor', 'revisions', 'custom-fields' )`.

## Revisions and preview

`revisions_enabled` stores the key with each revision and restores it. Only revisioned keys are saved in autosaves, so the preview of a published post shows other keys with their saved value.

## Renaming a key

Register the new key, then migrate once from an upgrade routine: query posts by the old key in batches across all statuses (`get_post_stati()`, since `'any'` skips trash), copy with `update_post_meta()` without overwriting existing values, and delete the old key. The meta API keeps the cache in sync and runs the new `sanitize_callback`. Update bindings and templates in the same release.

Delete plugin meta on uninstall: [wp-plugin-development](../../wp-plugin-development/SKILL.md).
