# Caching on VIP

VIP has two caching layers in front of PHP execution: **page cache** (edge) and **object cache**.

## Page cache

Requests are served from a page-level cache when possible, before ever reaching a web container. Publishing or updating a post (built-in or custom post type) automatically purges the relevant cached URLs.

For anything the automatic purge doesn't cover, purge explicitly and programmatically:

- `wpcom_vip_purge_edge_cache_for_url( $url )` — purge a specific URL.
- `wpcom_vip_purge_edge_cache_for_post( $post_id )` — purge URLs related to a post.
- `wpcom_vip_purge_edge_cache_for_term( $term_id )` — purge URLs related to a taxonomy term.

Notes:

- Purge calls are queued and executed on the `shutdown` hook — the purge is asynchronous and doesn't block the current request.
- Up to 4,000 URLs sharing the same domain can be purged in one batch.
- Purging a URL also purges all GET-parameter variants of that URL.
- Purges can also be triggered manually from the VIP Dashboard, VIP-CLI (`vip cache purge-url`), or a site's admin toolbar.

Do not build custom "cache-busting" query-string schemes to work around stale content — use the purge APIs.

## Object cache

The object cache (backed by memcached) is the second layer, hit by requests that pass through the page cache and reach a web container. It stores expensive computed values (query results, API responses, etc.) in memory for reuse across requests.

- Use `wp_cache_get()` / `wp_cache_set()` with an appropriate cache group, same as any WordPress object cache usage.
- Don't store per-user sensitive data under a shared cache key — a shared key is visible to any request that can compute the same key.
- Account for propagation delay: some REST/API responses may reflect a brief (roughly one-minute-scale) caching delay rather than being instantaneous.

## Debugging stale content

1. Confirm whether the content type's automatic purge applies (built-in/custom post type publish/update).
2. If not automatic, check whether the code path calls the relevant `wpcom_vip_purge_edge_cache_for_*()` function.
3. Remember purges are async (queued to `shutdown`) — a purge issued and checked in the same request may not be visible instantly.
4. For object-cache-level staleness, check the cache key/group construction, not the page cache.

For general (non-VIP) performance profiling methodology — WP-CLI `doctor`/`profile`, Query Monitor, autoload bloat — use `wp-performance`; this file only covers what's specific to VIP's caching layers.

## Source

- https://docs.wpvip.com/caching/
- https://docs.wpvip.com/caching/page-cache/purging/
- https://docs.wpvip.com/caching/page-cache/purging/programmatically/
- https://docs.wpvip.com/technical-references/cache-api/
