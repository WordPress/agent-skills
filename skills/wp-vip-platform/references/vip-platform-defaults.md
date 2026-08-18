# Platform defaults: bundled MU plugins and the web server

These are decisions VIP has already made for every environment. Don't propose re-implementing or re-installing what's already there, and don't be surprised by behavior that traces back to one of these.

## VIP MU plugins (auto-loaded on every environment)

A fixed set of must-use plugins ships on every VIP environment:

- **Jetpack** — always active, with Jetpack Complete-plan features, connected via the platform's own machine user. Don't suggest installing Jetpack, and don't assume it's absent when checking for known-plugin conflicts.
- **Akismet** — always active for comment/form spam filtering; managed by the platform, not the site owner.
- **Query Monitor** — available for debugging (see `wp-performance`'s Query Monitor headless-usage guidance for how to use it without a browser).
- **Two-Factor Authentication** — enforced for every user with `manage_options` (admins and any custom role granted that capability). If a user reports being unable to log in with just a password, this is almost certainly why — it's a platform policy, not an application bug to "fix" by disabling 2FA.
- **Cron Control** — see `cron.md`.
- **ElasticPress** (VIP fork) — self-enables once Enterprise Search is activated; see `enterprise-search.md`.

Because these are MU plugins, they load before regular plugins and can't be deactivated from the plugins screen — that's expected, not a bug.

## Web server: NGINX, not Apache

VIP runs NGINX. There is **no `.htaccess`** support, and NGINX server config is platform-wide — it can't be customized per application.

Practical implications:

- Don't propose `.htaccess` rewrite rules, `AddType`/`AddHandler` directives, or any Apache-specific config as a fix — it will silently do nothing.
- Redirects (the most common thing people reach for `.htaccess` for) need to happen at the WordPress/application layer instead: a redirects plugin, programmatic redirects in `vip-config.php`, or redirect logic in theme/plugin code.
- If a task genuinely needs web-server-level configuration beyond what WordPress/application code can do, that's a platform/VIP Support conversation, not something to solve with a dotfile.

## Source

- https://docs.wpvip.com/vip-go-mu-plugins/
- https://docs.wpvip.com/wordpress-on-vip/jetpack/
- https://docs.wpvip.com/security-controls/wordpress/enforce-2fa/
- https://docs.wpvip.com/redirects/
