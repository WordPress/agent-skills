---
name: wp-phpstan
description: "Use when configuring, running, or fixing PHPStan static analysis in WordPress projects (plugins/themes/sites): phpstan.neon setup, baselines, WordPress-specific typing, and handling third-party plugin classes."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Requires Composer-based PHPStan."
---

# WP PHPStan

## When to use

Use this skill when working on PHPStan in a WordPress codebase, for example:

- setting up or updating `phpstan.neon` / `phpstan.neon.dist`
- generating or updating `phpstan-baseline.neon`
- fixing PHPStan errors via WordPress-friendly PHPDoc (REST requests, hooks, query results)
- handling third-party plugin/theme classes safely (stubs/autoload/targeted ignores)

## Inputs required

- `wp-project-triage` output (run first if you haven't)
- Whether adding/updating Composer dev dependencies is allowed (stubs).
- Whether changing the baseline is allowed for this task.

## Procedure

### 0) Discover PHPStan entrypoints (deterministic)
1. Inspect PHPStan setup (config, baseline, scripts):
   - `node skills/wp-phpstan/scripts/phpstan_inspect.mjs`

Prefer the repo’s existing `composer` script (e.g. `composer run phpstan`) when present.

### 1) Ensure WordPress core stubs are loaded

`szepeviktor/phpstan-wordpress` or `php-stubs/wordpress-stubs` are effectively required for most WordPress plugin/theme repos. Without it, expect a high volume of errors about unknown WordPress core functions.

- Confirm the package is installed (see `composer.dependencies` in the inspect report).
- Ensure the PHPStan config references the stubs (see `references/third-party-classes.md`).

### 2) Ensure a sane `phpstan.neon` for WordPress projects

- Keep `paths` focused on first-party code (plugin/theme directories).
- Exclude generated and vendored code (`vendor/`, `node_modules/`, build artifacts, tests unless explicitly analyzed).
- Keep `ignoreErrors` entries narrow and documented.

See:
- `references/configuration.md`

### 3) Fix errors with WordPress-specific typing (preferred)

Prefer correcting types over ignoring errors. Common WP patterns that need help:

- REST endpoints: type request parameters using `WP_REST_Request<...>`
- Hook callbacks: add accurate `@param` types for callback args
- Database results and iterables: use array shapes or object shapes for query results
- Action Scheduler: type `$args` array shapes for job callbacks

See:
- `references/wordpress-annotations.md`

### 4) Handle third-party plugin/theme classes (only when needed)

When integrating with plugins/themes not present in the analysis environment:

- First, confirm the dependency is real (installed/required).
- Prefer plugin-specific stubs already used in the repo (common examples: `php-stubs/woocommerce-stubs`, `php-stubs/acf-pro-stubs`).
- If PHPStan still cannot resolve classes, add targeted `ignoreErrors` patterns for the specific vendor prefix.

See:
- `references/third-party-classes.md`

### 5) Baseline management (use as a migration tool, not a trash bin)

- Generate a baseline once for legacy code, then reduce it over time.
- Do not “baseline” newly introduced errors.

See:
- `references/configuration.md`

## Verification

- Run PHPStan using the discovered command (`composer run ...` or `vendor/bin/phpstan analyse`).
- Confirm the baseline file (if used) is included and didn’t grow unexpectedly.
- Re-run after changing `ignoreErrors` to ensure patterns are not masking unrelated issues.

## Failure modes / debugging

- “Class not found”:
  - confirm autoloading/stubs, or add a narrow ignore pattern
- Huge error counts after enabling PHPStan:
  - reduce `paths`, add `excludePaths`, start at a lower level, then ratchet up
- Inconsistent types around hooks / REST params:
  - add explicit PHPDoc (see references) rather than runtime guards

## Escalation

- If a type depends on a third-party plugin API you can’t confirm, ask for the dependency version or source before inventing types.
- If fixing requires adding new Composer dependencies (stubs/extensions), confirm it with the user first.
