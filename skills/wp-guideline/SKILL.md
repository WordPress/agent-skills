---
name: wp-guideline
description: "Use when adding, consuming, or auditing WordPress Guidelines support in plugins, themes, mu-plugins, or agent integrations: wp_guideline CPT, wp_guideline_type taxonomy, /wp/v2/guidelines and /wp/v2/content-guidelines REST usage, guideline types such as content, artifact, memory, skill, plan, instruction, plugin-provided defaults, and compatibility with the Gutenberg Guidelines experiment."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+) and the Gutenberg Guidelines experiment. Filesystem-based agent with bash + node. Some verification requires WP-CLI or wp-env."
---

# WP Guideline

## When to use

Use this skill when a WordPress project needs to:

- create or consume `wp_guideline` posts
- work with the `wp_guideline_type` taxonomy
- read or write Guidelines through `/wp/v2/guidelines`
- use the `/wp/v2/content-guidelines` singleton route
- ship plugin-provided skills, instructions, artifacts, memories, plans, or defaults
- migrate plugin-private prompts, instructions, memories, or artifacts into WordPress Guidelines
- make an agent integration discover and load site-scoped Guidelines safely

## Inputs required

- Repo root and target plugin/theme/mu-plugin.
- Target runtime: WordPress core, Gutenberg plugin, WordPress.com, or a custom polyfill.
- Guideline type and scope: `content`, `artifact`, `memory`, `skill`, `plan`, `instruction`, or a custom subtype.
- Whether the row is user-private, site-wide, plugin-provided default, or agent-created.
- Existing storage location if migrating from options, custom tables, files, or plugin-specific CPTs.

## Procedure

### 0) Route and inspect the project

1. Run triage:
   - `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. If this is plugin work, also use `wp-plugin-development`.
3. If you add custom REST endpoints or fields, also use `wp-rest-api`.
4. If you expose agent-callable actions, also use `wp-abilities-api`.

Search the target codebase for:

- `wp_guideline`
- `wp_guideline_type`
- `content-guidelines`
- `guideline`
- existing prompt, memory, skill, instruction, artifact, or plan storage

### 1) Confirm the Guidelines surface

Check the target environment before assuming support:

- `post_type_exists( 'wp_guideline' )`
- `taxonomy_exists( 'wp_guideline_type' )`
- REST index exposes `/wp/v2/guidelines`
- term endpoint exposes `/wp/v2/wp_guideline_type`

Do not create a plugin-private replacement when the shared surface exists. If the target site does not support Guidelines, degrade gracefully or implement an explicit compatibility polyfill that no-ops when core/Gutenberg already registers the same names.

For the storage model, type slugs, REST routes, and privacy rules, read:

- `references/model-and-api.md`

### 2) Choose the right guideline type

Use the narrowest type that matches the data:

- `content`: site-wide editorial guidance handled by the content singleton route.
- `skill`: procedural instructions loaded on demand.
- `instruction`: explicit directives that should shape agent behavior.
- `memory`: remembered facts or observations.
- `artifact`: drafts, notes, research, or intermediate work.
- `plan`: task state and checklists.

Do not overload `content` for plugin-provided skills or agent artifacts. Do not invent a new type if an existing slug carries the meaning.

### 3) Read and write through WordPress primitives

Use normal WordPress post, taxonomy, REST, and capability APIs:

- Resolve `wp_guideline_type` terms before assigning them.
- Store non-content types in standard fields: title, excerpt, content, author, status.
- Default agent-created/user-specific rows to `private`.
- Use `publish` only for site-wide defaults from an administrator-controlled flow.
- Use `current_user_can( 'read_post', $post_id )`, `current_user_can( 'edit_post', $post_id )`, and `current_user_can( 'delete_post', $post_id )` for server-side access checks.
- Use authenticated REST with `context=edit` only when raw fields are required.

For implementation patterns and PHP snippets, read:

- `references/plugin-patterns.md`

### 4) Seed plugin-provided defaults carefully

When a plugin ships a default skill, instruction, or artifact template:

- Use a stable slug such as `my-plugin-transcribe`.
- Make creation idempotent.
- Preserve user edits after the first install/setup.
- Store a plugin-specific seed hash if you need to update only untouched rows.
- Leave seeded guidelines on uninstall unless the user explicitly chooses cleanup.

Avoid writing Guidelines on every page load. Prefer activation, setup screens, WP-CLI commands, or explicit admin actions.

### 5) Integrate with agents progressively

For agent context:

1. List candidates with title, excerpt, slug, modified date, and type.
2. Select relevant rows for the task.
3. Load full content only for selected rows.
4. Keep source boundaries visible in prompt assembly.
5. Never inject drafts, trash, unreadable private rows, or every available guideline by default.

## Verification

- Triage still detects the expected WordPress project type.
- `wp_guideline` and `wp_guideline_type` exist before integration code runs, or the fallback path is tested.
- Created rows have the expected status, author, title, excerpt, content, slug, and type terms.
- REST reads work with `context=edit` only for authenticated users with permission.
- Server-side queries filter by type term and still call `current_user_can( 'read_post', $post_id )`.
- Plugin-provided defaults are idempotent and do not clobber user-edited guidelines.
- Repo PHP/JS lint, tests, and build commands pass where available.

## Failure modes / debugging

- Missing `/wp/v2/guidelines`:
  - Guidelines support is not active, the Gutenberg experiment is disabled, or the site uses an older/custom runtime.
- Term assignment creates the wrong term:
  - A hierarchical taxonomy received a raw string instead of a resolved term id.
- REST query returns no content:
  - Missing authentication, wrong `context`, unreadable status, or querying by post slug when you meant type term.
- Plugin seed overwrites user edits:
  - Seeder lacks a stable slug/hash and does not distinguish untouched defaults from edited rows.
- Agent prompt gets too much context:
  - The integration loads every readable guideline instead of using title/excerpt discovery.

## Escalation

Ask for human confirmation before:

- adding a compatibility polyfill for `wp_guideline`
- publishing site-wide Guidelines on plugin activation
- deleting seeded guideline rows on uninstall
- creating custom guideline type slugs that other plugins or products might also need

If current core/Gutenberg behavior is unclear, inspect the target runtime or consult the active Gutenberg Guidelines implementation before coding against assumptions.
