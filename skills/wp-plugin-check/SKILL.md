---
name: wp-plugin-check
description: "Use when running or interpreting Plugin Check (PCP) for a WordPress plugin: pre-submission and pre-release quality gates, the wp plugin check CLI, static vs runtime checks, filtering by category (security, performance, accessibility, internationalization), reading errors vs warnings, and wiring Plugin Check into CI."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Filesystem-based agent with bash + node. Requires the Plugin Check plugin and (preferably) WP-CLI."
---

# WP Plugin Check (PCP)

## When to use

Use this skill when the goal is to verify a plugin against current WordPress.org
standards and development best practices, for example:

- preparing a plugin for submission or a release and you want it to pass review
- you were asked to run "Plugin Check" / "PCP" or to check security, performance, accessibility, or i18n compliance
- a plugin was rejected or flagged and you need to reproduce and fix the findings
- adding an automated quality gate to CI

For building plugin features, use `wp-plugin-development`. For the human-readable
directory rules (GPL, naming/trademark), use `wp-plugin-directory-guidelines`.

## Inputs required

- The target plugin: slug, path, or zip (and the repo root if running locally).
- Environment + safety: dev/staging/prod, and whether you may install the Plugin Check plugin / run WP-CLI.
- Whether runtime checks are wanted (they execute plugin code and need extra setup).

## Procedure

### 0) Confirm the tooling

- Confirm WP-CLI is available (`wp --info`).
- Confirm the `plugin-check` plugin is installed/active; if missing and allowed, install it: `wp plugin install plugin-check --activate`.
- Identify the target plugin's slug (its folder name under `wp-content/plugins/`) or path.

### 1) Run static checks first

Static checks are the default and require no plugin execution:

- `wp plugin check <plugin-slug-or-file>`

You can also point at an arbitrary path or zip/URL:

- `wp plugin check /path/to/plugin`
- `wp plugin check https://example.com/plugin.zip`

### 2) Add runtime checks only if needed

Runtime checks execute plugin code and must load the checker before WordPress:

- `wp plugin check <slug> --require=./wp-content/plugins/plugin-check/cli.php`

### 3) Filter by category to focus the work

Run one category at a time when triaging a large result set. Categories include
security, performance, accessibility, and internationalization, plus general/plugin-
repository checks (readme and header requirements). Category names and the output
format flag can change between releases, so confirm the exact flags with
`wp plugin check --help` in the installed version.

### 4) Interpret results: errors vs warnings

- Treat **errors** as blocking; they typically map to review-blocking guideline issues.
- Triage **warnings** by category and risk (security and performance first).
- Route each finding to the skill that fixes it: security/escaping/nonces and i18n -> `wp-plugin-development`; query/asset performance -> `wp-performance`; type issues surfaced while fixing -> `wp-phpstan`; readme/header/naming/GPL -> `wp-plugin-directory-guidelines`.

### 5) Re-run until the required categories are clean

Re-run the same command after each fix. Do not suppress findings to pass; fix the
underlying code.

### 6) Gate releases / CI (optional)

Run Plugin Check non-interactively in a real WordPress + WP-CLI environment (with the
`plugin-check` plugin active), emit machine-readable output, and fail the job on a
non-zero exit / when errors are present. Confirm the `--format` flag with
`wp plugin check --help`, and prefer the repo's existing CI tooling (e.g. `wp-env`,
the WordPress Plugin Check GitHub Action).

## Verification

- The same `wp plugin check` command was re-run after fixes and reports no errors in the required categories.
- Findings were fixed in code, not ignored or excluded.
- If runtime checks were used, they ran against a representative environment.
- CI (if configured) fails on Plugin Check errors.

## Failure modes / debugging

- "Command not found: wp plugin check":
  - the `plugin-check` plugin is not installed/active, or WP-CLI is not on PATH — re-check Step 0.
- Runtime checks report nothing or error out:
  - the `--require=.../plugin-check/cli.php` path is wrong, or the plugin needs activation/data to exercise the code path.
- Huge result set:
  - run one category at a time (Step 3) and fix errors before warnings.
- "Passes locally, fails review":
  - reviewers may run additional/runtime checks and a newer Plugin Check version; update the plugin and re-run.

## Escalation

- Plugin Check is a non-perfect aid, not a guarantee of approval. For ambiguous guideline questions, consult `wp-plugin-directory-guidelines` and the WordPress.org review guidelines.
- If a finding requires a dependency or API you cannot confirm, ask for the version/source before changing types or behavior.

Upstream references:

- https://wordpress.org/plugins/plugin-check/
- https://github.com/WordPress/plugin-check
