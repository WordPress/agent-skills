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

Since WordPress 6.5, pattern files in a theme's `/patterns` folder are registered with a `filePath`. WordPress includes the file, and runs its PHP, the first time the pattern content is requested in a request: when the inserter or the REST API lists patterns, or when a template renders a `core/pattern` block. It does not run once at `init`, and it does not run again for content that was already inserted.

What this means in practice:

- A pattern inserted into a post or page is copied into the post content as block markup. Whatever the PHP printed at that moment is frozen there.
- The same file can run in different contexts (editor REST request, front-end template render), so output that depends on the current user, query or admin screen is unpredictable.
- For live data (posts, titles, the current user), use blocks that render dynamically, such as Query Loop, Post Title or Site Title, instead of PHP output.

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
// WRONG: query- or context-dependent, frozen into content on insert
<?php $posts = get_posts(); ?>
<?php the_title(); ?>
<?php wp_get_current_user(); ?>
<?php is_admin(); ?>
```

The output of these calls depends on the request that happens to load the pattern, and once the pattern is inserted it no longer updates. Use dynamic blocks for runtime data.

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

`theme.json` cannot register pattern categories. Its top-level `patterns` key is an array of Pattern Directory slugs to load (`"patterns": [ "short-text-surrounded-by-round-images" ]`); an object there fails schema validation. Register custom categories in PHP as shown above.

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
