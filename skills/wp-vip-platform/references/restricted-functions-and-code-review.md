# Restricted functions and VIP code review

VIP code review is enforced primarily through the `WordPressVIPMinimum` PHPCS standard (part of `Automattic/VIP-Coding-Standards`). When a function is flagged, it's rarely arbitrary — it maps to a specific failure mode at VIP's scale. Explain the *why*, not just the replacement.

## Common categories

**1. Cache-unsafe server-side logic**
Implementing per-user or per-request server-side logic that gets swept into the page cache causes data leakage (user A sees user B's cached response) or stale/incorrect results.
- Avoid embedding user-specific state in cacheable output.
- If you must vary output, do it client-side (JS) after the cached HTML loads, or ensure the response is genuinely uncacheable.

**2. Filesystem operations** — see `file-system-and-media.md`. Any `fopen`/`fwrite`/`chmod`/`chown` outside `/tmp/` is flagged.

**3. Term/page/category lookups without caching**
Several WordPress core lookup functions don't cache their results, which is fine at small scale but expensive under VIP's traffic/query volume. VIP ships cached equivalents:
- `get_term_link()` → `wpcom_vip_get_term_link()`
- `get_term_by()` → `wpcom_vip_get_term_by()`
- `get_category_by_slug()` → `wpcom_vip_get_category_by_slug()`
- `get_page_by_path()` → `wpcom_vip_get_page_by_path()`
- `get_page_by_title()` → `wpcom_vip_get_page_by_title()`

When you see a flagged core function like these, check for a `wpcom_vip_*` equivalent before reaching for a manual cache wrap.

**4. `ORDER BY RAND()`**
Expensive on large tables — the DB has to compute a random sort for the whole result set.
- Prefer `vip_get_random_posts()`, or fetch a bounded set (e.g. 100 recent posts) and pick randomly in PHP.

**5. DOM manipulation via `.html()` / `.innerHTML` (JS)**
Direct HTML injection from untrusted data is an XSS vector.
- Use `.append()`, `.prepend()`, `.before()`, `.after()` (or equivalent DOM APIs) to build nodes programmatically instead of string-injecting HTML.

**6. Timezone manipulation**
`date_default_timezone_set()` conflicts with platform-level systems and stats tracking.
- Use WordPress's own timezone functions (`current_time()`, `wp_timezone()`) instead of touching the process-wide default timezone.

**7. Runtime settings changes**
`ini_set()`, `error_reporting()`, and similar calls in application code can enable Full Path Disclosure or other information-leak vulnerabilities in production.
- These belong in platform/environment configuration, not application code.

**8. Standard input handling**
Untrusted input (`$_GET`, `$_POST`, `$_REQUEST`, `$_SERVER`, DB results treated as trusted) is still the most common review flag, same as any WordPress code:
- Validate and sanitize on input.
- Escape on output, at the point of display.
- Use nonces for state-changing form submissions and verify capabilities before acting.

## Working with an existing PHPCS setup

If the repo already has `phpcs.xml`/`phpcs.xml.dist` with `WordPressVIPMinimum` included, run PHPCS and fix flagged lines using the mappings above rather than adding blanket suppressions. A suppression (`// phpcs:ignore WordPressVIPMinimum.<Sniff>`) is only appropriate when the flagged pattern is genuinely safe in context — always comment why.

For non-VIP-specific static analysis (PHPStan types, general code quality), use `wp-phpstan` instead — it's a different tool solving a different problem.

## Source

- https://docs.wpvip.com/technical-references/code-review/vip-errors
- https://github.com/Automattic/VIP-Coding-Standards
