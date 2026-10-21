---
name: wp-patterns
description: "Pattern: create or update WordPress block patterns (starter pages, templates, template parts, Query Loop layouts), review pattern registration, block markup, categories, accessibility, or i18n/escaping, or improve pattern design quality. Route custom blocks to wp-block-development; route frontend interactivity to wp-interactivity-api."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WordPress Block Patterns

## Inputs required

- Repo root and target theme/plugin directory.
- Pattern type: section, starter page, template, template part, or manually registered plugin pattern.
- Theme/plugin slug, pattern slug, and text domain.
- Pattern title, categories, keywords, block types, template types, and inserter visibility.
- Target WordPress version if it differs from this repo's compatibility contract.
- Available `theme.json` presets for colors, typography, spacing, layout, and gradients.
- Asset paths for images/icons, including whether assets are decorative or informational.
- Verification environment: WordPress Playground, wp-env, local WordPress, or manual Code Editor check.
- If updating an existing pattern: current slug, current file path, and whether existing inserted content must remain compatible.
- For child themes: child theme slug, text domain, and asset root; do not reuse the parent namespace unless explicitly intended.

## Guardrails

1. **Block markup only** — express all visual design through block comment attributes and `preset` slugs. No inline `<style>` tags, no custom CSS classes, no arbitrary HTML outside of block wrappers. Read `references/design-with-tokens.md` for the core principle.

2. **No JavaScript** — patterns are static `block markup`. For interactivity, use blocks that natively support it (Navigation, Search, Query Loop).

3. **Registration-time PHP** — pattern files execute PHP once during registration, not at render. Read `references/pattern-registration.md` for safe output functions, i18n, and functions to avoid.

4. **Valid nesting** — read `references/block-markup-reference.md` for comment syntax and nesting rules.

5. **Native blocks for behavior** — use Query Loop, Search, Navigation, Social Icons, or an existing form block instead of custom PHP/HTML behavior. For newsletter, donation, payment, or map behavior, create a CTA/placeholder or use an existing block/plugin.

6. **Local assets** — use `get_theme_file_uri()` with `esc_url()`; no external placeholder URLs unless the user approves. Read `references/pattern-registration.md` and `references/anti-patterns.md` for examples.

## Procedure

### 0) Triage and locate the pattern target

1. Run triage when working in a repository:
   - `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. For block themes, locate the target theme root:
   - `node skills/wp-block-themes/scripts/detect_block_themes.mjs`
3. Confirm the pattern belongs in a theme `patterns/` directory or needs manual plugin registration.
4. If multiple themes/plugins exist, scope all changes to the requested target.

If the user did not provide required inputs, infer only low-risk defaults. Ask before inventing a theme slug, text domain, asset path, custom post type, taxonomy, event date field, or theme-specific `preset`. If `theme.json` is missing or presets cannot be verified, use conservative core presets or ask before using theme-specific slugs.

**Done when:** target theme/plugin root, pattern type, and registration path are confirmed.

### 1) Design thinking

Make five deliberate design decisions — purpose, tone, spatial composition, typography hierarchy, and color strategy — before writing `block markup`.

Read `references/design-with-tokens.md` for the decision framework and `preset` mapping.

For pattern-type metadata (starter pages, template patterns, template parts, query loops, forms/CTAs, comparison/pricing, social/navigation/search, 404), read `references/pattern-categories-and-types.md` — including the Query Loop patterns section when using `core/query`.

When the request calls for a visually _distinctive_ composition, read `references/visual-composition.md`.

**Done when:** all five design decisions are made and recorded before markup.

### 2) Plan block structure

Sketch the nesting tree before writing markup. Example for a hero pattern:

```
Group (full-width, constrained layout, dark bg, vertical padding 80)
  Group (constrained inner, flex vertical, center align)
    Paragraph (uppercase label, small, letter-spacing, accent color)
    Heading (h2, xx-large, heading font, tight line-height)
    Paragraph (lead text, large, secondary color)
    Buttons (flex, center)
      Button (primary bg, base text)
      Button (outline style)
```

**Done when:** nesting tree is sketched and hierarchy is intentional before writing comment tags.

### 3) Write the pattern file

Assemble the PHP header and `block markup`. Read `references/pattern-registration.md` for header fields, PHP rules, manual registration, and file examples.

Use categories and template types from step 1. Read `references/pattern-categories-and-types.md` when header metadata was not decided in step 1.

**Block markup body:**
- Follow the nesting tree from step 2
- Use `preset` slugs for colors, font sizes, spacing
- Use placeholder text that reflects real content — not "Lorem ipsum"

**Done when:** PHP header and block markup file are written.

### 4) Design quality check

Review against the Design Quality Checklist in `references/anti-patterns.md`. Every item must pass.

**Done when:** every Design Quality Checklist item passes.

### 5) Technical validation

Review against the Technical Validation Checklist in `references/anti-patterns.md`. Every item must pass.

**Done when:** every Technical Validation Checklist item passes.

## Verification

Test the pattern in a real WordPress environment:

**Using WordPress Playground (recommended):**
```bash
npx @wp-playground/cli@latest server --auto-mount
```
Mount the theme directory and verify:
- Pattern appears in inserter under specified categories
- Pattern inserts without block validation errors
- Layout renders correctly at desktop and mobile widths
- Content is editable (text, images, buttons)
- If `templateLock` is used, locked elements resist editing

For template patterns, verify the Site Editor offers the pattern in the expected template replacement flow. If `Inserter: no` is used, confirm it is hidden from the general inserter but still available where intended.

**Manual check:**
- Paste block markup into the Code Editor view in WordPress
- Switch to Visual Editor — blocks should parse without "Attempt Block Recovery" prompts
- If recovery is needed, the markup has syntax errors

Run the repo's existing lint, build, or test commands if the pattern change touches assets, generated files, or registration code.

When updating an existing pattern, remember that inserted pattern content is copied into posts/templates. Changing the pattern file does not retroactively update already inserted content, and changing block names or saved markup can create recovery prompts for newly inserted content.

For PR or package review, confirm the diff is scoped to the intended pattern files, references, scripts, and eval scenarios. Do not mix unrelated repo updates into a pattern change.

## Failure modes / debugging

Start with `references/block-markup-reference.md`, `references/pattern-registration.md`, and `references/anti-patterns.md`.

Common failures:

- **Pattern missing from inserter**: check required `Title`, `Slug`, and `Categories` headers; confirm the file is under `patterns/*.php`; confirm `Inserter: no` is not hiding it.
- **Wrong pattern shown or overwritten**: check for slug collisions and ensure the slug is namespaced as `theme-slug/pattern-name` or `plugin-slug/pattern-name`.
- **Block recovery prompt appears**: validate block comment nesting, JSON syntax, and closing comments.
- **Strings are not translated or escaped**: replace raw text/PHP output with `esc_html_e()`, `esc_html__()`, `esc_attr_e()`, `esc_attr__()`, or `esc_url()` as appropriate.
- **Translations do not load**: verify the text domain matches the target theme/plugin.
- **Dynamic content is stale or unavailable**: remove query-dependent PHP (`get_posts()`, `the_title()`, `wp_get_current_user()`) and use blocks such as Query Loop instead.
- **Query Loop output is incomplete**: check for `core/post-template`, post title/excerpt/date/image blocks, pagination when needed, and `core/query-no-results` fallback.
- **Archive/search/category/author context is wrong**: use inherited query context instead of hardcoded runtime PHP.
- **CPT or event listings are wrong**: confirm post type slugs, taxonomy/date fields, and plugin-provided blocks before generating the pattern.
- **Styles do not match the theme**: confirm `preset` slugs exist in `theme.json`; avoid unsupported theme-specific slugs unless documented.
- **Accessibility issues**: fix skipped heading levels, empty alt text for informational images, low-contrast preset combinations, vague button/link text, social icon labels, search labels, and color-only emphasis.
- **Manual registration fails**: confirm the code runs on `init`, categories are registered before patterns, and pattern content remains static block markup.

## Escalation

Stop and ask for help or consult canonical docs when:

- Theme-specific `preset` slugs, text domains, asset paths, or pattern categories cannot be verified.
- Color contrast, image meaning, or content hierarchy needs human design/accessibility judgment.
- Behavior depends on a WordPress/Gutenberg version not covered by this repo's compatibility contract.

## Example prompts

Read `references/example-prompts.md`.
