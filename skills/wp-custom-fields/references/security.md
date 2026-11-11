# Security

Use this file before exposing meta to REST or the front end, and when reviewing a bindings source.

## Rule of thumb

- Public data: `show_in_rest`, bound with `core/post-meta`.
- Sensitive data (personal data, internal notes, tokens): a protected key (`_` prefix), never bound with `core/post-meta`. If editors need it in the block editor, keep `show_in_rest` and remove it from REST responses per post (below). If it must appear on the front end, use a custom source that checks access per post.

## Reading

- `show_in_rest` means public: anyone who can read the object through REST sees the value, including anonymous visitors for published posts.
- A leading underscore does not hide a `show_in_rest` key from REST.
- `prepare_callback` changes the REST output only. `core/post-meta` reads the raw value, so a masked, unprotected key is still printed by any binding, and any author can add one. `prepare_callback` also gets no object ID and cannot check permissions per post.
- A custom `get_value_callback` runs for every visitor. Check access like `core/post-meta` does and treat `$source_args` as untrusted.

```php
function myplugin_hide_internal_note( $response, $post ) {
	$data = $response->get_data();
	if ( isset( $data['meta'] ) && array_key_exists( '_myplugin_internal_note', $data['meta'] ) && ! current_user_can( 'edit_post', $post->ID ) ) {
		unset( $data['meta']['_myplugin_internal_note'] );
		$response->set_data( $data );
	}
	return $response;
}
add_filter( 'rest_prepare_myplugin_book', 'myplugin_hide_internal_note', 10, 2 );
add_filter( 'rest_prepare_revision', 'myplugin_hide_internal_note', 10, 2 );
```

The key is registered with `show_in_rest`, `sanitize_callback`, and an `auth_callback` that checks `edit_post`. Revision and autosave responses skip `rest_prepare_{$post_type}` but pass `rest_prepare_revision`; an author's autosave of their own draft returns the post's full meta. Both endpoints already require `edit_post`, so this hook matters when your rule is stricter (for example editors only).

## User meta

- User meta with `show_in_rest` is readable without login at `/wp/v2/users/<id>` for every user with published posts. Keep personal data out of REST.
- Without an `auth_callback`, users can write their own registered user meta through REST. Always set one.
- Personal data in meta needs a [personal data exporter](https://developer.wordpress.org/plugins/privacy/adding-the-personal-data-exporter-to-your-plugin/) and [eraser](https://developer.wordpress.org/plugins/privacy/adding-the-personal-data-eraser-to-your-plugin/) ([wp-plugin-development](../../wp-plugin-development/SKILL.md)).

## Writing

- Meta writes require `edit_post` (or `edit_term`, `edit_user`) on the object, then the key's `auth_callback`.
- Protected keys without an `auth_callback` cannot be written through REST.
- `sanitize_callback` runs for every write; schema validation only for REST writes.

## Bindings

- Changing bindings in the editor requires permission to edit the post (`edit_theme_options` in the Site Editor).
- Editing a bound `core/post-meta` value writes through REST, so `auth_callback` applies.
