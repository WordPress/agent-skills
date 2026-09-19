# Measurement (profiling vs benchmarking)

Backend-only measurement options:

- **WP-CLI profiling** (`wp profile`): best for pinpointing slow hooks/stages without a browser.
- **WP-CLI doctor** (`wp doctor`): best for quick diagnostics (autoload bloat, debug constants, updates).
- **Query Monitor via REST**: use authenticated REST requests and inspect `x-qm-*` headers / `qm` envelope data.
- **Server-Timing** (Performance Lab): inspect `Server-Timing` headers via `curl -I` (when enabled).
- **APM/profilers**: New Relic, Datadog, Blackfire, Tideways, XHProf/Xdebug (requires server support).

Best practices:

- Always capture a baseline first.
- Keep the test scenario fixed (same URL/route, same user state, same data).
- Prefer multiple samples and medians over single runs.

## CDN / proxy in front of the site (Cloudflare, Varnish, ...)

`curl` from the server itself often does not measure WordPress:

- Via the public URL, a CDN/WAF may answer a bot challenge or `403` (a small, constant-size page in tens of milliseconds). That times the CDN, not WordPress.
- Via a local reverse proxy (e.g. Varnish), a wrong `Host` header or an unreachable backend gives a `503` or an unexpected redirect, and a cache HIT only times the cache.

Before trusting a TTFB number, check that the response is the real page:

1. Status is `200` (not `403`/`503`, and not a `302` you did not intend).
2. Body size and headers look like WordPress output (page-cache headers, `Link: ...wp-json...`, expected HTML size).
3. Take several samples and keep cache HIT and MISS apart (e.g. a `?perf=<random>` query string, if the cache does not ignore it).

If the public URL is blocked, ask the user for one of: an allowlisted user agent or header, the origin IP and port (`curl --resolve <host>:<port>:<ip> ...`), or a CDN rule for the server's IP. Do not try to evade the WAF. If none is available, say so and use `wp profile` for relative comparisons only.

## CLI timings vs real requests

Each `wp` invocation starts with a cold opcache, whereas PHP-FPM keeps a warm shared one. Large `muplugins_loaded:before` / `plugins_loaded:before` times in `wp profile stage bootstrap` are mostly file loading. Compare CLI runs before/after a change; do not quote them as request time.

References:

- Measuring performance handbook: https://make.wordpress.org/performance/handbook/measuring-performance/
- Benchmarking with Server-Timing: https://make.wordpress.org/performance/handbook/measuring-performance/benchmarking-server-timing/

