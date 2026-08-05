---
name: wp-knowledge
description: "Use when adding, consuming, or auditing WordPress site notes or Knowledge support in plugins, themes, mu-plugins, agent integrations, or Gutenberg/Core work: wp_knowledge CPT, wp_knowledge_type taxonomy, /wp/v2/knowledge, /wp/v2/content-guidelines, Gutenberg 23.6+ Guidelines experiment, guideline/memory/note/custom skill types, plugin defaults, capability-safe writes, and progressive agent context loading."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+) with the Gutenberg 23.6+ Guidelines experiment active until Knowledge ships in Core. Filesystem-based agent with bash + node. Some verification requires WP-CLI or wp-env."
---

# WP Knowledge

WordPress Knowledge is the shared, non-public content layer for reusable site context. It stores notes, memories, guidance, and custom procedures as standard WordPress content so plugins, people, agents, and other tools can discover and reuse the same material instead of each integration inventing private storage.

## When to use

Use this skill when a WordPress project needs to:

- create or consume `wp_knowledge` posts or `wp_knowledge_type` terms
- add notes or reusable site context that should be available beyond one plugin
- read or write Knowledge through `/wp/v2/knowledge`
- use the Settings > Guidelines surface and its `/wp/v2/content-guidelines` route
- register or consume Knowledge types such as `guideline`, `memory`, `note`, or a plugin-defined `skill`
- ship plugin-provided skills, memories, notes, or defaults
- migrate plugin-private prompts, memories, or notes into WordPress storage
- make an agent integration discover and load site-scoped knowledge safely

## Inputs required

- Repo root and target plugin/theme/mu-plugin.
- Target runtime and whether Gutenberg 23.6+ has the Guidelines experiment active.
- Knowledge type and scope: `guideline`, `memory`, `note`, `skill`, or another explicitly registered custom type.
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
- `/wp/v2/knowledge`, `content-guidelines`, `guideline-scopes`
- `read_knowledge_items`, `edit_knowledge_items`, `publish_knowledge_items`
- existing prompt, memory, skill, note, or default storage

### 1) Confirm Knowledge is available

Knowledge requires a complete `wp_knowledge` backend. Check all of these before integrating:

- `post_type_exists( 'wp_knowledge' )`
- `taxonomy_exists( 'wp_knowledge_type' )`
- REST index exposes `/wp/v2/knowledge`
- term endpoint exposes `/wp/v2/wp_knowledge_type`
- if relying on Settings > Guidelines, the Gutenberg 23.6+ Guidelines experiment is active

Do not add a partial compatibility layer or alternate backend. If Knowledge is unavailable, make the dependency explicit: document the Gutenberg/Core requirement, add an admin/setup check, or skip the integration path until the site provides `wp_knowledge`.

For the storage model, type slugs, REST routes, and privacy rules, read:

- `references/model-and-api.md`

### 2) Choose the right type

Use the narrowest type that matches the data:

- `guideline`: site-wide guidance shown through Settings > Guidelines and backed by `guideline-` slugs. Use it when the same material should guide agents and serve as system-prompt context for another integration.
- `memory`: remembered facts or observations, usually private and agent-created after checking for duplicates.
- `note`: private freeform working text and the default generic document type.
- `skill`: procedural guidance loaded on demand only when the target site has registered or accepted a `skill` type.

Do not assume custom types exist. Register custom type labels through `wp_knowledge_types`, then resolve or create a matching `wp_knowledge_type` term before writing rows.

### 3) Read and write through WordPress primitives

Use normal WordPress post, taxonomy, REST, and capability APIs:

- Resolve the `wp_knowledge_type` term before assigning it.
- Store rows in standard fields: title, excerpt, content, author, status.
- Default agent-created or user-specific rows to `private`.
- Use `publish` only for site-wide rows from an administrator-controlled flow or explicit user request.
- Use primitive caps such as `read_knowledge_items`, `edit_knowledge_items`, and `publish_knowledge_items` for broad UI or setup checks.
- Use `current_user_can( 'read_post', $post_id )`, `current_user_can( 'edit_post', $post_id )`, and `current_user_can( 'delete_post', $post_id )` for row-specific access checks.
- Use authenticated REST with `context=edit` only when raw fields are required.

For implementation patterns and PHP snippets, read:

- `references/plugin-patterns.md`

### 4) Shape agent behavior around Knowledge

Agents that consume Knowledge should:

- put each readable row's title and excerpt into agent discovery context alongside its slug, modified date, and type
- treat the excerpt like a skill description: a concise, decision-useful summary that helps the agent decide whether to load the body
- select the smallest relevant set for the current task
- load full content only for the selected rows
- keep source boundaries visible in prompt assembly
- keep `draft`, `pending`, `auto-draft`, and `trash` rows out of prompt context
- treat `guideline` rows as site guidance, `memory` rows as remembered facts, `skill` rows as procedures, and `note` rows as supporting working text
- create or update rows only through explicit user intent, setup flows, or agent actions with clear provenance

### 5) Seed plugin-provided defaults carefully

When a plugin ships a default skill, memory, or note template:

- Prefer a code-defined default when the integration has a registry for defaults.
- Use a stable slug such as `my-plugin-transcribe` for persistent rows.
- Make creation idempotent.
- Preserve user edits after the first install/setup.
- Store a plugin-specific seed hash if you need to update only untouched rows.
- Leave seeded rows on uninstall unless the user explicitly chooses cleanup.

Avoid writing rows on every page load. Prefer activation, setup screens, WP-CLI commands, or explicit admin actions.

## Verification

- Triage still detects the expected WordPress project type.
- The target site exposes `wp_knowledge`, `wp_knowledge_type`, `/wp/v2/knowledge`, and the needed Knowledge capabilities.
- Gutenberg 23.6+ Guidelines experiment is active when the integration depends on Settings > Guidelines behavior.
- Created rows have the expected status, author, title, excerpt, content, slug, and type terms.
- Knowledge writes use `wp_knowledge` with `wp_knowledge_type`.
- REST reads work with `context=edit` only for authenticated users with permission.
- Server-side queries filter by type term and still call `current_user_can( 'read_post', $post_id )`.
- Plugin-provided defaults are idempotent and do not clobber user-edited rows.
- Agent discovery exposes titles and excerpts before loading full content.
- Agent context loading is progressive and excludes drafts, trash, unreadable private rows, and unrelated rows.
- Repo PHP/JS lint, tests, and build commands pass where available.

## Failure modes / debugging

- Missing `/wp/v2/knowledge`:
  - Knowledge support is not active, the Gutenberg 23.6+ Guidelines experiment is disabled, or the site uses an older runtime.
- Cannot read the collection:
  - Check `current_user_can( 'read_knowledge_items' )` and authenticated REST state.
- REST collection returns an empty array:
  - A bare `GET /wp/v2/knowledge` follows the WordPress default status filter. Request an explicit readable status when looking for private rows.
- Term assignment creates the wrong term:
  - A hierarchical taxonomy received a raw string instead of a resolved term id.
- Plugin seed overwrites user edits:
  - Seeder lacks a stable slug/hash and does not distinguish untouched defaults from edited rows.
- Agent prompt gets too much context:
  - The integration loads every readable row instead of using title/excerpt discovery.

## Escalation

Ask for human confirmation before:

- adding a dependency on Gutenberg 23.6+ Guidelines experiment behavior
- registering custom Knowledge type slugs that other plugins or products might also need
- publishing site-wide guidance or skills on activation
- deleting seeded rows on uninstall

If current Gutenberg/Core behavior is unclear, inspect the target runtime before coding against assumptions.
