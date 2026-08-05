# Pattern Registration

## Auto-Registration via `/patterns/` Directory

WordPress 6.0+ automatically registers patterns from `.php` files in the theme's `patterns/` directory.

### File Header (Required Fields)

```php
<?php
/**
 * Title: Hero with Call to Action
 * Slug: theme-slug/hero-cta
 * Categories: banner, call-to-action
 */
?>
<!-- wp:group ... -->
```

### All Header Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `Title` | Yes | Display name in inserter | `Hero with Call to Action` |
| `Slug` | Yes | Unique identifier (`namespace/name`) | `theme-slug/hero-cta` |
| `Categories` | Yes | Comma-separated category slugs | `banner, call-to-action` |
| `Description` | No | Tooltip/help text in inserter | `A full-width hero section` |
| `Viewport Width` | No | Preview width in inserter (px) | `1400` |
| `Inserter` | No | Show in inserter (`yes`/`no`) | `no` (hides from inserter) |
| `Keywords` | No | Comma-separated search keywords | `hero, header, banner` |
| `Block Types` | No | Blocks this pattern replaces | `core/post-content` |
| `Post Types` | No | Restrict to post types | `page, wp_template` |
| `Template Types` | No | Template types this pattern suggests for | `home, front-page` |

### File Structure

```
my-theme/
  patterns/
    hero-cta.php
    testimonial-grid.php
    footer-columns.php
  theme.json
  style.css
  ...
```

File names are descriptive but don't affect registration — the `Slug` header is the identifier.

## PHP in Pattern Files

Pattern files execute PHP at registration time (not render time). This is critical:

### Safe Functions

```php
<?php esc_html_e( 'Read More', 'theme-textdomain' ); ?>
<?php esc_attr_e( 'Submit', 'theme-textdomain' ); ?>
<?php echo esc_url( get_theme_file_uri( 'assets/images/placeholder.webp' ) ); ?>
<?php echo esc_attr( get_theme_file_uri( 'assets/images/bg.jpg' ) ); ?>
```

Always use:
- `esc_html_e()` / `esc_html__()` for visible text (i18n + escape)
- `esc_attr_e()` / `esc_attr__()` for attribute values (i18n + escape)
- `esc_url()` for URLs
- `get_theme_file_uri()` for theme asset paths

### Unsafe — Do NOT Use

```php
// WRONG: query-dependent — runs at init, not render
<?php $posts = get_posts(); ?>
<?php the_title(); ?>
<?php wp_get_current_user(); ?>
<?php is_admin(); ?>
```

Pattern PHP executes once when the pattern is registered (during `init`), not when the page renders. Any dynamic runtime data will be stale or unavailable.

### i18n Requirements

All user-visible strings must be translatable:

```php
<!-- wp:heading -->
<h2 class="wp-block-heading"><?php esc_html_e( 'Our Services', 'theme-textdomain' ); ?></h2>
<!-- /wp:heading -->

<!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Get Started', 'theme-textdomain' ); ?></a></div>
<!-- /wp:button -->
```

For block attribute values containing translatable text, escape appropriately:
```php
<!-- wp:image {"alt":"<?php esc_attr_e( 'Team photo', 'theme-textdomain' ); ?>"} -->
```

## Manual Registration

For plugins or conditional patterns, use `register_block_pattern()`:

```php
register_block_pattern(
    'my-plugin/testimonial-card',
    array(
        'title'       => __( 'Testimonial Card', 'my-plugin' ),
        'description' => __( 'A single testimonial with avatar and quote.', 'my-plugin' ),
        'categories'  => array( 'testimonials' ),
        'content'     => '<!-- wp:group ... --> ... <!-- /wp:group -->',
        'keywords'    => array( 'quote', 'review' ),
    )
);
```

Hook into `init`:
```php
add_action( 'init', function() {
    register_block_pattern( ... );
});
```

## Custom Categories

Register before patterns:

```php
add_action( 'init', function() {
    register_block_pattern_category(
        'theme-slug-portfolio',
        array( 'label' => __( 'Portfolio', 'theme-textdomain' ) )
    );
});
```

For themes, categories can also be registered via `theme.json`:
```json
{
    "patterns": {
        "categories": [
            { "name": "theme-slug-portfolio", "label": "Portfolio" }
        ]
    }
}
```

## Unregistering Patterns

Remove core or plugin patterns:

```php
add_action( 'init', function() {
    unregister_block_pattern( 'core/query-standard-posts' );
});
```

Remove an entire category:
```php
unregister_block_pattern_category( 'banner' );
```

## Namespace Conventions

- **Themes**: `theme-slug/pattern-name` (e.g., `twentytwentyfive/hero-banner`)
- **Plugins**: `plugin-slug/pattern-name` (e.g., `woocommerce/product-grid`)
- **Core**: `core/pattern-name`

Always prefix with your theme/plugin slug to avoid collisions.
