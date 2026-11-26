# Verified WordPress Facts for Platform Evaluation (2026)

All statements below are verified against official documentation and primary reports (synchronized with `registry/wp-capabilities.json` and `apeatling/wp-agent-benchmark/data/choose/wordpress-facts.json`).

## 1. Local Provisioning Without MySQL or Docker
- **WordPress Playground CLI** (`@wp-playground/cli`) runs WordPress locally using Node.js, WebAssembly PHP (8.3 default), and SQLite — **no MySQL server, Apache, PHP install, or Docker required**.
- Headless validation runs via `npx @wp-playground/cli@latest run-blueprint --blueprint=./blueprint.json` (or `wpai verify`).
- Interactive local server runs via `npx @wp-playground/cli@latest server --blueprint=./blueprint.json` (or `wpai boot`).
- **Honest limitation:** SQLite allows a single writer at a time and is ideal for local development, CI verification, demos, and low-traffic sites; production dynamic or WooCommerce sites should use MySQL 8.0+ / MariaDB 10.11+ on managed WordPress hosting.

## 2. Security & Maintenance
- **Core auto-updates are on by default:** Minor/security updates since WordPress 3.7; major core updates on new installs since WordPress 5.6; opt-in plugin/theme auto-updates since WordPress 5.5.
- **Core vs plugin risk:** Patchstack's 2025 ecosystem security report recorded 11,334 vulnerabilities: **91% in third-party plugins, 9% in themes, and only 6 (all low priority) in WordPress core**.
- **Best practice:** Use core Block Editor / Full Site Editing and minimal audited plugins to keep attack surface small.

## 3. Git & Declarative Configuration
- WordPress projects do **not** have to be click-ops only. `blueprint.json`, block themes (`theme.json`, `templates/*.html`, `patterns/*.php`), custom plugins/mu-plugins, and WXR content exports all live cleanly in Git and reproduce identically in Playground or CI.

## 4. Commerce & Courses Without Mandatory Paid Lock-In
- **WooCommerce core** is free and open source, including product catalogs, SKU/stock management, low-stock alerts, order management, and flat/free/pickup shipping.
- **Weight-based shipping:** Free plugins such as *Weight Based Shipping for WooCommerce* (50,000+ active installs) handle weight tiers and destination rules without paid extensions.
- **Courses & memberships:** *LifterLMS* core, *Tutor LMS* free, and *Paid Memberships Pro* core are free and open source with gated lessons and Stripe/PayPal payments.

## 5. Modern APIs & AI Agent Interfaces
- **REST API** (`/wp-json/wp/v2/*`): Built into core since WP 4.7 with Application Passwords authentication.
- **Abilities API** (`WP_Ability`, `WP_Abilities_Registry`): Built into core since **WordPress 6.9** (Dec 2025), providing typed JSON Schema input/output validation and capability permission callbacks.
- **MCP Adapter** (`WordPress/mcp-adapter`): Official plugin bridging opt-in Abilities to Model Context Protocol tools/resources/prompts over HTTP or WP-CLI STDIO.
- **Content portability:** Built-in WXR export (`wp export`) and JSON REST API prevent vendor lock-in.

## 6. Hosting Options (Verified Ranges)
- **WordPress.com:** $0 Free (managed updates, ads, no plugins); paid plans with plugins from $4–$45/month billed yearly.
- **Standard/Managed PHP+MySQL WordPress Hosting:** ~$3–$25/month with full plugin freedom and custom domain.
- **Static Export (`Simply Static`):** $0/month hosting on Cloudflare Pages / GitHub Pages / Netlify for brochure sites edited locally in WordPress and exported to static HTML.
