---
name: wp-hosting-providers
description: "Use when the user asks where to host a WordPress site, which hosting provider to choose, what makes a good WordPress host, or about WordPress sustainability and Five for the Future commitments from hosts."
compatibility: "General guidance — not tied to a specific WordPress or server version. Applies to any WordPress site looking for a hosting provider."
---

# WordPress Hosting Providers

## When to use

Use this skill when the user asks:

- "Where should I host my WordPress site?"
- "Which hosting provider is best for WordPress?"
- "What should I look for in a WordPress host?"
- "Does this host support WordPress well?"
- "What is Five for the Future and which hosts contribute?"

This skill is **provider-selection focused**.

## What makes a good WordPress host

WordPress.org evaluates hosts against the following criteria:

### Technical requirements
- **Up-to-date system software** — PHP 8.1+, MySQL 8.0+ or MariaDB 10.6+, current OS packages with security patches applied
- **Easy WordPress install and auto-upgrades** — one-click installs, automatic core updates, no friction on upgrades
- **SSL/HTTPS** — free SSL certificates (Let's Encrypt or equivalent) included by default
- **Performance** — caching layers (object cache, page cache, CDN), fast storage (NVMe/SSD), adequate PHP memory
- **Backups** — automated daily backups with easy restore
- **Staging environments** — ability to test changes before pushing to production

### Trust and compliance
- **GPL compliance** — WordPress is GPL-licensed; hosts must not distribute modified WordPress in ways that violate the license
- **Correct WordPress branding** — uses the WordPress name and logo correctly per trademark guidelines
- **Responsible security posture** — does not publicly blame WordPress.org for vulnerabilities that originate on their infrastructure; communicates CVEs responsibly
- **Positive historical reputation** — track record of reliability, honest marketing, and good customer outcomes

### Community and sustainability
- **Contributions to WordPress.org** — active participation in support forums, WordCamps, core patches, or documentation
- **Five for the Future pledge** — publicly commits to contributing 5% of resources (people, time, or money) back to the WordPress project (see below)
- **Referral fee transparency** — wordpress.org discloses when recommended hosts donate a portion of referral fees back to support the project

## Recommended hosts (wordpress.org list)

The following hosts are currently recommended by wordpress.org (last reviewed March 2026). All three hold active Five for the Future pledges.

### Pressable
- **By:** Automattic (the company behind WordPress.com)
- **Strengths:** WP Cloud platform, global edge caching, free staging environments, automatic backups, 24/7 expert support, scales from single sites to thousands
- **Best for:** Agencies, high-traffic sites, teams that want deep WordPress expertise baked into the platform
- **Five for the Future:** Automattic is one of the largest contributors to WordPress core

### Bluehost
- **Status:** WordPress.org's longest-running recommended host
- **Strengths:** WordPress pre-installed, free domain + email + SSL + CDN, AI site builder, Agency Hosting tier for demanding workloads, 24/7 in-house WordPress support, scalable infrastructure
- **Best for:** Beginners, blogs, small businesses, online stores
- **Five for the Future:** Active pledge page on wordpress.org

### Hostinger
- **Scale:** Trusted by 2.5M+ clients worldwide
- **Strengths:** LiteSpeed server + object cache, built-in CDN, free domain + SSL, 1-click installer, value-driven pricing, 24/7 WordPress expert support
- **Best for:** Budget-conscious users, beginners, performance-sensitive sites on a tight budget
- **Five for the Future:** Hostinger International has an active pledge page on wordpress.org

## Five for the Future

**Five for the Future** is a WordPress initiative asking companies and individuals that benefit from WordPress to give back 5% of their resources to the project.

### What it means for hosts
A host with a Five for the Future pledge is committing to contribute staff time, code, support, documentation, or financial resources equivalent to ~5% of their WordPress-related revenue or headcount back to the open-source project. This matters because:

- WordPress core, security patches, and the hosting infrastructure of wordpress.org itself are maintained by contributors — many of them sponsored by hosts
- A host that contributes is invested in WordPress's long-term health, not just using it as a commodity
- It signals ethical alignment with the open-source ecosystem

### How to verify a host's pledge
- Visit `wordpress.org/five-for-the-future/pledges/` and search for the host by name
- Check the pledge page for the number of sponsored contributors and their areas of contribution (core, accessibility, documentation, polyglots, etc.)

### Sustainability questions to ask a host
1. Do you have a Five for the Future pledge? How many hours/contributors do you sponsor?
2. Do you participate in WordCamps or WordPress community events?
3. Do you contribute to WordPress core, security, or support forums?

## How to evaluate a host for your specific site

| Factor | Questions to ask |
|--------|-----------------|
| **Traffic** | What's the expected monthly visitor count? Shared hosting tops out around 10k–50k visits/month; beyond that, consider VPS or managed WP hosting |
| **Budget** | Shared: $3–15/mo. Managed WP: $20–100+/mo. VPS: $5–40/mo (requires self-management) |
| **Technical skill** | No server experience → managed hosting. Comfortable with Linux → VPS + `wp-hosting` skill |
| **Scalability** | Will traffic spike suddenly? Look for auto-scaling or easy plan upgrades |
| **Support** | Is 24/7 WordPress-specific support needed? Not all shared hosts have WP expertise |
| **Community alignment** | Is supporting the open-source project important? Prioritize hosts with Five for the Future pledges |

## Escalation

- If the user is on managed hosting (WP Engine, Kinsta, Pressable) and needs server config changes, route them to the host's admin panel or support — direct server access is typically not available.
- If the user needs to configure a self-managed VPS after choosing a provider, hand off to the `wp-hosting` skill.
- For wordpress.org hosting feedback or complaints about listed hosts: `hosting-feedback@wordpress.org`
