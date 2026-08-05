# Knowledge model and API

## Core concepts

Knowledge is a WordPress-native place for non-public, reusable material that should live where the rest of a site's work already lives. It is useful for agent context, but it is not only an AI feature: it also creates a shared data layer for notes, memories, site guidance, plugin-provided procedures, sync tools, search, and future knowledge-base plugins.

Use WordPress content primitives instead of plugin-private schemas:

- Post type: `wp_knowledge`
- Type taxonomy: `wp_knowledge_type`
- Standard REST collection: `/wp/v2/knowledge`
- Type term REST endpoint: `/wp/v2/wp_knowledge_type`
- Standard fields: `title`, `excerpt`, `content`, `author`, `status`, revisions
- Primitive capabilities such as `read_knowledge_items`, `edit_knowledge_items`, and `publish_knowledge_items`

Until Knowledge ships in Core, require WordPress 7.0+ behavior through Gutenberg 23.6+ with the Guidelines experiment active. Do not create parallel post types such as `wp_skill`, `wp_memory`, or plugin-specific options when the target site supports `wp_knowledge`.

Settings > Guidelines is a user-facing surface on top of Knowledge. Its scope rows are still `wp_knowledge` posts with `wp_knowledge_type=guideline`; use `/wp/v2/content-guidelines` only for that Settings experience and `/wp/v2/knowledge` for general document rows.

## Type slugs

Built-in Knowledge types:

- `guideline`: site guidance, backed by `guideline-` slugs and the Settings > Guidelines experience. Use it when the same material should be available to agents and reusable as system-prompt context by another integration.
- `memory`: remembered facts and observations for later context.
- `note`: private freeform working text and the save-time fallback when no type term is assigned.

Plugin-defined types:

- `skill`: procedural guidance loaded on demand. Register or verify this type before relying on it.
- Custom slugs: use only when the product flow owns the type and can explain how agents should discover and load it.

Plugins can register type labels through the `wp_knowledge_types` filter. That registry does not replace taxonomy terms; it only defines known type metadata. Fetch or create terms in `wp_knowledge_type` only when the current user has permission.

## Guideline scopes

Guideline scope rows use the `guideline` type and reserved slugs such as:

- `guideline-site`
- `guideline-copy`
- `guideline-images`
- `guideline-additional`

Block-specific guideline rows may also exist when the target runtime exposes them. Do not store memories, skills, or notes in the guideline scope route.

Use `/wp/v2/knowledge` for document-like rows. These rows should use:

- `post_title` as the discoverable name.
- `post_excerpt` as a concise discovery summary, analogous to a skill description, that helps an agent decide whether to load full content.
- `post_content` as the full body, usually markdown or blocks.
- `wp_knowledge_type` terms to classify the row.

## Visibility and permissions

Knowledge rows are non-public content. Do not treat `publish` as web-public. In this model, `publish` means available to logged-in users on the site who have read access, while `private` means author-scoped unless a privileged user can read it.

Prefer these defaults:

- Agent-created or user-specific rows: `private`.
- Guideline scope rows: `publish`, explicit user intent, and an allowed `guideline-` slug.
- Plugin-provided defaults intended for the whole site: `publish` only from an administrator action or explicit setup flow.
- Draft/admin work-in-progress rows: never inject into an agent prompt.
- Trashed rows: never inject into an agent prompt.

Knowledge uses a `*_knowledge_items` primitive capability surface:

- `read_knowledge_items`
- `edit_knowledge_items`
- `edit_others_knowledge_items`
- `edit_published_knowledge_items`
- `edit_private_knowledge_items`
- `publish_knowledge_items`
- `delete_knowledge_items`
- `delete_others_knowledge_items`
- `delete_published_knowledge_items`
- `delete_private_knowledge_items`
- `read_private_knowledge_items`

Per-post checks still use `read_post`, `edit_post`, and `delete_post`. Never bypass WordPress capabilities; use `current_user_can( 'read_post', $post_id )`, `edit_post`, or the REST controller permission checks instead of direct SQL reads.

## REST patterns

Confirm Knowledge availability before using REST:

```php
function my_plugin_has_knowledge(): bool {
	return post_type_exists( 'wp_knowledge' ) && taxonomy_exists( 'wp_knowledge_type' );
}
```

Resolve a type term before querying by type:

```http
GET /wp-json/wp/v2/wp_knowledge_type?slug=skill&context=edit
```

Query document rows by term id and context:

```http
GET /wp-json/wp/v2/knowledge?context=edit&status=private&wp_knowledge_type=123&per_page=100
```

Find a known plugin-provided skill by post slug:

```http
GET /wp-json/wp/v2/knowledge?context=edit&slug=transcribe
```

Create a document row with standard fields and a term id:

```json
{
  "status": "private",
  "title": "Transcribe",
  "excerpt": "Site-specific transcription cleanup and formatting rules.",
  "content": "Follow the site's spelling, cleanup, and formatting rules...",
  "wp_knowledge_type": [123]
}
```

Use `context=edit` only for authenticated flows that need raw content or editable fields. Use `_fields` to keep agent discovery responses small.

## Agent context loading

Load progressively:

1. Put each readable candidate's title and excerpt into agent discovery context, alongside its slug, modified date, and type terms.
2. Select the smallest relevant set for the task.
3. Load full `content.raw` only for selected rows.
4. Preserve source boundaries in prompt assembly so memories, skills, notes, and guidelines are not blended together.

Recommended defaults:

- `memory`: inject title/excerpt summaries; load full content on demand.
- `skill`: inject title/excerpt summaries; load full content on demand.
- `guideline`: inject title/slug/excerpt summaries for relevant published guideline rows; load full content on demand.
- `note`: do not inject by default; retrieve with get/search when relevant.

Do not inject every row into every prompt. Skills, guidelines, and notes should usually be loaded on demand.
