---
name: wp-patterns
description: "Generate technically correct, design-distinctive WordPress block patterns. Use when creating block patterns, starter page patterns, template patterns, template part patterns, or improving pattern design quality. Covers pattern registration (PHP headers, auto/manual), block markup syntax, theme.json design tokens, categories, template types, accessibility, and i18n/escaping."
compatibility: "WordPress 6.9 with PHP 7.2.24 or later. Requires 6.0+ for auto-registration, 6.7+ for full preset support. Patterns use block markup (HTML comments with JSON), PHP file headers, and theme.json presets."
---

# WordPress Block Patterns

## When to use

Use this skill when creating, updating, or reviewing WordPress block patterns such as:

- filesystem patterns in `patterns/*.php`
- starter page patterns for page/post content
- template patterns using `Template Types`
- template part patterns for headers, footers, sidebars, or other parts
- pattern category, keyword, inserter, block type, and template type metadata
- pattern markup validation, escaping, i18n, accessibility, or design quality improvements

Generate production-grade patterns that are technically correct, design-distinctive, theme-compatible, and accessible. If the user is building a custom block, changing `block.json`, or adding dynamic rendering, use `wp-block-development` instead. If the user needs frontend interactivity, use `wp-interactivity-api`.

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

Before writing any pattern, internalize these constraints:

1. **Block markup only** — all visual design is expressed through block comment attributes and theme.json presets. No inline `<style>` tags, no custom CSS classes, no arbitrary HTML outside of block wrappers.

2. **No JavaScript** — patterns are static block markup. For interactivity, use blocks that natively support it (Navigation, Search, Query Loop). Never inject `<script>` tags.

3. **PHP runs at `init`, not render** — pattern files execute PHP once during registration. Never use query-dependent functions (`get_posts()`, `the_title()`, `wp_get_current_user()`). Safe: `esc_html_e()`, `get_theme_file_uri()`. Read `references/pattern-registration.md` for registration-time PHP constraints.

4. **Always escape** — every PHP output must use `esc_html__()`, `esc_attr__()`, or `esc_url()`. No raw `echo` of user-facing strings. Read `references/pattern-registration.md` for safe PHP output functions.

5. **Always i18n** — every user-visible string must be wrapped in a translation function with the theme/plugin text domain. Use `esc_html_e()` (echo + escape + translate) or `esc_html__()` (return + escape + translate). Read `references/pattern-registration.md` for text domain and i18n examples.

6. **Prefer presets over hardcoded values** — use `"backgroundColor":"primary"` not `"style":{"color":{"background":"#0073aa"}}`. Presets adapt to theme changes and style variations.

7. **Valid nesting** — every opening `<!-- wp:block -->` must have a matching `<!-- /wp:block -->`. Nesting must be properly ordered. Self-closing blocks use `<!-- wp:block /-->`.

8. **Use native blocks for behavior** — use Query Loop, Search, Navigation, Social Icons, or an existing form block instead of custom PHP/HTML behavior. For newsletter, donation, payment, or map behavior, create a CTA/placeholder or use an existing block/plugin; do not invent forms, iframes, scripts, or third-party processing.

9. **Prefer local assets** — use theme/plugin assets with `get_theme_file_uri()` and `esc_url()`. Avoid external placeholder image URLs unless the user explicitly approves them.

Reference: `references/block-markup-reference.md` for syntax, `references/anti-patterns.md` for what to avoid.

## Procedure

### 0) Triage and locate the pattern target

1. Run triage when working in a repository:
   - `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. For block themes, locate the target theme root:
   - `node skills/wp-block-themes/scripts/detect_block_themes.mjs`
3. Confirm the pattern belongs in a theme `patterns/` directory or needs manual plugin registration.
4. If multiple themes/plugins exist, scope all changes to the requested target.

If the user did not provide required inputs, infer only low-risk defaults. Ask before inventing a theme slug, text domain, asset path, custom post type, taxonomy, event date field, or theme-specific preset. If `theme.json` is missing or presets cannot be verified, use conservative core presets or ask before using theme-specific slugs.

### 1) Design thinking

Before writing markup, make **5 deliberate design decisions**. This is what separates distinctive patterns from generic AI output.

Reference: `references/design-with-tokens.md` for translating decisions to block attributes.

#### Decision 1: Purpose
What does this pattern achieve for the end user? A hero converts visitors. A testimonial grid builds trust. A pricing table drives comparison. Let purpose drive every subsequent choice.

#### Decision 2: Tone
Choose a clear direction and map it to block attributes:

| Tone | Color Strategy | Typography | Layout |
|------|---------------|------------|--------|
| **Bold/energetic** | High contrast, accent backgrounds, gradients | XX-large headings, tight letter-spacing, uppercase accents | Full-width, asymmetric columns, large padding |
| **Minimal/refined** | Base + contrast only, subtle tertiary sections | Restrained sizes, generous line-height | Constrained width, generous whitespace, centered |
| **Editorial/magazine** | Dark sections alternating with light | Mixed font families, varied heading scales | Asymmetric splits (66/33), media-text blocks |
| **Playful/creative** | Multiple accent colors, bright backgrounds | Large display sizes, varied weights | Grid layouts, unexpected column ratios, rounded corners |
| **Corporate/professional** | Neutral palette, primary for CTAs only | Consistent scale, body font dominant | Equal columns, structured grid, minimal decoration |

#### Decision 3: Spatial Composition
Choose your primary layout strategy:
- **Constrained centered** — classic content width with wide breakouts
- **Full-width sections** — alternating background bands
- **Asymmetric split** — 60/40 or 70/30 columns with content + media
- **Grid** — block-native grid or columns layouts for cards, team members, portfolio items
- **Stacked vertical** — flex column with varied spacing for editorial feel

Vary spacing intentionally:
- Tight `blockGap` (spacing|20-30) for related elements within a card
- Standard `blockGap` (spacing|40) for flowing content
- Generous padding (spacing|60-80) on section wrappers for breathing room

#### Decision 4: Typography Hierarchy
Plan your type scale before writing markup:
- **Hero heading**: `fontSize:"xx-large"` + `fontFamily:"heading"` + tight `lineHeight`
- **Section heading**: `fontSize:"x-large"` + `fontFamily:"heading"`
- **Subtitle/lead**: `fontSize:"large"` + `textColor:"secondary"` or `fontFamily:"body"`
- **Body**: `fontSize:"medium"` or default
- **Caption/meta**: `fontSize:"small"` + `textColor:"secondary"`

Add at least one typographic accent:
- Uppercase + letter-spacing for labels
- Tight letter-spacing on display headings
- Italic for pull quotes
- Monospace for technical/code content

#### Decision 5: Color Strategy
Plan section-by-section color flow:
- **Light section**: `base` background, `contrast` text (default)
- **Dark section**: `contrast` background, `base` text (inverted)
- **Accent section**: `primary` or `tertiary` background
- **Gradient section**: cover block with gradient overlay

A pattern with multiple sections should vary backgrounds — don't use the same background for every section.

### Pattern-specific decisions

- **Starter pages**: include `Block Types: core/post-content` unless the pattern is specifically for a template or template part.
- **Template patterns**: set `Template Types` and use `Inserter: no` when the pattern should only be offered in template replacement flows.
- **Query Loop patterns**: use `core/query` with `core/post-template`, post title/excerpt/date/featured image blocks, pagination, and `core/query-no-results` where relevant. For archive, search, category, and author templates, prefer inherited query context instead of custom PHP. For CPT/event queries, confirm the post type slug, taxonomy/date assumptions, and available blocks before generating markup.
- **Comparison, pricing, timeline, and schedule patterns**: use clear headings, list/table or labeled-card structure, and non-color-only emphasis for featured states.
- **Social, navigation, and search patterns**: use native blocks and verify accessible labels, link text, and search context. In 404 patterns, pair the Search block with recovery copy that explains what the user can try next.
- **Forms, donations, payments, maps, and newsletter signups**: use an existing block/plugin/service or a static CTA/placeholder. Do not create raw form handling or third-party behavior inside a pattern.

### High-impact visual patterns

Use these composition moves when the request calls for a visually distinctive pattern:

- **Oversized display type**: use a short word or title at display scale with tight line-height, uppercase or italic treatment, and enough surrounding space. Keep letter spacing at `0` unless the design specifically needs a tracked wordmark.
- **Offset color fields**: split a cover background with a hard-stop gradient or two-tone color field, then let the type or image cross the boundary.
- **Editorial cover image**: use a full-bleed Cover block with image, dim/duotone treatment, and left-anchored copy; place the CTA in a clearly separated lower area.
- **Image plus quiet content**: use Media & Text for case-study or portfolio patterns where the image carries visual weight and the content side stays intentionally sparse.
- **Header plus hero**: combine a flex header with Site Logo, Site Title, and Navigation above a full-width Cover when the pattern is a page opener or starter page.
- **Post index as graphic layout**: for Query Loop patterns, make dates and titles part of the visual hierarchy with large title links, strong separators, and pagination.
- **Repeated display text**: repeat a single word or short phrase in varied tones when the design is poster-like, but keep it readable and avoid repeating long content.
- **Centered image on two-tone field**: place a single image inside a constrained group over a split-color background for a gallery, collection, or album-style pattern.

These moves should still pass the technical checklist: valid block markup, translatable/escaped strings, local or approved assets, accessible labels, no scripts, no inline `<style>` tags, and no custom CSS classes.

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

This step catches nesting errors and ensures intentional hierarchy before you write a single comment tag.

### 3) Write the pattern file

Assemble the PHP header and block markup.

**File header** (for theme auto-registration):
```php
<?php
/**
 * Title: [Descriptive Name]
 * Slug: theme-slug/pattern-name
 * Categories: [comma-separated slugs]
 * Keywords: [search terms]
 * Viewport Width: 1400
 * Block Types: [if starter/template part pattern]
 * Template Types: [if template pattern]
 */
?>
```

Reference: `references/pattern-registration.md` for all header fields and PHP rules.
Reference: `references/pattern-categories-and-types.md` for category selection and template types.

For plugin or conditional patterns, register manually on `init` with `register_block_pattern()`. Use translated `title`, `description`, and `keywords`; keep `content` static block markup; and avoid runtime queries. Register custom categories before using them with `register_block_pattern_category()` or define theme-owned categories in `theme.json`. For WordPress versions before filesystem auto-registration support, use manual registration instead of `patterns/*.php` auto-discovery.

**Block markup body:**
- Follow the nesting tree from step 3
- Use preset slugs for colors, font sizes, spacing
- Include `esc_html_e()` for all visible text
- Include `esc_url( get_theme_file_uri() )` for theme images
- Use placeholder text that reflects real content (not "Lorem ipsum" — use realistic example text appropriate to the pattern's purpose)

### 4) Design quality check

Review against anti-patterns (`references/anti-patterns.md`):

- [ ] **Not generic**: pattern makes at least 3 distinctive design choices
- [ ] **Layout variety**: not defaulting to 3 equal columns or uniform symmetric layouts
- [ ] **Color rhythm**: sections alternate or vary backgrounds — not all the same
- [ ] **Typography contrast**: headings clearly distinct from body (size, family, or weight)
- [ ] **Spatial intention**: padding and gaps vary by context, not uniform everywhere
- [ ] **Meaningful content**: placeholder text reflects real use, buttons describe actions
- [ ] **Specific structure**: comparisons, timelines, schedules, pricing, menus, and documentation cards have labels that make sense without relying on visual position alone
- [ ] **Restrained but distinctive**: corporate/professional patterns still include a clear hierarchy, accent, or layout choice; playful patterns do not become a one-note palette or repeated gradient treatment

### 5) Technical validation

- [ ] Every `<!-- wp:block -->` has matching `<!-- /wp:block -->`
- [ ] JSON in block comments is valid (no trailing commas, strings double-quoted)
- [ ] All user-visible strings use `esc_html_e()` or `esc_html__()`
- [ ] All URLs use `esc_url()`
- [ ] All attribute values with translatable text use `esc_attr_e()` or `esc_attr__()`
- [ ] Informational images have descriptive translated alt text; decorative images use empty alt text intentionally
- [ ] Heading levels are sequential (h2 → h3 → h4, never skip)
- [ ] Preset slugs are valid defaults or documented as theme-specific
- [ ] `Slug` in header uses correct namespace: `theme-slug/pattern-name`
- [ ] No inline `<style>`, no `<script>`, no custom CSS classes
- [ ] No query-dependent PHP functions
- [ ] Button/link labels are action-specific; avoid vague labels such as "Click Here" or "Read More"
- [ ] Updating an existing pattern preserves the `Slug` unless intentionally creating a new pattern

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
- **Styles do not match the theme**: confirm preset slugs exist in `theme.json`; avoid unsupported theme-specific slugs unless documented.
- **Accessibility issues**: fix skipped heading levels, empty alt text for informational images, low-contrast preset combinations, vague button/link text, social icon labels, search labels, and color-only emphasis.
- **Manual registration fails**: confirm the code runs on `init`, categories are registered before patterns, and pattern content remains static block markup.

## Escalation

Stop and ask for help or consult canonical docs when:

- Theme-specific preset slugs, text domains, asset paths, or pattern categories cannot be verified.
- Color contrast, image meaning, or content hierarchy needs human design/accessibility judgment.
- Behavior depends on a WordPress/Gutenberg version that is not covered by this repo's compatibility contract.
- The request requires a custom block, dynamic rendering, or saved-block migration; route to `wp-block-development`.
- The request requires frontend interactivity beyond native blocks; route to `wp-interactivity-api`.

Use WordPress Developer Resources, the Theme Handbook, and the Block Editor Handbook for upstream behavior before inventing version-sensitive guidance.

## Example Prompts

### Hero Section
> "Create a bold hero pattern with a large heading, subtitle, and two CTA buttons. Dark background, full-width, for a creative agency theme."

Expected: Cover or Group block with contrast bg, constrained inner, heading with xx-large + heading font, paragraph with secondary color, Buttons with primary + outline styles.

### Testimonial Grid
> "Create a 3-column testimonial grid with avatar, quote, name, and role. Alternating card backgrounds."

Expected: Group wrapper, block-native grid or Columns layout (3 columns, responsive), inner Group cards with varied tertiary/base backgrounds, Image block for avatar (rounded border-radius), Paragraph for quote (italic), Heading h3 for name, Paragraph small for role.

### Blog Post Listing
> "Create a starter page pattern for a blog index with featured post hero and 3-column grid of recent posts below."

Expected: `Block Types: core/post-content` header, Query Loop for featured post (perPage 1, large layout), second Query Loop for grid (perPage 3, grid layout with post-template), clear visual separation between sections.

### Footer with Columns
> "Create a 4-column footer pattern with logo, navigation links, contact info, and social icons. Dark background."

Expected: `Block Types: core/template-part/footer` header, Group full-width with contrast bg, Columns (4), Site Logo block, Navigation or list blocks, Paragraph blocks for contact, Social Icons block. `Inserter: no`.
