# Security controls, access restriction, and environment types

## Environment types and what that means for testing/backups

Every application has exactly one **production** environment (can't be created or deleted) and can have one or more **non-production** environments (created/deleted from the VIP Dashboard; the number allowed is set by the org's contract). Use non-production environments for feature work, bug fixes, and testing version/plugin upgrades — never treat production as the place to try something first.

- Production databases (including custom tables) are backed up **hourly**.
- Non-production databases are backed up **daily**.

This matters when scoping risk: a change tested only in a non-production environment has a coarser backup safety net than production if something needs restoring quickly, and non-production data itself may be older/stale relative to production.

## IP Restrictions

The VIP Dashboard's IP Restrictions panel supports two mutually exclusive list types per environment — **only one is active at a time**:

- **IP Allow List** — only listed IPs can reach the environment. Activating this list type does *not* block anything until at least one entry is added (an empty allow list is not equivalent to "block everyone").
- **IP Deny List** — listed IPs are blocked, everyone else can reach the environment.

Up to 1,000 entries are supported per list. This is configured per environment (select the right one from the environment dropdown before editing) — a rule added under one environment doesn't apply to another.

## User Agent Restrictions

Custom rules can block requests from specific User-Agent strings at an environment — useful for blocking known bad bots/scrapers without touching application code.

## Basic Authentication

An environment can be placed behind HTTP Basic Auth (typically for non-production environments that shouldn't be publicly reachable at all, as an extra layer beyond IP restriction).

## Partial restriction of site access

Distinct from environment-wide IP/Basic Auth restriction: this scopes access to *parts* of a site rather than the whole environment (e.g., restricting `/wp-admin/` while the public frontend stays open). Use this when the goal is "keep the public site public but lock down admin/certain paths," not "lock down everything."

## Access-Controlled Files (media-level access control)

This restricts access to files stored in the **VIP File System** specifically — it does not cover static assets (CSS/JS) committed to the git repo, only uploaded media. Two modes, toggled via a `client-mu-plugins` filter returning `1`, or via VIP-CLI (`wp option add vip_files_acl_restrict_unpublished_enabled 1` style options run through `vip @<app>.<env> -- wp ...`):

- **Restrict access to unpublished files** — media attached to draft/unpublished posts requires proper permissions to view; published media stays public. Use this to stop draft attachments from being reachable by a guessed/leaked URL.
- **Restrict access to all files** — every uploaded file requires a logged-in user with read permission. Appropriate for intranets/private sites, not typical public sites (it will break public image embeds if applied to a normal public site).

## Guardrails

- Don't propose `.htaccess`/web-server-level access rules for any of this — see `vip-platform-defaults.md` (NGINX, no `.htaccess`). Use the VIP Dashboard panels or the documented `client-mu-plugins` filters / VIP-CLI options instead.
- IP/User-Agent/Basic-Auth restrictions are dashboard configuration, not application code — don't try to replicate them in PHP (e.g., checking `$_SERVER['REMOTE_ADDR']` yourself) when the platform feature already does it correctly and centrally.
- Access-Controlled Files only protects the VIP File System (uploads) — it's not a general-purpose access control layer for arbitrary content; don't apply it as a fix for a page/post that should require login (that's a capability check in the template/query, not a media ACL).

## Source

- https://docs.wpvip.com/infrastructure/environments/
- https://docs.wpvip.com/security-controls/
- https://docs.wpvip.com/security-controls/ip-restrictions/
- https://docs.wpvip.com/security-controls/user-agent-restrictions/
- https://docs.wpvip.com/security-controls/basic-authentication/
- https://docs.wpvip.com/security-controls/partial-restriction-site-access/
- https://docs.wpvip.com/security-controls/access-controlled-files/
