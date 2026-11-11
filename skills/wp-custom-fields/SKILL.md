---
name: wp-custom-fields
description: "Use when registering or exposing WordPress post, term, or user meta (register_post_meta, register_term_meta, register_meta, show_in_rest), editing meta in the block editor, or showing it in blocks with Block Bindings (core/post-meta, register_block_bindings_source) or pattern overrides. Not for custom REST routes (wp-rest-api), custom block code (wp-block-development), or field plugin APIs."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WP Custom Fields

## When to use

- registering post, term, or user meta and exposing it to REST and the editor
- editing meta in a block editor panel
- showing meta in core blocks with Block Bindings, or writing a custom bindings source
- choosing between Block Bindings and pattern overrides
- debugging "meta not in REST", "binding shows the fallback text", "field missing in the bindings UI"

Custom REST routes: [wp-rest-api](../wp-rest-api/SKILL.md). Custom blocks: [wp-block-development](../wp-block-development/SKILL.md).

## Inputs required

- The plugin or theme that owns the fields.
- Per field: object type and subtype (post type, taxonomy), value type, single or multiple values.
- Who may read and who may edit each field.
- Where the value appears: editor panel, block, REST client, template.

## Procedure

### 0) Triage and inventory

1. Classify the project with `wp-project-triage`.
2. From the project root, find existing meta and bindings in the target plugin or theme:
   `rg -n "register_(post_|term_)?meta\(|register_block_bindings_source|registerBlockBindingsSource|\"bindings\":" <path>`

### 1) Register the fields

- Register each key once on `init`, after its post type or taxonomy, for one subtype or for all subtypes, not both.
- Set `type`, `single`, `sanitize_callback`, and `auth_callback`; set `default` when reads must not be empty.
- `show_in_rest` makes the value public. Arrays need `show_in_rest.schema.items`, objects `properties`.
- Custom post types need `show_in_rest` and `supports` with `custom-fields`.
- `register_meta()` returns `false` on invalid arguments; check it.

Read: [references/registering-meta.md](references/registering-meta.md)

### 2) Edit fields in the editor

Use `useEntityProp( 'postType', postType, 'meta', postId )` in a `PluginDocumentSettingPanel`, or bind the field to a block (step 3).

Read: [references/editor-and-rest.md](references/editor-and-rest.md)

### 3) Show fields in blocks

- Bind a supported attribute to `core/post-meta` with `args.key` in `metadata.bindings`.
- Posts without a value render the block empty; the saved text only shows when the binding cannot resolve.
- In the editor, connect fields in the block sidebar's "Attributes" panel.

Read: [references/block-bindings.md](references/block-bindings.md)

### 4) Custom sources

For formatted values, placeholders, or other storage: `register_block_bindings_source()` in PHP, `registerBlockBindingsSource()` in the editor. Check read access in the callback.

Read: [references/custom-sources.md](references/custom-sources.md)

### 5) Security review

Read: [references/security.md](references/security.md)

## Verification

- `OPTIONS /wp-json/wp/v2/<rest_base>` lists the key under `schema.properties.meta.properties`.
- An authenticated `GET ?context=edit` returns the typed value; an invalid `POST` returns `400`.
- The front end prints the bound value for a post that has one.
- In the editor the field is offered in the "Attributes" panel and editing the bound text updates the meta.

## Failure modes / debugging

- Meta missing from REST: no `show_in_rest`, wrong subtype, CPT without `custom-fields`, registration returned `false`, or the editor still has the old schema (reload).
- Binding shows the saved text: protected key (`_` prefix), no `show_in_rest`, post not readable by the visitor, no `postId` context, or attribute not bindable.
- Bound block is empty: the post has no value; `core/post-meta` returns `''` or the default, not `null`.
- Field missing in the bindings UI: field type differs from the attribute type, or the key starts with `_`.
- Bound value read-only: the source lacks `setValues` or a `canUserEditValue` returning `true`; for `core/post-meta` also inside a Query Loop or with the Custom Fields meta box enabled.
- Public data under a protected key: move it to a public key; do not unprotect with the `is_protected_meta` filter.
- Revision restore or preview misses a value: the key lacks `revisions_enabled`.
- Stale front end after a meta change: purge page caches; never write meta with direct SQL.

## Escalation

- Below WordPress 7.0, confirm the bindable attributes for that version.
- Values from external APIs or custom tables: agree on caching and privacy before writing a source.
- References: [`register_meta()`](https://developer.wordpress.org/reference/functions/register_meta/), [Block Bindings API](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/).
