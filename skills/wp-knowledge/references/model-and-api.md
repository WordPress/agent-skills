# Guidelines and Knowledge model and API

## Core concepts

Use WordPress content primitives instead of plugin-private schemas.

Primary Knowledge storage:

- Post type: `wp_knowledge`
- Type taxonomy: `wp_knowledge_type`
- Standard REST collection: `/wp/v2/knowledge`
- Type term REST endpoint: `/wp/v2/wp_knowledge_type`
- Standard fields: `title`, `excerpt`, `content`, `author`, `status`, revisions

User-facing Guidelines surfaces remain:

- Settings > Guidelines labels and UX
- Content guidelines route: `/wp/v2/content-guidelines`
- Guideline scopes such as `site`, `copy`, `images`, and `additional`

Legacy compatibility storage:

- Post type: `wp_guideline`
- Type taxonomy: `wp_guideline_type`
- Legacy REST collection: `/wp/v2/guidelines`

Treat `wp_knowledge` as the preferred shared storage surface. Use legacy `wp_guideline` only when the target runtime exposes it as the available backend or when a platform such as WordPress.com explicitly reads both stores for compatibility. Do not create parallel post types such as `wp_skill`, `wp_memory`, or plugin-specific options when the target site supports a shared Knowledge/Guidelines surface.

## Type slugs

Gutenberg/Core Knowledge built-ins:

- `guideline`: site-wide content guidelines, backed by `guideline-` slugs and the Settings > Guidelines experience.
- `memory`: remembered facts and observations for later agent context.
- `note`: private freeform working text and the save-time fallback when no type term is assigned.

WordPress.com agent/product types:

- `guideline`: site-wide content standards.
- `instruction`: explicit site or user agent instructions.
- `memory`: remembered facts and observations.
- `skill`: procedural instructions loaded on demand.
- `plan`: task state, usually markdown checkboxes in `post_content`.
- `artifact`: notes, research, drafts, or saved work-in-progress.

Always inspect the target site before assuming a type exists. Fetch or create terms in the active type taxonomy only when the product flow expects that type and the current user has permission.

Do not use the old `content` type in new Knowledge code. In the merged Knowledge model, the content-guidelines singleton/scope rows carry the `guideline` type. On pure Gutenberg/Core, map generic saved work to `note` unless the runtime has registered `artifact`.

## Content guideline scopes

Use `/wp/v2/content-guidelines` for the Settings > Guidelines content-guideline surface, not for arbitrary memory, skill, plan, instruction, artifact, or note documents.

In the WordPress.com PRD, the general-agent contract supports these published `guideline` rows:

- `guideline-site`
- `guideline-copy`
- `guideline-images`
- `guideline-additional`

Private content guidance belongs in `instruction`, not in a private `guideline` row. Block-specific guideline slugs may exist in Gutenberg/Core scopes, but WordPress.com general-agent support for block-specific slugs is deferred in the PRD.

Use `/wp/v2/knowledge` for document-like rows such as memories, skills, notes, plans, instructions, and artifacts. These rows should use:

- `post_title` as the discoverable name.
- `post_excerpt` as a short description an agent can scan before loading full content.
- `post_content` as the full body, usually markdown or blocks.
- `wp_knowledge_type` terms to classify the row.

## Visibility and permissions

Knowledge rows are non-public content. Do not treat `publish` as web-public. In this model, `publish` means available to logged-in users on the site who have read access, while `private` means author-scoped unless a privileged user can read it.

Prefer these defaults:

- Agent-created or user-specific rows: `private`.
- Content guidelines: `publish`, explicit user intent, and an allowed `guideline-` slug.
- Plugin-provided defaults intended for the whole site: `publish` only from an administrator action or explicit setup flow.
- Draft/admin work-in-progress rows: never inject into an agent prompt.
- Trashed rows: never inject into an agent prompt.

Gutenberg/Core Knowledge uses a `*_knowledge_items` primitive capability surface such as `read_knowledge_items`, `edit_knowledge_items`, and `publish_knowledge_items`; per-post checks still use `read_post`, `edit_post`, and `delete_post`. Legacy WordPress.com compatibility code may still expose guideline-prefixed caps such as `edit_guidelines` and `publish_guidelines`.

Never bypass WordPress capabilities. Use `current_user_can( 'read_post', $post_id )`, `edit_post`, or the REST controller permission checks instead of direct SQL reads.

## REST patterns

Resolve the active backend first. Prefer Knowledge:

```php
$backend = null;

if ( post_type_exists( 'wp_knowledge' ) && taxonomy_exists( 'wp_knowledge_type' ) ) {
	$backend = array(
		'post_type' => 'wp_knowledge',
		'taxonomy'  => 'wp_knowledge_type',
		'rest_base' => 'knowledge',
	);
} elseif ( post_type_exists( 'wp_guideline' ) && taxonomy_exists( 'wp_guideline_type' ) ) {
	$backend = array(
		'post_type' => 'wp_guideline',
		'taxonomy'  => 'wp_guideline_type',
		'rest_base' => 'guidelines',
	);
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

Use the matching legacy route and taxonomy query arg only when the backend is legacy:

```http
GET /wp-json/wp/v2/guidelines?context=edit&status=private&wp_guideline_type=123&per_page=100
```

Use `context=edit` only for authenticated flows that need raw content or editable fields. Use `_fields` to keep agent discovery responses small.

## WordPress.com ability model

When the `wpcom/guidelines` ability is available, prefer it over hand-rolled REST calls for agent actions. It uses:

- `action`: `create`, `update`, `delete`, `list`, `get`, or `search`
- `type`: `guideline`, `instruction`, `memory`, `skill`, `plan`, or `artifact`
- standard fields: `slug`, `title`, `description`, `content`, `status`

The ability defaults most new rows to `private`. Type `guideline` requires `publish`, explicit user intent, publish permission, and one of the supported reserved slugs. Code-defined defaults registered with `wpcom_ai_register_default_guideline()` appear in list/get/search/context paths without creating posts, and visible same-slug CPT rows can override them when allowed.

## Agent context loading

Load progressively:

1. List readable candidates using title, excerpt, slug, modified date, and type terms.
2. Select the smallest relevant set for the task.
3. Load full `content.raw` only for selected rows.
4. Preserve source boundaries in prompt assembly so memories, skills, instructions, plans, notes, and artifacts are not blended together.

Prompt defaults from the WordPress.com PRD:

- `instruction`: inject full published instructions plus the current user's private instructions.
- `memory`: inject title/excerpt summaries; load full content on demand.
- `skill`: inject title/excerpt summaries; load full content on demand.
- `guideline`: inject title/slug/excerpt summaries for supported published content-guideline rows; load full content on demand.
- `plan`: inject the active plan's markdown checklist when active.
- `artifact`: do not inject by default; retrieve with get/search when relevant.

Do not inject every row into every prompt. Skills, content guidelines, notes, and artifacts should usually be loaded on demand.
