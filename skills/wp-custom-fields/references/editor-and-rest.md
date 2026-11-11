# Meta in REST and the block editor

Use this file when meta must be read or edited through REST or in the editor UI.

## REST

- Keys with `show_in_rest` appear under `meta` on the `wp/v2` endpoints of their object type.
- Writes are validated against the schema (`400`), sanitized, then checked with `auth_callback` (`401`/`403`). Numeric strings pass for `integer` keys.
- `null` deletes a single key, so reads fall back to the default.
- A custom `prepare_callback` replaces the default output handling; call `WP_REST_Meta_Fields::prepare_value( $value, $request, $args )` inside it to keep type casting.
- The editor loads the meta schema once; reload it after changing registrations.

Custom endpoints and `register_rest_field()`: [wp-rest-api](../../wp-rest-api/SKILL.md).

## Editor panel with [`useEntityProp`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-core-data/#useentityprop)

`useEntityProp()` returns `[ value, setValue ]` for a property of the current entity. Edits to `meta` are merged, so `setMeta( { key: value } )` keeps the other keys, and they are saved with the post.

```js
import { TextControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel, store as editorStore } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

function BookDetailsPanel() {
	const { postType, postId } = useSelect( ( select ) => {
		const { getCurrentPostType, getCurrentPostId } = select( editorStore );
		return { postType: getCurrentPostType(), postId: getCurrentPostId() };
	}, [] );
	const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta', postId );

	if ( postType !== 'myplugin_book' || ! meta ) {
		return null;
	}

	return (
		<PluginDocumentSettingPanel name="my-plugin-book-details" title={ __( 'Book details', 'my-plugin' ) }>
			<TextControl
				__next40pxDefaultSize
				label={ __( 'ISBN', 'my-plugin' ) }
				value={ meta.myplugin_isbn }
				onChange={ ( value ) => setMeta( { myplugin_isbn: value } ) }
			/>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin( 'my-plugin-book-details', { render: BookDetailsPanel } );
```

Enqueue on `enqueue_block_editor_assets` and build with `@wordpress/scripts` ([wp-block-development](../../wp-block-development/SKILL.md)). Inside a custom block, read `postId` and `postType` from block context so it also works in Query Loops. If the value only needs to appear in a paragraph, heading, image, or button, a binding (SKILL.md, step 3) replaces the panel.
