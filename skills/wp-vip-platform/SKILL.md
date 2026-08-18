---
name: wp-vip-platform
description: "Use when developing, reviewing, or debugging WordPress code that targets the WordPress VIP platform (VIP Go): read-only filesystem constraints, restricted/discouraged functions and wpcom_vip_* replacements, VIP page/object caching and purge APIs, Cron Control instead of wp-cron.php, GitHub-based code deployment, Enterprise Search (Elasticsearch), and the VIP Local Development Environment / VIP-CLI. Not for generic WordPress hosting questions — route those to wp-plugin-development, wp-performance, or wp-wpcli-and-ops."
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

## Inputs required

- Confirm the target is actually VIP (see signals above) — don't guess.
- Environment: local (VIP Local Development Environment), a VIP sandbox, or a live VIP environment (production/non-production).
- Whether you have VIP-CLI / VIP Dashboard access, or are static-analysis-only (reading the repo, no live environment).
- What the task touches: filesystem/uploads, a restricted function flagged in review, caching behavior, cron, deploys, or search.

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

- **Local development / VIP-CLI commands**
  Read `references/local-development-and-cli.md`. Covers `vip dev-env` and non-dev-env `vip` commands (logs, cache purge). Do not confuse this with the generic `wp-env` or `wp-wpcli-and-ops` skill — VIP-CLI wraps and extends WP-CLI with VIP-platform-specific commands and constraints.

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
- If the repo shows no VIP signals at all but the user insists it's VIP, ask for the VIP application/environment name and confirm before proceeding — don't apply VIP-specific restrictions to a non-VIP host.

## Escalation

- Don't recommend infrastructure-level changes (scaling, environment config, integrations like Enterprise Search activation) — those go through the VIP Dashboard / VIP Support, not code changes.
- If a PHPCS `WordpressVIPMinimum` violation has no documented safe replacement, flag it for VIP Support rather than guessing at a workaround.
