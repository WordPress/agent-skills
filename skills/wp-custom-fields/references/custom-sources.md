# Custom bindings sources

Use this file when `core/post-meta` is not enough: formatted values, placeholders for empty values, term or user meta, custom tables, computed data.

## Server: [`register_block_bindings_source()`](https://developer.wordpress.org/reference/functions/register_block_bindings_source/)

Register on `init`. Only `label`, `get_value_callback`, and `uses_context` are allowed; the name must be `namespace/slug` in lowercase.

- The callback receives `( array $source_args, WP_Block $block_instance, string $attribute_name )` and reads context from `$block_instance->context` (only keys listed in `uses_context`).
- Return `null` to keep the saved markup.
- Check read access yourself; `$source_args` come from post content any author can edit.
- Rich-text targets receive your value as HTML after `wp_kses_post()`: escape plain text with `esc_html()`. HTML-attribute targets are escaped by core: return raw values.

```php
function myplugin_book_data_get_value( array $source_args, $block_instance ) {
	$post_id = $block_instance->context['postId'] ?? 0;
	if ( ! $post_id || 'myplugin_book' !== get_post_type( $post_id ) ) {
		return null;
	}

	$post = get_post( $post_id );
	if ( ( ! is_post_publicly_viewable( $post ) && ! current_user_can( 'read_post', $post_id ) ) || post_password_required( $post ) ) {
		return null;
	}

	if ( 'page-count' !== ( $source_args['field'] ?? '' ) ) {
		return null;
	}

	$pages = (int) get_post_meta( $post_id, 'myplugin_page_count', true );
	return $pages
		/* translators: %s: Number of pages. */
		? esc_html( sprintf( _n( '%s page', '%s pages', $pages, 'my-plugin' ), number_format_i18n( $pages ) ) )
		: null;
}

function myplugin_register_block_bindings_sources() {
	register_block_bindings_source(
		'my-plugin/book-data',
		array(
			'label'              => __( 'Book data', 'my-plugin' ),
			'get_value_callback' => 'myplugin_book_data_get_value',
			'uses_context'       => array( 'postId', 'postType' ),
		)
	);
}
add_action( 'init', 'myplugin_register_block_bindings_sources' );
```

```html
<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"my-plugin/book-data","args":{"field":"page-count"}}}}} -->
<p>Page count unknown</p>
<!-- /wp:paragraph -->
```

## Editor: [`registerBlockBindingsSource()`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-blocks/#registerblockbindingssource)

The editor already knows server sources by name and label, but shows the label instead of a value and does not offer the source in the UI. Register the same name with:

- `getValues( { select, context, bindings } )`: return `{ [attribute]: value }`; `bindings` is `{ [attribute]: { args } }`.
- `getFieldsList( { select, context } )`: fields `{ label, type, args }` for the UI.
- For editable values, both `setValues( { dispatch, context, bindings } )` (with `newValue` per attribute) and `canUserEditValue( { select, context, args } )` returning `true`. Without either, the bound attribute stays locked.

`context` holds the keys from `usesContext`.

```js
import { registerBlockBindingsSource } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import { __, _n, sprintf } from '@wordpress/i18n';

const FIELDS = [
	{ label: __( 'Page count (formatted)', 'my-plugin' ), type: 'string', args: { field: 'page-count' } },
];

registerBlockBindingsSource( {
	name: 'my-plugin/book-data',
	usesContext: [ 'postId', 'postType' ],
	getValues( { select, context, bindings } ) {
		const record =
			context?.postId && context?.postType === 'myplugin_book'
				? select( coreStore ).getEditedEntityRecord( 'postType', 'myplugin_book', context.postId )
				: null;
		const pages = parseInt( record?.meta?.myplugin_page_count, 10 ) || 0;
		const values = {};
		for ( const attribute of Object.keys( bindings ) ) {
			values[ attribute ] = pages
				? sprintf(
						/* translators: %s: Number of pages. */
						_n( '%s page', '%s pages', pages, 'my-plugin' ),
						pages.toLocaleString( document.documentElement.lang || undefined )
				  )
				: FIELDS[ 0 ].label;
		}
		return values;
	},
	getFieldsList( { context } ) {
		return context?.postType === 'myplugin_book' ? FIELDS : [];
	},
} );
```

Keep the formatting in PHP and `getValues` the same. `getEditedEntityRecord()` makes the preview follow unsaved edits. The editor is only open to users who can edit the post, so the preview may show values visitors do not see.
