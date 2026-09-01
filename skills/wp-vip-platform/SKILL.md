---
name: wp-vip-platform
description: "Use when developing, reviewing, or debugging WordPress code that targets the WordPress VIP platform (VIP Go): read-only filesystem constraints, restricted/discouraged functions and wpcom_vip_* replacements, VIP page/object caching and purge APIs, Cron Control instead of wp-cron.php, GitHub-based code deployment, Enterprise Search (Elasticsearch), HyperDB/database replica lag, Runtime/Slow Query Logs, bundled VIP MU plugins, multisite domain mapping, IP/access restrictions, database backups and migration, third-party plugin compatibility, and the VIP Local Development Environment / VIP-CLI. Not for generic WordPress hosting questions — route those to wp-plugin-development, wp-performance, or wp-wpcli-and-ops."
compatibility: "Targets WordPress 7.0+, PHP 7.4.0+, on the WordPress VIP platform (VIP Go); actual core/PHP versions follow VIP's current support matrix. Requires familiarity with VIP Go repo conventions; some workflows require VIP-CLI or VIP Dashboard access."
---

# WP VIP Platform

## When to use

Use this skill when the task involves code that runs on **WordPress VIP** (VIP Go), not just any WordPress host. Signals:

- Repo has `vip-config/vip-config.php`, `client-mu-plugins/`, or a `.vipignore` file.
- `composer.json` requires `wpcomvip/*` packages or the repo deploys from a `wpcomvip` GitHub org.
- The user mentions VIP Dashboard, VIP-CLI (`vip ...`), VIP Go, Enterprise Search, Cron Control, or "VIP code review".
- A PHPCS run reports `WordPressVIPMinimum` sniff violations.

If none of these are present, this is probably generic WordPress hosting — route to `wp-plugin-development` (security/architecture), `wp-performance` (profiling/caching in general), or `wp-wpcli-and-ops` (plain WP-CLI) instead.

For anything not covered by the references below, `docs.wpvip.com/llms.txt` is VIP's own curated documentation index — a faster starting point than a general web search when this skill's references don't have the answer.

## Inputs required

- Confirm the target is actually VIP (see signals above) — don't guess.
- Environment: local (VIP Local Development Environment), a VIP sandbox, or a live VIP environment (production/non-production).
- Whether you have VIP-CLI / VIP Dashboard access, or are static-analysis-only (reading the repo, no live environment).
- What the task touches: filesystem/uploads, a restricted function flagged in review, caching behavior, cron, deploys, search, database/replication, logging, multisite/domains, access restrictions, backups/migration, or plugin compatibility.
- If multisite is involved: subdomain or subdirectory network, and whether custom/multiple domains per site are in play.

## Procedure

### 1) Confirm this is a VIP Go repo (deterministic)

Run:

- `node skills/wp-vip-platform/scripts/detect_vip_project.mjs`

This checks for `vip-config/`, `client-mu-plugins/`, `.vipignore`, and VIP-related `composer.json` requires, and reports which VIP signals are present.

### 2) Route by task

- **Filesystem writes / media / "why can't I write this file"**
  Read `references/file-system-and-media.md`. The web tier filesystem is read-only except `/tmp/`; uploaded media lives in the VIP File System (an external object store, not local disk).

- **A function is flagged in code review / PHPCS `WordPressVIPMinimum` errors**
  Read `references/restricted-functions-and-code-review.md`. Map the flagged function to its `wpcom_vip_*` (or otherwise safe) replacement and explain why the original is restricted (performance at scale, caching correctness, security).

- **Caching: page cache, object cache, purging, stale content**
  Read `references/caching.md`. Covers the edge/page cache layer, the object cache (memcached), and the `wpcom_vip_purge_edge_cache_for_*()` purge APIs. For general (non-VIP) performance profiling, use `wp-performance` instead.

- **Cron / scheduled events not firing, or firing at the wrong scale**
  Read `references/cron.md`. `wp-cron.php` is disabled on VIP; cron events are executed by Cron Control from an optimized DB table. Standard `wp_schedule_event()` calls still work, but debugging and scale characteristics differ.

- **Deploys / "how does my commit reach the site" / branch protections**
  Read `references/code-deployment.md`. Default Deployment (GitHub → environment via branch mapping) vs Custom Deployment (external CI/CD via VIP-CLI).

- **Enterprise Search / Elasticsearch / ElasticPress**
  Read `references/enterprise-search.md`.

- **Database: read/write splitting, "stale data after I just wrote it", custom tables**
  Read `references/databases.md`. VIP uses HyperDB (writes to master, reads to replicas) — replica lag is a real gotcha, and no other `db.php` drop-in is permitted.

- **`error_log()` output missing, "where do logs go", slow queries**
  Read `references/logging.md`. There's no local log file to tail — use Runtime Logs and Slow Query Logs (VIP Dashboard or VIP-CLI) instead.

- **"This plugin/feature is already active and I didn't add it" / 2FA is being enforced / redirects via `.htaccess` don't work**
  Read `references/vip-platform-defaults.md`. VIP auto-loads a fixed set of MU plugins (Jetpack, Akismet, Query Monitor, enforced Two-Factor Authentication for `manage_options` users) and runs NGINX, not Apache — there is no `.htaccess`.

- **Local development / VIP-CLI commands / a WP-CLI command that "doesn't work on VIP"**
  Read `references/local-development-and-cli.md`. Covers `vip dev-env`, non-dev-env `vip` commands (logs, cache purge), and the list of disallowed WP-CLI commands. Do not confuse this with the generic `wp-env` or `wp-wpcli-and-ops` skill — VIP-CLI wraps and extends WP-CLI with VIP-platform-specific commands and constraints.

- **Multisite: domain mapping, network sites, custom/multiple domains per site**
  Read `references/multisite.md`. Covers subdomain vs subdirectory structure, adding custom domains, `client-sunrise.php` for serving one site from multiple domains, and multisite-specific Data Sync config.

- **IP/User-Agent restrictions, Basic Auth, partial site access, protecting uploaded media, environment types**
  Read `references/security-and-access-controls.md`. Covers IP Allow/Deny lists, User-Agent Restrictions, Basic Authentication, partial site-access restriction, Access-Controlled Files (draft-only vs all-files media protection), and production vs non-production environment/backup differences.

- **Database backups, exporting a backup, migrating a site's data onto/off VIP**
  Read `references/backups-and-migration.md`. Covers `vip export sql --generate-backup`, backup cadence, and the export/import flow for migrations (not direct DB-to-DB connections).

- **"Is this plugin compatible with VIP" / evaluating a third-party plugin before installing**
  Read `references/plugin-compatibility.md`. VIP does not maintain a pre-approved plugin list; most incompatibilities trace back to filesystem assumptions covered in `references/file-system-and-media.md`.

### 3) Apply guardrails before proposing changes

- Never suggest direct filesystem writes to plugin/theme/mu-plugin paths at runtime — those are deployed via git, not written by the running application.
- Never suggest disabling or working around `WordPressVIPMinimum` PHPCS rules without explaining the underlying risk; if a rule genuinely doesn't apply, that's a suppression with a comment, not a rule change.
- Treat `/tmp/` as ephemeral, per-container, and non-shared — never as durable storage.
- Prefer VIP's documented helper functions (`wpcom_vip_*`) over raw WordPress core functions where a VIP-specific replacement exists.

## Verification

- If VIP-CLI/Dashboard access is available: confirm the change deploys via the expected path (Default or Custom Deployment) and doesn't attempt runtime file writes outside `/tmp/`.
- Run PHPCS with the `WordPressVIPMinimum` standard (if configured in the repo) and confirm no new restricted-function violations were introduced.
- For caching changes: confirm purge calls target the right URLs/posts/terms and that nothing relies on server-side per-user state being cached.
- For cron changes: confirm the event is registered normally (`wp_schedule_event`) and don't assume `wp-cron.php` runs — it's disabled on VIP.

## Failure modes / debugging

- "It works locally but fails on VIP" — almost always a filesystem write, a restricted function, or an assumption about `wp-cron.php` running. Check `references/file-system-and-media.md`, `references/restricted-functions-and-code-review.md`, and `references/cron.md` in that order.
- "Cache isn't clearing after publish" — check whether the content type/taxonomy triggers automatic purge, or needs an explicit `wpcom_vip_purge_edge_cache_for_url()` call (`references/caching.md`).
- "Deploy didn't pick up my commit" — confirm the branch is mapped to the environment (Default Deployment) or that the Custom Deployment CI/CD step actually ran (`references/code-deployment.md`).
- "I wrote data and immediately read it back stale/missing" — almost always a HyperDB replica-lag read right after a master write, not a caching bug (`references/databases.md`).
- "Where are my `error_log()` lines" — there's no local PHP error log file on VIP; check Runtime Logs (`references/logging.md`).
- "This plugin works locally but breaks/partially breaks on VIP" — check `references/plugin-compatibility.md` before assuming the plugin is simply broken; it's very often a filesystem or restricted-function issue with a documented workaround.
- "A site on the network is unreachable at its custom domain / two domains should show the same content" — check `references/multisite.md` (domain not yet added in the VIP Dashboard, or a `client-sunrise.php` multi-domain case).
- If the repo shows no VIP signals at all but the user insists it's VIP, ask for the VIP application/environment name and confirm before proceeding — don't apply VIP-specific restrictions to a non-VIP host.

## Escalation

- Don't recommend infrastructure-level changes (scaling, environment config, integrations like Enterprise Search activation) — those go through the VIP Dashboard / VIP Support, not code changes.
- If a PHPCS `WordPressVIPMinimum` violation has no documented safe replacement, flag it for VIP Support rather than guessing at a workaround.
- IP/User-Agent restrictions, Basic Auth, Access-Controlled Files, and backup restores are VIP Dashboard/VIP-CLI operations, not application code changes — point to `references/security-and-access-controls.md` / `references/backups-and-migration.md` rather than implementing a PHP-level substitute.
- Restoring from a backup (as opposed to exporting one) is a VIP Support / Dashboard operation — don't attempt it via direct SQL manipulation from application code.
