---
name: wp-knowledge
description: "Use when adding, consuming, or auditing WordPress Guidelines and Knowledge support in plugins, themes, mu-plugins, WordPress.com agent integrations, or Gutenberg/Core work: wp_knowledge CPT, wp_knowledge_type taxonomy, /wp/v2/knowledge, /wp/v2/content-guidelines, legacy wp_guideline compatibility, wpcom/guidelines ability usage, content guideline scopes, memories, skills, plans, artifacts/notes, instructions, plugin defaults, and agent context loading."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+) and Gutenberg/WordPress.com Guidelines or Knowledge implementations. Filesystem-based agent with bash + node. Some verification requires WP-CLI or wp-env."
---

# WP Knowledge

## When to use

Use this skill when a WordPress project needs to:

- create or consume `wp_knowledge` posts or `wp_knowledge_type` terms
- support legacy `wp_guideline` / `wp_guideline_type` data as a compatibility fallback
- read or write Knowledge through `/wp/v2/knowledge`
- use the `/wp/v2/content-guidelines` Settings > Guidelines route
- use the WordPress.com `wpcom/guidelines` ability for agent CRUD
- ship plugin-provided skills, instructions, artifacts, memories, plans, or defaults
- migrate plugin-private prompts, instructions, memories, artifacts, or plans into WordPress storage
- make an agent integration discover and load site-scoped guidance safely

## Inputs required

- Repo root and target plugin/theme/mu-plugin.
- Target runtime: Gutenberg/Core Knowledge, WordPress.com compatibility layer, legacy Guidelines polyfill, or custom platform.
- Storage backend, if known: `wp_knowledge` preferred; `wp_guideline` legacy only when Knowledge is unavailable or compatibility reads are required.
- Knowledge/guideline type and scope: `guideline`, `instruction`, `memory`, `skill`, `plan`, `artifact`, `note`, or a custom subtype.
- Whether the row is user-private, site-wide, plugin-provided default, agent-created, or code-defined.
- Existing storage location if migrating from options, custom tables, files, or plugin-specific CPTs.

## Procedure

### 0) Route and inspect the project

1. Run triage:
   - `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. If this is plugin work, also use `wp-plugin-development`.
3. If you add custom REST endpoints or fields, also use `wp-rest-api`.
4. If you expose agent-callable actions, also use `wp-abilities-api`.

Search the target codebase for:

- `wp_knowledge`, `wp_knowledge_type`, `wp_knowledge_types`
- `wp_guideline`, `wp_guideline_type`, `wp_guideline_types`
- `/wp/v2/knowledge`, `/wp/v2/guidelines`, `content-guidelines`
- `wpcom/guidelines`, `wpcom_ai_register_default_guideline`, `wpcom_ai_default_guidelines`
- existing prompt, memory, skill, instruction, artifact, note, or plan storage

### 1) Confirm the active storage surface

Prefer the complete Knowledge backend when it exists:

- `post_type_exists( 'wp_knowledge' )`
- `taxonomy_exists( 'wp_knowledge_type' )`
- REST index exposes `/wp/v2/knowledge`
- term endpoint exposes `/wp/v2/wp_knowledge_type`

Use the legacy Guidelines backend only as a fallback or compatibility read surface:

- `post_type_exists( 'wp_guideline' )`
- `taxonomy_exists( 'wp_guideline_type' )`
- REST index exposes `/wp/v2/guidelines`
- term endpoint exposes `/wp/v2/wp_guideline_type`

Do not mix backend pairs. A Knowledge row uses `wp_knowledge` plus `wp_knowledge_type`; a legacy row uses `wp_guideline` plus `wp_guideline_type`.

On WordPress.com, the compatibility layer may read both stores while new writes prefer Knowledge when it is registered. If the `wpcom/guidelines` ability is available, prefer it for agent CRUD because it hides backend selection and enforces the product status policy.

For the storage model, type slugs, REST routes, and privacy rules, read:

- `references/model-and-api.md`

### 2) Choose the right type

Use the narrowest type that matches the data:

- `guideline`: site-wide content standards. WordPress.com general-agent writes are limited to `guideline-site`, `guideline-copy`, `guideline-images`, and `guideline-additional`, always with `publish`.
- `instruction`: explicit site or user instructions that should shape agent behavior. Private instructions apply only to the current user; published instructions apply to everybody on the site.
- `memory`: remembered facts or observations, usually private and agent-created after checking for duplicates.
- `skill`: procedural instructions loaded on demand.
- `plan`: task state and checklists, usually markdown checkboxes in `post_content`.
- `artifact`: saved work-in-progress in the WordPress.com ability model.
- `note`: the generic Gutenberg/Core fallback for freeform working text when no type term is provided.

Do not use the old `content` type. In the Knowledge model, content guidelines are `guideline`-typed rows. Do not assume `skill`, `plan`, `instruction`, or `artifact` are Gutenberg/Core built-ins; register or verify them when the target runtime is not WordPress.com.

### 3) Read and write through WordPress primitives

Use normal WordPress post, taxonomy, REST, and capability APIs:

- Resolve the active type taxonomy term before assigning it.
- Store document rows in standard fields: title, excerpt, content, author, status.
- Default agent-created/user-specific rows to `private`.
- Use `publish` only for site-wide rows from an administrator-controlled flow or explicit user request.
- Use `current_user_can( 'read_post', $post_id )`, `current_user_can( 'edit_post', $post_id )`, and `current_user_can( 'delete_post', $post_id )` for server-side access checks.
- Use authenticated REST with `context=edit` only when raw fields are required.

For implementation patterns and PHP snippets, read:

- `references/plugin-patterns.md`

### 4) Handle WordPress.com product behavior

When working in WordPress.com agent code:

- Prefer the `wpcom/guidelines` ability for create, update, delete, list, get, and search actions.
- Preserve the six product types from the PRD: `guideline`, `instruction`, `memory`, `skill`, `plan`, `artifact`.
- Use `wpcom_ai_register_default_guideline()` for code-defined defaults that should appear in read/context paths without creating posts.
- Let visible CPT rows override same-slug defaults only when the default allows override.
- Preserve `guideline_source` provenance when installing marketplace or plugin-provided skills.
- Keep `draft`, `pending`, `auto-draft`, and `trash` out of agent prompt context.
- Treat scheduled `plan` rows with `future` status as a special/deferred design area; resolve the status-as-visibility conflict before implementing scheduled plans.

### 5) Seed plugin-provided defaults carefully

When a plugin ships a default skill, instruction, or artifact/note template:

- Prefer a code-defined default when the target provides a default-guideline registry.
- Use a stable slug such as `my-plugin-transcribe` for persistent rows.
- Make creation idempotent.
- Preserve user edits after the first install/setup.
- Store a plugin-specific seed hash if you need to update only untouched rows.
- Leave seeded rows on uninstall unless the user explicitly chooses cleanup.

Avoid writing rows on every page load. Prefer activation, setup screens, WP-CLI commands, or explicit admin actions.

### 6) Integrate with agents progressively

For agent context:

1. List candidates with title, excerpt, slug, modified date, and type.
2. Select relevant rows for the task.
3. Load full content only for selected rows.
4. Keep source boundaries visible in prompt assembly.
5. Never inject drafts, trash, unreadable private rows, or every available row by default.

## Verification

- Triage still detects the expected WordPress project type.
- The active backend exists before integration code runs, or the fallback path is tested.
- Created rows have the expected status, author, title, excerpt, content, slug, and type terms.
- Knowledge writes use `wp_knowledge` with `wp_knowledge_type`; legacy writes use `wp_guideline` with `wp_guideline_type`.
- REST reads work with `context=edit` only for authenticated users with permission.
- Server-side queries filter by type term and still call `current_user_can( 'read_post', $post_id )`.
- Plugin-provided defaults are idempotent and do not clobber user-edited rows.
- WordPress.com behavior matches the local PRD when `wpcom/guidelines` or default guidelines are involved.
- Repo PHP/JS lint, tests, and build commands pass where available.

## Failure modes / debugging

- Missing `/wp/v2/knowledge`:
  - Knowledge support is not active, the Gutenberg experiment is disabled, or the site uses an older/custom runtime.
- Only legacy `/wp/v2/guidelines` exists:
  - Treat it as a compatibility fallback; do not assume it is the current Gutenberg/Core shape.
- REST collection returns an empty array:
  - A bare `GET /wp/v2/knowledge` follows the WordPress default status filter. Request an explicit readable status when looking for private or draft rows.
- Term assignment creates the wrong term:
  - A hierarchical taxonomy received a raw string instead of a resolved term id, or the code mixed Knowledge and legacy taxonomy names.
- Plugin seed overwrites user edits:
  - Seeder lacks a stable slug/hash and does not distinguish untouched defaults from edited rows.
- Agent prompt gets too much context:
  - The integration loads every readable row instead of using title/excerpt discovery.

## Escalation

Ask for human confirmation before:

- adding a compatibility polyfill for `wp_knowledge` or legacy `wp_guideline`
- publishing site-wide guidance, instructions, or skills on activation
- deleting seeded rows on uninstall
- creating custom type slugs that other plugins or products might also need
- implementing scheduled plans with `future` status

If current core/Gutenberg or WordPress.com behavior is unclear, inspect the target runtime and the active PRD before coding against assumptions.
