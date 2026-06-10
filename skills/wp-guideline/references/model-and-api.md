# Guidelines model and API

## Core concepts

Guidelines use WordPress content primitives instead of a plugin-private schema:

- Post type: `wp_guideline`
- Type taxonomy: `wp_guideline_type`
- Standard REST collection: `/wp/v2/guidelines`
- Content singleton REST route: `/wp/v2/content-guidelines`
- Standard fields for non-content types: `title`, `excerpt`, `content`, `author`, `status`, revisions

Treat `wp_guideline` as the shared storage surface. Do not create parallel post types such as `wp_skill`, `wp_memory`, or plugin-specific options for agent instructions when the target site supports Guidelines.

## Type slugs

Common or emerging type slugs include:

- `content`: site-wide editorial/content guidelines, currently represented as a singleton with structured category meta.
- `artifact`: agent-created working material such as notes, drafts, research, or intermediate outputs.
- `memory`: remembered facts and observations for later agent context.
- `skill`: procedural instructions a plugin, site, or user wants an agent to load on demand.
- `plan`: multi-step task state, commonly represented as markdown checkboxes in `post_content`.
- `instruction`: explicit site or user instructions for agent behavior.

Always inspect the target site before assuming a type exists. Fetch or create terms in `wp_guideline_type` only when the product flow expects that type and the current user has permission.

## Content singleton vs document types

Use `/wp/v2/content-guidelines` only for the admin-curated `content` singleton. It stores categories such as site, copy, images, additional, and block-specific guidelines.

Use `/wp/v2/guidelines` for document-like rows such as skills, memories, artifacts, plans, and instructions. These rows should use:

- `post_title` as the discoverable name.
- `post_excerpt` as a short description an agent can scan before loading full content.
- `post_content` as the full body, usually markdown or blocks.
- `wp_guideline_type` terms to classify the row.

## Visibility and permissions

Guidelines are non-public content. Do not treat `publish` as web-public. In the Guidelines model, `publish` means available to logged-in users on the site who have guideline read access, while `private` means author-scoped unless a privileged user can read it.

Prefer these defaults:

- Agent-created or user-specific rows: `private`.
- Plugin-provided defaults intended for the whole site: `publish` only from an administrator action or explicit setup flow.
- Draft/admin work-in-progress rows: never inject into an agent prompt.
- Trashed rows: never inject into an agent prompt.

Never bypass WordPress capabilities. Use `current_user_can( 'read_post', $post_id )`, `edit_post`, or the REST controller permission checks instead of direct SQL reads.

## REST patterns

Resolve a type term before querying by type:

```http
GET /wp-json/wp/v2/wp_guideline_type?slug=skill&context=edit
```

Query guideline documents by term id and context:

```http
GET /wp-json/wp/v2/guidelines?context=edit&wp_guideline_type=123&per_page=100
```

Find a known plugin-provided skill by post slug:

```http
GET /wp-json/wp/v2/guidelines?context=edit&slug=transcribe
```

Create a document row with standard fields and a term id:

```json
{
  "status": "private",
  "title": "Transcribe",
  "excerpt": "Site-specific transcription cleanup and formatting rules.",
  "content": "Follow the site's spelling, cleanup, and formatting rules...",
  "wp_guideline_type": [123]
}
```

Use `context=edit` only for authenticated flows that need raw content or editable fields. Use `_fields` to keep agent discovery responses small.

## Agent context loading

Load Guidelines progressively:

1. List readable candidates using title, excerpt, slug, modified date, and type terms.
2. Select the smallest relevant set for the task.
3. Load full `content.raw` only for selected rows.
4. Preserve source boundaries in prompt assembly so memories, skills, instructions, plans, and artifacts are not blended together.

Do not inject every guideline into every prompt. Skills and artifacts should usually be loaded on demand.
