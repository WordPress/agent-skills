# Plugin Check: categories, interpreting results, and CI

Deep-dive companion to `SKILL.md`. Confirm exact category names and flags with
`wp plugin check --help`, since they evolve between releases.

## Categories

Plugin Check groups checks so you can run and triage a subset:

- **Security** — missing nonces/capability checks, unsanitized input, unescaped output, unsafe SQL, direct file access, unsafe `eval`/dynamic includes.
- **Performance** — assets enqueued on every page, heavy per-request work, autoloaded option bloat, excessive or duplicate queries.
- **Accessibility** — admin/markup patterns that hurt keyboard and screen-reader users.
- **Internationalization (i18n)** — incorrect/missing translation function usage, text domain mismatched with the plugin slug, variables where literals are required.
- **Plugin repository / general** — readme and header requirements, forbidden practices (e.g. a `trunk` stable tag, shipping hidden/dev files), and other WordPress.org submission rules.

Notes:

- "Required" categories must pass for WordPress.org approval; others are advisory.
- Some categories include both static and runtime checks; runtime checks need the `--require` setup (see `SKILL.md` Step 2).

## Interpreting results

Each finding has a severity (error vs warning), a check code, and a file/line.

- **Errors**: blocking. Must-fix before submission/release; many map directly to review-blocking issues.
- **Warnings**: advisory. Triage by category and risk; fix security/performance first.

Do not make findings disappear by excluding files or downgrading severity — fix the
underlying code so the result is genuinely clean.

Route each finding to the skill that fixes it:

| Finding area | Where to fix it |
| --- | --- |
| Missing nonce/capability, unsanitized input, unescaped output, unsafe SQL | `wp-plugin-development` (`references/security.md`) |
| i18n function misuse, text-domain mismatch | `wp-plugin-development` + `references/dependencies-and-headers.md` |
| Assets on every page, heavy per-request work, autoload bloat, query cost | `wp-performance` |
| Type/static-analysis issues uncovered while fixing | `wp-phpstan` |
| readme / header / naming / GPL submission rules | `wp-plugin-directory-guidelines` |

High-signal examples:

- `WordPress.Security.EscapeOutput` -> escape late with `esc_html()`, `esc_attr()`, `wp_kses_post()`.
- `WordPress.Security.NonceVerification` -> add `check_admin_referer()` / `wp_verify_nonce()` plus a capability check.
- `WordPress.WP.I18n` -> fix translation function usage; ensure the text domain matches the plugin slug.

## CI

Run Plugin Check non-interactively so regressions fail the build:

- Run in a real WordPress + WP-CLI environment with the `plugin-check` plugin installed/active.
- Emit machine-readable output (confirm the `--format` flag with `wp plugin check --help`) and fail the job on a non-zero exit / when errors are present.
- Gate on errors; surface warnings without necessarily failing (team decision).
- Prefer the repo's existing CI tooling (`wp-env`, the WordPress Plugin Check GitHub Action) over a bespoke setup.

```bash
wp plugin install plugin-check --activate
wp plugin check my-plugin-slug --format=json > pcp.json
# Fail the job if there are errors (parse with the repo's preferred tool)
```

Upstream references:

- https://wordpress.org/plugins/plugin-check/
- https://github.com/WordPress/plugin-check
