# Multisite on VIP

WordPress multisite works on VIP the same way it does anywhere — one instance/database serving multiple sites — but domain handling and a few workflows are VIP-specific.

## Network Sites panel and Site Address (URL)

The VIP Dashboard's **Network Sites** panel lists every site on the network, and is where new network sites get launched and where a site's Site Address (URL) is updated. A network site's Site Address must be unique across the network and follows one of two structures:

- **Subdomain**: `site-a.example.com`
- **Subdirectory**: `example.com/site-a`

Whichever structure the network was created with is fixed for that network — don't propose switching a live network between subdomain and subdirectory structure as a routine change.

## Custom domains and domain mapping

A network site's Site Address can be updated to a custom domain, but the domain has to be added to the environment in the VIP Dashboard first — adding DNS records alone isn't sufficient, VIP needs to know about the domain.

## Serving one site from multiple domains

By default, one network site maps to one Site Address. If a site genuinely needs to respond on more than one domain (e.g., a legacy domain redirecting into a site, or one site serving two brands), that requires custom code in **`client-sunrise.php`** — this runs before multisite's normal domain-to-site resolution and lets you customize how a request's domain maps to a network site. This is an advanced, easy-to-get-wrong customization — don't reach for it unless a single custom domain + `Configure multiple domains to resolve to the same network site`-style redirect genuinely doesn't cover the case.

## Data Sync across multiple domains/environments

VIP's Data Sync feature (copying database/content between environments, e.g. production → a non-production environment for testing) has its own configuration file when a multisite network involves multiple domains — the sync config needs to know how to handle domain rewriting per network site, not just a single site URL. Don't assume a single-site Data Sync config generalizes to a multisite network without checking this.

## Manual launch of a network site

New network sites are typically launched through the Network Sites panel, but a site can also be launched manually when the standard flow doesn't fit (e.g., a site with unusual pre-existing content/domain requirements). Treat manual launch as the exception path, not the default.

## Guardrails

- Don't suggest classic WordPress multisite domain-mapping plugins (e.g., ones that manipulate `.htaccess` or expect writable config) — VIP's domain handling goes through the VIP Dashboard + `client-sunrise.php`, and there's no `.htaccess` (`vip-platform-defaults.md`).
- Enterprise Search indexing is per-site on a network — don't assume activating it once covers every network site automatically; check `enterprise-search.md` and confirm indexing scope for multisite specifically if this comes up.
- `switch_to_blog()` heavy loops (iterating all sites on a large network) carry the same general WordPress multisite performance caveats as any host — profile via `wp-performance` if a multisite-wide operation is slow; that's not VIP-specific.

## Source

- https://docs.wpvip.com/wordpress-on-vip/multisites/
- https://docs.wpvip.com/wordpress-on-vip/multisites/network-sites/
- https://docs.wpvip.com/technical-references/multisites/subdomains-subdirectories/
- https://docs.wpvip.com/technical-references/domains-tls/domain-mapping-for-multisite/
- https://docs.wpvip.com/domains/multiple-domains/
- https://docs.wpvip.com/technical-references/multisites/data-sync-for-multiple-domains
- https://docs.wpvip.com/launch-a-site/manual-launch/
