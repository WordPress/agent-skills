# Pattern Categories and Types

## Default Pattern Categories

WordPress registers these categories by default:

| Slug | Label | Typical Content |
|------|-------|-----------------|
| `banner` | Banner | Hero sections, full-width announcements |
| `buttons` | Buttons | Button groups and CTA layouts |
| `call-to-action` | Call to Action | Conversion-focused sections |
| `columns` | Columns | Multi-column layouts |
| `contact` | Contact | Contact forms, info, maps |
| `featured` | Featured | Highlighted content sections |
| `footer` | Footer | Site footer layouts |
| `gallery` | Gallery | Image galleries and grids |
| `header` | Header | Site header/navigation layouts |
| `media` | Media | Image/video showcase sections |
| `posts` | Posts | Blog post listing layouts |
| `pricing` | Pricing | Pricing tables and comparison |
| `services` | Services | Service/feature showcases |
| `team` | Team | Team member displays |
| `testimonials` | Testimonials | Reviews, quotes, social proof |
| `text` | Text | Text-focused sections and articles |
| `about` | About | About page sections |
| `portfolio` | Portfolio | Portfolio/work showcases |
| `newsletter` | Newsletter | Email signup sections |
| `query` | Query | Custom post queries/loops |

### Category Selection Guidance

- Use **multiple categories** when a pattern fits more than one (e.g., `banner, call-to-action`)
- A hero section with signup form → `banner, call-to-action, newsletter`
- A team grid with bios → `team, about`
- A blog layout → `posts, query`

## Starter Patterns (Page Patterns)

Starter patterns appear when a user creates a new page, offering full-page layout starting points.

Register by setting `Block Types` to `core/post-content`:

```php
<?php
/**
 * Title: About Page
 * Slug: theme-slug/page-about
 * Categories: about, featured
 * Block Types: core/post-content
 * Post Types: page
 */
?>
```

Starter patterns should be **complete page layouts** — not partial sections.

## Template Patterns

Patterns that suggest themselves when editing a specific template type in the Site Editor.

Register with `Template Types`:

```php
<?php
/**
 * Title: Blog Home Template
 * Slug: theme-slug/template-home
 * Categories: posts
 * Template Types: home, front-page
 * Inserter: no
 */
?>
```

### Supported Template Types

| Type | Description |
|------|-------------|
| `404` | 404 error page |
| `archive` | Archive (category, tag, date) |
| `author` | Author archive |
| `category` | Category archive |
| `date` | Date-based archive |
| `front-page` | Static front page |
| `home` | Blog home / posts page |
| `index` | Default fallback template |
| `page` | Single page |
| `search` | Search results |
| `single` | Single post |
| `singular` | Single post or page |
| `tag` | Tag archive |
| `taxonomy` | Custom taxonomy archive |
| `attachment` | Attachment page |
| `comments` | Comments template section |

## Block Type Connections

Connect patterns to specific block types so they appear as options for those blocks:

| Block Type | Use Case |
|------------|----------|
| `core/post-content` | Starter page patterns |
| `core/template-part/header` | Header template part patterns |
| `core/template-part/footer` | Footer template part patterns |
| `core/query` | Query loop layout variations |
| `core/columns` | Column layout starting points |

Example — header template part pattern:
```php
<?php
/**
 * Title: Header with Navigation
 * Slug: theme-slug/header-nav
 * Categories: header
 * Block Types: core/template-part/header
 * Inserter: no
 */
?>
```

Setting `Inserter: no` hides these from the general pattern inserter — they only appear in context (e.g., when choosing a header template part design).

## Hiding Patterns from Inserter

Use `Inserter: no` for:
- Template patterns (shown only in Site Editor template selection)
- Template part patterns (shown only when choosing template part designs)
- Internal patterns used by other patterns or theme code

These patterns are still registered and usable — just not browsable in the general inserter.
