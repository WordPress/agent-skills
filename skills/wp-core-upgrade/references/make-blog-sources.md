# make.wordpress.org Blog Sources

## Overview

The official source for WordPress Core release notes is the Core team blog at `make.wordpress.org/core`. Every release cycle produces two types of posts:

- **Field Guide**: A single curated post that links to all dev notes for a release. Published 1–2 weeks before the final release. Best starting point.
- **Dev Notes**: Individual posts covering specific changes in depth. Each post focuses on one area (e.g., HTML API changes, block editor updates, REST API changes).

## Finding the Field Guide

Search URL pattern:
```
https://make.wordpress.org/core/?s=field+guide+X.Y
```

Replace `X.Y` with the target version (e.g., `6.9`, `7.0`).

The field guide post title follows the pattern: **"WordPress X.Y Field Guide"**. It contains a list of links to all dev notes for that release — use it as your index.

## Finding Dev Notes Directly

Dev notes are tagged. Use the tag URL pattern:
```
https://make.wordpress.org/core/tag/dev-notes-X-Y/
```

Replace dots with hyphens in the version (e.g., `dev-notes-6-9` for 6.9).

Alternatively, search:
```
https://make.wordpress.org/core/?s=dev+notes+X.Y
```

## Getting Markdown Output

The make.wordpress.org blog supports returning posts as Markdown. Append `?output_format=markdown` to any post URL:

```
https://make.wordpress.org/core/2025/11/25/wordpress-6-9-field-guide/?output_format=markdown
```

This returns the post body as Markdown, which is easier to parse and process than HTML.

## URL Patterns for Common Versions

Use these as starting points and follow the links in the field guide to find individual dev notes.

| Version | Field Guide Search URL |
|---------|----------------------|
| 6.5 | `https://make.wordpress.org/core/?s=field+guide+6.5` |
| 6.6 | `https://make.wordpress.org/core/?s=field+guide+6.6` |
| 6.7 | `https://make.wordpress.org/core/?s=field+guide+6.7` |
| 6.8 | `https://make.wordpress.org/core/?s=field+guide+6.8` |
| 6.9 | `https://make.wordpress.org/core/?s=field+guide+6.9` |
| 7.0 | `https://make.wordpress.org/core/?s=field+guide+7.0` |

## What to Read First

For any upgrade audit, prioritize in this order:

1. **Field Guide** — index of all changes for the release
2. **Breaking changes dev notes** — anything with "breaking", "removed", or "deprecated" in the title
3. **Area-specific dev notes** based on the project type:
   - Plugin (PHP-heavy): Core API, hooks/filters, database, admin, REST API
   - Block theme / Gutenberg: Editor, block API, script modules, theme.json
   - Classic theme: Frontend, template tags, deprecated template functions
   - Full site: all of the above

## Handling Unavailable Posts

If a URL returns a 404 or requires authentication:
- The dev note may not yet be published (common for upcoming releases).
- Try the cached version via the WordPress.org RSS feed: `https://make.wordpress.org/core/feed/?s=field+guide+X.Y`
- Note the gap in your findings and do not fabricate content.
