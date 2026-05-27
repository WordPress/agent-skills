---
name: wp-abilities-api
description: "Use when working with the WordPress Abilities API (wp_register_ability, wp_register_ability_category, /wp-json/wp-abilities/v1/*, @wordpress/abilities) including defining abilities, categories, meta, REST exposure, and permissions checks for clients."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WP Abilities API

## When to use

Use this skill when the task involves:

- registering abilities or ability categories in PHP,
- exposing abilities to clients via REST (`wp-abilities/v1`),
- consuming abilities in JS (notably `@wordpress/abilities`),
- diagnosing “ability doesn’t show up” / “client can’t see ability” / “REST returns empty”.

## Inputs required

- Repo root (run `wp-project-triage` first if you haven’t).
- Target WordPress version(s) and whether this is WP core or a plugin/theme.
- Where the change should live (plugin vs theme vs mu-plugin).

## Procedure

Before deciding what to register, read `references/domain-vs-projection.md` — abilities live at the domain capability layer; MCP / Command Palette / REST exposure is a projection. Registration shape and exposure shape are different decisions, and conflating them forces re-registration every time a consumer's constraints change.

### 1) Confirm availability and version constraints

- If this is WP core work, check `signals.isWpCoreCheckout` and `versions.wordpress.core`.
- If the project targets WP < 6.9, you may need the Abilities API plugin/package rather than relying on core.

### 2) Find existing Abilities usage

Search for these in the repo:

- `wp_register_ability(`
- `wp_register_ability_category(`
- `wp_abilities_api_init`
- `wp_abilities_api_categories_init`
- `wp-abilities/v1`
- `@wordpress/abilities`

If none exist, decide whether you’re introducing Abilities API fresh (new registrations + client consumption) or only consuming.

### 3) Register categories (optional)

If you need a logical grouping, register an ability category early (see `references/php-registration.md`).

### 4) Register abilities (PHP)

For grouping decisions (how many abilities to register, and where to put filters vs. new ability names), read `references/grouping-heuristic.md` first — it keeps you from shipping one atomic ability per REST operation.

To avoid drift between the ability and the existing UI / REST code path, see `references/shared-core-service.md` — abilities, REST handlers, CLI commands, and UI controllers should be thin adapters over a shared service. The reference also covers the metric trap (REST handlers that emit usage telemetry) and the `AGENTS.md` rule for keeping registrations in sync when underlying code paths change.

For shared helper patterns when multiple execute callbacks delegate to existing REST controllers, see `references/plugin-family-patterns.md` (identify the shared-API-client vs zero-arg-controllers shape) and `references/delegate-helper-pattern.md` (one helper shape that works, and when not to use it).

For standardized `WP_Error` codes that let agents reason about retry vs. escalation, see `references/error-code-vocabulary.md`.

Implement the ability in PHP registration with:

- stable `id` (namespaced),
- `label`/`description`,
- `category`,
- `meta`:
  - add `readonly: true` when the ability is informational,
  - set `show_in_rest: true` for abilities you want visible to clients.

Use the documented init hooks for Abilities API registration so they load at the right time (see `references/php-registration.md`).

### 5) Confirm REST exposure

- Verify the REST endpoints exist and return expected results (see `references/rest-api.md`).
- If the client still can’t see the ability, confirm `meta.show_in_rest` is enabled and you’re querying the right endpoint.

### 6) Consume from JS (if needed)

- Prefer `@wordpress/abilities` APIs for client-side access and checks.
- Ensure build tooling includes the dependency and the project’s build pipeline bundles it.

## Verification

- `wp-project-triage` indicates `signals.usesAbilitiesApi: true` after your change (if applicable).
- REST check (in a WP environment): endpoints under `wp-abilities/v1` return your ability and category when expected.
- If the repo has tests, add/update coverage near:
  - PHP: ability registration and meta exposure
  - JS: ability consumption and UI gating

## Failure modes / debugging

- Ability never appears:
  - registration code not running (wrong hook / file not loaded),
  - missing `meta.show_in_rest`,
  - incorrect category/ID mismatch.
- REST shows ability but JS doesn’t:
  - wrong REST base/namespace,
  - JS dependency not bundled,
  - caching (object/page caches) masking changes.
- Execute callback returns unexpected errors or silently ignores input:
  - `input_schema` defaults aren't being applied, pagination key drift between the ability and the backing, or `empty()`-based ID validation — see `references/input-schema-gotchas.md`.

## Escalation

- If you’re uncertain about version support, confirm target WP core versions and whether Abilities API is expected from core or as a plugin.
- For canonical details, consult:
  - `references/rest-api.md`
  - `references/php-registration.md`
