# Block Bindings

Use this file when connecting block attributes to meta or other dynamic data, or when a binding does not render. Overview: [Block Bindings API](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/).

## Markup

```html
<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"myplugin_isbn"}}}}} -->
<p>ISBN</p>
<!-- /wp:paragraph -->
```

Bindings work in post content, patterns, and templates (theme `templates/*.html`, or `register_block_template()` from a plugin).

On render, core asks the source for each bound, supported attribute. Only `null` keeps the saved value; any other value, including `''`, replaces it. Rich-text values pass `wp_kses_post()`, HTML attributes are escaped (URLs with `esc_url()`).

## Bindable attributes

| Block | Attributes |
|-------|------------|
| Paragraph, Heading | `content` |
| Image | `id`, `url`, `title`, `alt`, `caption` |
| Button | `url`, `text`, `linkTarget`, `rel` |
| Post Date | `datetime` |
| Navigation Link, Navigation Submenu | `url` |
| List Item (WordPress 7.1+) | `content` |

As of WordPress 7.1. The current list comes from `get_block_bindings_supported_attributes()` and its `block_bindings_supported_attributes` filter; check them for other versions.

Add attributes with the `block_bindings_supported_attributes` or `block_bindings_supported_attributes_{$block_type}` filter. This works for dynamic blocks that read the attribute in PHP, and for static attributes whose `selector` is a plain tag name. The block must be registered in PHP for the editor to offer bindings.

```php
add_filter(
	'block_bindings_supported_attributes_my-plugin/book-badge',
	function ( $supported_attributes ) {
		$supported_attributes[] = 'label';
		return $supported_attributes;
	}
);
```

## `core/post-meta`

Args: `{ "key": "<meta_key>" }`. Context `postId` and `postType` comes from the current post, from a Query Loop, or from the editor.

The source returns `null`, so the saved text shows, when:

- `args.key` or `postId` is missing;
- the visitor cannot read the post, or it is password protected;
- the key is protected (`_` prefix);
- the key is not registered with `show_in_rest`.

Otherwise it returns `get_post_meta( $post_id, $key, true )`: the value, the registered `default`, or `''`. A post without a value therefore renders an empty block. For a placeholder like "ISBN not set", set a non-empty `default` or use a custom source that returns `null` for empty values (see SKILL.md, step 4). `single => false` keys yield their first value only.

In the editor:

- fields come from the post type's REST schema, without `_` keys; the field name is the `label`;
- editing the bound text writes the meta, except inside a Query Loop, with the Custom Fields meta box enabled, or without permission to edit the post;
- users who can edit the post see values of drafts and password-protected posts that visitors do not.

Other core sources: `core/post-data` (`field`: `date`, `modified`, `link`) and `core/term-data` (`field`: `id`, `name`, `link`, `slug`, `description`, `parent`, `count`). There is no core source for term meta, user meta, or options.

## Bindings UI

In the block sidebar's "Attributes" panel, add the attribute through the panel's options menu, click it, choose the source (listed by its label), then the field. A field is offered only if its type matches the attribute type (`rich-text` counts as `string`; Image `id` needs `number`). Users need permission to edit the post (or `edit_theme_options` in the Site Editor) to change bindings.

## Bindings vs pattern overrides

| | Block Bindings | Pattern overrides |
|---|---|---|
| Value stored in | the source (meta, custom storage) | the `core/block` instance |
| Scope | per post, wherever it is shown | per placement of a synced pattern |
| Needs | registered meta or a custom source | named blocks in a synced pattern |

Use pattern overrides when each placement of a synced pattern needs its own text, image, or link. The overridable block gets a `metadata.name` and `"__default": { "source": "core/pattern-overrides" }`; the instance stores its values:

```html
<!-- wp:paragraph {"metadata":{"name":"Tagline","bindings":{"__default":{"source":"core/pattern-overrides"}}}} -->
<p>Default tagline</p>
<!-- /wp:paragraph -->

<!-- wp:block {"ref":123,"content":{"Tagline":{"content":"Edited for this page"}}} /-->
```
