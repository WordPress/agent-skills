---
name: wp-core-upgrade
description: "Use when a developer needs to upgrade a WordPress plugin, theme, or site to be compatible with a newer WordPress core version: fetches official dev notes and field guides from make.wordpress.org, identifies breaking changes and deprecations that apply to the project, and produces an upgrade checklist or patch recommendations."
compatibility: "Targets WordPress 6.5+ (PHP 7.2.24+). Filesystem-based agent with bash + node. Requires web access to fetch make.wordpress.org dev notes."
---

# WP Core Upgrade

## When to use

Use this skill when a developer needs to:

- Upgrade a plugin, theme, or full site to target a new WordPress core version
- Audit existing code for compatibility with an upcoming or recently released WP version
- Understand which breaking changes, deprecations, or new APIs from a WP release apply to their codebase
- Get a prioritized checklist or implementation plan for a WP version migration

## Inputs required

- The **target WordPress version** (e.g., 6.9, 7.0).
- The **project type**: plugin, theme (classic or block), or full site.
- The **repo root** (or the paths to plugin/theme directories if it's a full site).
- Optionally: the **current WordPress version** the project targets (to scope the range of relevant release notes).

If any of these are unclear, ask one targeted question before proceeding.

## Procedure

### 0) Triage the project

1. Run triage to understand project structure and tooling:
   - `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. Note the project kind, PHP version, build tooling, and test suite present — these affect which release notes are relevant.

### 1) Fetch the release notes for the target version

Use the make.wordpress.org blog as the authoritative source. Dev notes and field guides are published for each release under the Core team blog.

Read `references/make-blog-sources.md` for:
- The URL patterns to find dev notes for a given WP version
- How to use `?output_format=markdown` to get content as Markdown
- What a field guide vs. a dev note is, and which to read first

**Fetch strategy:**

1. Start with the **Field Guide** post for the target version — it links to all relevant dev notes in one place.
2. For each dev note that appears potentially relevant (based on title), fetch the full content as Markdown.
3. Group what you find into categories: breaking changes, deprecations, new APIs, editor changes, performance, database.

**Important:** Treat source URLs as required evidence. If a finding has no source URL, mark it incomplete rather than presenting it as settled.

### 2) Identify which changes apply to the project

With the fetched release notes and the triage report in hand:

1. Scan the project for code patterns related to each release note. Search for function names, hook names, filter names, or class names mentioned in the notes.
2. Flag findings by severity:
   - **High**: Breaking changes — code will fail or behave incorrectly without a fix.
   - **Medium**: Deprecations — code still works but will break in a future version.
   - **Low**: New APIs or improvements the project could optionally adopt.
3. Discard release notes whose scope doesn't touch this project type (e.g., a database schema change is not relevant to a simple shortcode plugin).

Read `references/analysis-strategy.md` for search patterns and decision rules for common categories.

### 3) Produce the primary output

Choose the output format based on the mode:

- **Audit / research mode** (no code changes requested): produce an upgrade checklist with items grouped by severity. Each item should include: what the issue is, where in the codebase it appears, the recommended fix, and the source URL.
- **Implementation mode** (code changes requested): provide concrete patch recommendations with before/after code snippets, then apply them. Verify after each logical change.

Format the checklist as a markdown task list. Example:

```markdown
## Breaking Changes (must fix)
- [ ] Replace `deprecated_function()` calls (found in `includes/helpers.php:42`) — see https://make.wordpress.org/...

## Deprecations (fix before next major)
- [ ] ...

## Optional improvements
- [ ] ...
```

### 4) Version-bump environment files (if present)

If the repo has local environment config, update the target WP version:

- `.wp-env.json` / `wp-env.json` → update `"core"` version
- `docker-compose.yml` → update WP image tag if pinned
- `composer.json` → update `"roots/wordpress"` or `"johnpbloch/wordpress"` constraint if WP is a Composer dependency

### 5) Implement changes (implementation mode only)

Apply fixes in dependency order — fix breaking changes before deprecations. After each logical group of changes:

1. Run any existing tests: PHPUnit, PHPCS, Jest/Playwright if present.
2. Verify the site/plugin/theme still activates and functions correctly.

If the repo has `@wordpress/scripts` or `@wordpress/env`, use those for build and test steps.

## Verification

- All high-severity findings are addressed or explicitly acknowledged as out-of-scope.
- Every finding links to a source URL from make.wordpress.org.
- If environment files were updated, the updated version matches the target WP version.
- Existing tests pass (or failures are documented with a path to resolution).

## Failure modes / debugging

- **Can't find a field guide for the target version**: Search `https://make.wordpress.org/core/?s=field+guide+<version>` and look for the "X.Y Field Guide" post. Field guides are usually published 1–2 weeks before release.
- **Dev note content is behind a login or 404**: Some draft notes may not yet be public. Proceed with what is available and note the gap.
- **Too many release notes to process**: Read breaking changes and deprecations first (highest impact). Defer new-API notes to a follow-up pass.
- **Uncertain whether a change applies**: Search the codebase for the exact function/hook name. If not found, mark as "not applicable" with a note.
- **Composer-managed WordPress version not updating**: Check that the version constraint is not pinned too tightly (e.g., `"=6.8.0"`) and run `composer update`.

## Escalation

- If a breaking change has no clear migration path in the dev notes, check the WordPress Core Trac ticket or GitHub Gutenberg issue linked in the note before guessing.
- For complex PHP deprecations (removed functions with no drop-in replacement), consult the WordPress Developer Resources or open a support thread on make.wordpress.org.
- If the project uses a third-party plugin or theme as a dependency, escalate compatibility checks for that dependency to its own issue tracker.
