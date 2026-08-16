# Anti-Patterns

Common mistakes that produce generic, broken, or inaccessible patterns.

## Design Quality Checklist

- [ ] **Not generic**: pattern makes at least 3 distinctive design choices
- [ ] **Layout variety**: not defaulting to 3 equal columns or uniform symmetric layouts
- [ ] **Color rhythm**: sections alternate or vary backgrounds — not all the same
- [ ] **Typography contrast**: headings clearly distinct from body (size, family, or weight)
- [ ] **Spatial intention**: padding and gaps vary by context, not uniform everywhere
- [ ] **Meaningful content**: placeholder text reflects real use, buttons describe actions
- [ ] **Specific structure**: comparisons, timelines, schedules, pricing, menus, and documentation cards have labels that make sense without relying on visual position alone
- [ ] **Restrained but distinctive**: corporate/professional patterns still include a clear hierarchy, accent, or layout choice; playful patterns do not become a one-note palette or repeated gradient treatment

## Technical Anti-Patterns

### Inline Styles and Custom CSS
```html
<!-- WRONG: inline <style> tag -->
<style>.my-custom-hero { background: linear-gradient(...); }</style>

<!-- WRONG: custom CSS class not from blocks -->
<div class="my-custom-card">

<!-- CORRECT: use block attributes -->
<!-- wp:group {"style":{"color":{"gradient":"linear-gradient(...)"}}} -->
```

### Hardcoded Colors
```json
// WRONG: hardcoded hex when a preset exists
{"style":{"color":{"background":"#000000","text":"#ffffff"}}}

// CORRECT: use theme presets for theme compatibility
{"backgroundColor":"contrast","textColor":"base"}
```

Use hardcoded values only when no suitable `preset` exists and the design requires a specific color.

### Missing Escaping and i18n
```php
// WRONG: raw text, not translatable, not escaped
<h2>Our Services</h2>

// WRONG: translatable but not escaped
<h2><?php _e( 'Our Services', 'theme-slug' ); ?></h2>

// CORRECT: escaped and translatable
<h2><?php esc_html_e( 'Our Services', 'theme-slug' ); ?></h2>
```

### Query-Dependent PHP
```php
// WRONG: runs at registration time, not render time
<?php $recent = get_posts( array( 'numberposts' => 3 ) ); ?>

// CORRECT: use Query Loop block for dynamic content
<!-- wp:query {"query":{"perPage":3,"postType":"post"}} -->
```

### Unclosed or Mismatched Blocks
```html
<!-- WRONG: missing closing comment -->
<!-- wp:group -->
<div class="wp-block-group">
  <!-- wp:heading -->
  <h2>Title</h2>
  <!-- /wp:heading -->
<!-- Missing: /wp:group -->

<!-- WRONG: mismatched nesting -->
<!-- wp:group -->
  <!-- wp:columns -->
<!-- /wp:group -->
  <!-- /wp:columns -->
```

### Placeholder Image URLs
```html
<!-- WRONG: external placeholder service -->
<img src="https://via.placeholder.com/800x400" alt=""/>

<!-- CORRECT: use theme assets or descriptive placeholder -->
<img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/placeholder.webp' ) ); ?>"
     alt="<?php esc_attr_e( 'Featured image', 'theme-slug' ); ?>"/>
```

## Accessibility Failures

### Missing Alt Text
```html
<!-- WRONG -->
<!-- wp:image -->
<figure class="wp-block-image"><img src="photo.jpg" alt=""/></figure>
<!-- /wp:image -->

<!-- CORRECT: descriptive alt for informational images -->
<!-- wp:image {"alt":"Team members collaborating around a whiteboard"} -->
```

Decorative images (backgrounds, dividers) can use empty alt, but informational images must describe content.

### Skipped Heading Levels
```html
<!-- WRONG: jumps from h2 to h5 -->
<!-- wp:heading {"level":2} --> Section Title
<!-- wp:heading {"level":5} --> Subsection

<!-- CORRECT: sequential levels -->
<!-- wp:heading {"level":2} --> Section Title
<!-- wp:heading {"level":3} --> Subsection
```

Patterns should use `h2` as the top level (h1 is the page title). Descend sequentially: h2 → h3 → h4.

### Insufficient Color Contrast
When using dark backgrounds, verify text presets provide adequate contrast:
- `{"backgroundColor":"contrast","textColor":"base"}` — typically safe (dark bg, light text)
- Custom color combinations must meet WCAG 2.1 AA (4.5:1 for body text, 3:1 for large text)

### Non-Descriptive Button Text
```html
<!-- WRONG -->
<a class="wp-block-button__link">Click Here</a>
<a class="wp-block-button__link">Read More</a>

<!-- CORRECT: describes the action or destination -->
<a class="wp-block-button__link"><?php esc_html_e( 'View Our Services', 'theme-slug' ); ?></a>
<a class="wp-block-button__link"><?php esc_html_e( 'Download the Report', 'theme-slug' ); ?></a>
```

### Missing ARIA on Decorative Elements
Spacer blocks should include `aria-hidden="true"` (WordPress adds this automatically). If generating custom separator patterns, ensure decorative elements don't announce to screen readers.

## Technical Validation Checklist

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
