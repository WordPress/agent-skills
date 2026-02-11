---
name: wp-patterns
description: "Generate technically correct, design-distinctive WordPress block patterns. Use when creating block patterns, starter page patterns, template patterns, template part patterns, or improving pattern design quality. Covers pattern registration (PHP headers, auto/manual), block markup syntax, theme.json design tokens, categories, template types, accessibility, and i18n/escaping."
compatibility: "WordPress 6.9 with PHP 7.2.24 or later. Requires 6.0+ for auto-registration, 6.7+ for full preset support. Patterns use block markup (HTML comments with JSON), PHP file headers, and theme.json presets."
---

# WordPress Block Patterns

## Purpose

Generate production-grade WordPress block patterns that are:
1. **Technically correct** — valid block markup, proper PHP escaping and i18n, correct file headers
2. **Design-distinctive** — avoid generic AI aesthetics through intentional layout, color, and typography choices
3. **Theme-compatible** — use preset slugs that adapt across themes and style variations
4. **Accessible** — sequential heading levels, descriptive alt text, sufficient contrast, meaningful button labels

## Guardrails

Before writing any pattern, internalize these constraints:

1. **Block markup only** — all visual design is expressed through block comment attributes and theme.json presets. No inline `<style>` tags, no custom CSS classes, no arbitrary HTML outside of block wrappers.

2. **No JavaScript** — patterns are static block markup. For interactivity, use blocks that natively support it (Navigation, Search, Query Loop). Never inject `<script>` tags.

3. **PHP runs at `init`, not render** — pattern files execute PHP once during registration. Never use query-dependent functions (`get_posts()`, `the_title()`, `wp_get_current_user()`). Safe: `esc_html_e()`, `get_theme_file_uri()`.

4. **Always escape** — every PHP output must use `esc_html__()`, `esc_attr__()`, or `esc_url()`. No raw `echo` of user-facing strings.

5. **Always i18n** — every user-visible string must be wrapped in a translation function with the theme/plugin text domain. Use `esc_html_e()` (echo + escape + translate) or `esc_html__()` (return + escape + translate).

6. **Prefer presets over hardcoded values** — use `"backgroundColor":"primary"` not `"style":{"color":{"background":"#0073aa"}}`. Presets adapt to theme changes and style variations.

7. **Valid nesting** — every opening `<!-- wp:block -->` must have a matching `<!-- /wp:block -->`. Nesting must be properly ordered. Self-closing blocks use `<!-- wp:block /-->`.

Reference: `references/block-markup-reference.md` for syntax, `references/anti-patterns.md` for what to avoid.

## Procedure

### 1) Clarify the Pattern Brief

Gather from the user (or infer from context):
- **Pattern type**: section pattern, starter page pattern, template pattern, or template part pattern?
- **Target theme**: specific theme (use its presets) or generic (use default WP presets)?
- **Content purpose**: what does this pattern communicate? (hero, testimonials, pricing, etc.)
- **Design direction**: any aesthetic preferences? (bold, minimal, editorial, playful, corporate)
- **Technical scope**: does it need PHP (theme assets, i18n) or pure block markup (plugin distribution)?

### 2) Design Thinking

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
- **Grid** — CSS grid for cards, team members, portfolio items
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

### 3) Plan Block Structure

Sketch the nesting tree before writing markup. Example for a hero pattern:

```
Group (full-width, constrained layout, dark bg, vertical padding 80)
  Group (constrained inner, flex vertical, center align)
    Paragraph (uppercase label, small, letter-spacing, accent color)
    Heading (h1, xx-large, heading font, tight line-height)
    Paragraph (lead text, large, secondary color)
    Buttons (flex, center)
      Button (primary bg, base text)
      Button (outline style)
```

This step catches nesting errors and ensures intentional hierarchy before you write a single comment tag.

### 4) Write the Pattern File

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

**Block markup body:**
- Follow the nesting tree from step 3
- Use preset slugs for colors, font sizes, spacing
- Include `esc_html_e()` for all visible text
- Include `esc_url( get_theme_file_uri() )` for theme images
- Use placeholder text that reflects real content (not "Lorem ipsum" — use realistic example text appropriate to the pattern's purpose)

### 5) Design Quality Check

Review against anti-patterns (`references/anti-patterns.md`):

- [ ] **Not generic**: pattern makes at least 3 distinctive design choices
- [ ] **Layout variety**: not defaulting to 3 equal columns or uniform symmetric layouts
- [ ] **Color rhythm**: sections alternate or vary backgrounds — not all the same
- [ ] **Typography contrast**: headings clearly distinct from body (size, family, or weight)
- [ ] **Spatial intention**: padding and gaps vary by context, not uniform everywhere
- [ ] **Meaningful content**: placeholder text reflects real use, buttons describe actions

### 6) Technical Validation

- [ ] Every `<!-- wp:block -->` has matching `<!-- /wp:block -->`
- [ ] JSON in block comments is valid (no trailing commas, strings double-quoted)
- [ ] All user-visible strings use `esc_html_e()` or `esc_html__()`
- [ ] All URLs use `esc_url()`
- [ ] All attribute values with translatable text use `esc_attr_e()` or `esc_attr__()`
- [ ] Image alt text is descriptive (not empty for informational images)
- [ ] Heading levels are sequential (h2 → h3 → h4, never skip)
- [ ] Preset slugs are valid defaults or documented as theme-specific
- [ ] `Slug` in header uses correct namespace: `theme-slug/pattern-name`
- [ ] No inline `<style>`, no `<script>`, no custom CSS classes
- [ ] No query-dependent PHP functions

### 7) Verification

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

**Manual check:**
- Paste block markup into the Code Editor view in WordPress
- Switch to Visual Editor — blocks should parse without "Attempt Block Recovery" prompts
- If recovery is needed, the markup has syntax errors

## Example Prompts

### Hero Section
> "Create a bold hero pattern with a large heading, subtitle, and two CTA buttons. Dark background, full-width, for a creative agency theme."

Expected: Cover or Group block with contrast bg, constrained inner, heading with xx-large + heading font, paragraph with secondary color, Buttons with primary + outline styles.

### Testimonial Grid
> "Create a 3-column testimonial grid with avatar, quote, name, and role. Alternating card backgrounds."

Expected: Group wrapper, CSS grid (3 columns, responsive), inner Group cards with varied tertiary/base backgrounds, Image block for avatar (rounded border-radius), Paragraph for quote (italic), Heading h3 for name, Paragraph small for role.

### Blog Post Listing
> "Create a starter page pattern for a blog index with featured post hero and 3-column grid of recent posts below."

Expected: `Block Types: core/post-content` header, Query Loop for featured post (perPage 1, large layout), second Query Loop for grid (perPage 3, grid layout with post-template), clear visual separation between sections.

### Footer with Columns
> "Create a 4-column footer pattern with logo, navigation links, contact info, and social icons. Dark background."

Expected: `Block Types: core/template-part/footer` header, Group full-width with contrast bg, Columns (4), Site Logo block, Navigation or list blocks, Paragraph blocks for contact, Social Icons block. `Inserter: no`.
