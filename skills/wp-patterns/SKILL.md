---
name: wp-patterns
description: "Pattern: create or update WordPress block patterns, or improve pattern design quality. Route custom blocks to wp-block-development; route frontend interactivity to wp-interactivity-api."
compatibility: "WordPress 6.9 with PHP 7.2.24 or later. Requires 6.0+ for auto-registration, 6.7+ for full preset support."
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

1. **Block markup only** — express all visual design through block comment attributes and `preset` slugs. Read `references/design-with-tokens.md` for the core principle.

2. **No JavaScript** — patterns are static `block markup`. For interactivity, use blocks that natively support it (Navigation, Search, Query Loop).

3. **Registration-time PHP** — pattern files execute PHP once during registration, not at render. Read `references/pattern-registration.md` for safe output functions, i18n, and functions to avoid.

4. **Valid nesting** — read `references/block-markup-reference.md` for comment syntax and nesting rules.

5. **Native blocks for behavior** — use Query Loop, Search, Navigation, Social Icons, or an existing form block instead of custom PHP/HTML behavior. For newsletter, donation, payment, or map behavior, create a CTA/placeholder or use an existing block/plugin.

6. **Local assets** — read `references/pattern-registration.md` and `references/anti-patterns.md` for asset and placeholder rules.

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

For pattern-type metadata (starter pages, template patterns, query loops, forms/CTAs), read `references/pattern-categories-and-types.md`.

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

### 6) Verification

Read `references/verification.md` and verify the pattern in the target environment.

**Done when:** pattern inserts and renders without validation errors in the verification environment.

## Escalation

- Theme-specific `preset` slugs, text domains, asset paths, or pattern categories cannot be verified.
- Color contrast, image meaning, or content hierarchy needs human design/accessibility judgment.
- Behavior depends on a WordPress/Gutenberg version not covered by this repo's compatibility contract.

For `block markup`, registration, or escaping failures, read `references/block-markup-reference.md`, `references/pattern-registration.md`, and `references/anti-patterns.md`.

## Example prompts

Read `references/example-prompts.md`.
