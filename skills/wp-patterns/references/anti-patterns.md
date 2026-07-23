# Anti-Patterns

Common mistakes that produce generic, broken, or inaccessible patterns.

## Generic AI Aesthetic Markers

These indicate lazy generation — patterns that look like every other AI output:

**Layout monotony:**
- Three equal-width columns for everything (services, team, features)
- Identical padding on every section (`spacing|50` everywhere)
- Symmetric layouts with no visual hierarchy variation
- Every section centered, no left-aligned or asymmetric compositions

**Color flatness:**
- Only using `base` and `contrast` — no accent colors, no dark sections
- All sections have the same background — no rhythm of light/dark/accent
- Buttons all the same color with no primary/secondary distinction

**Typography sameness:**
- All headings the same size — no scale contrast between hero and section heads
- No use of `fontFamily` for heading/body distinction
- Missing typographic details: no letter-spacing, no line-height tuning
- All text the same color — no use of `secondary` or muted tones for supporting text

**How to fix:** Make at least 3 distinctive design choices per pattern:
1. One unexpected layout decision (asymmetric split, wide/narrow alternation, grid)
2. One bold color move (dark section, accent background, gradient)
3. One typographic contrast (display size, letter-spacing, font family switch)

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

Use hardcoded values only when no suitable preset exists and the design requires a specific color. Always prefer presets — they adapt to theme changes and style variations.

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

Every `<!-- wp:block -->` must have a matching `<!-- /wp:block -->` and nesting must be properly ordered.

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
