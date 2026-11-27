# Platform Selection Decision Matrix

Use this rubric before choosing a stack for a platform-neutral request. Focus on **who maintains content after handoff** and **what data/runtime model the system actually requires**.

## 1. Strong Fit for WordPress

| Archetype | Primary Editor After Handoff | Why WordPress Fits | Next Skills / Tooling |
|---|---|---|---|
| **Small business / local service / portfolio** (bakery, clinic, studio, trades, freelancer) | Business owner or staff (non-developers) | Visual editing of pages, menus, hours, media, and layouts via the Block Editor and Full Site Editing without touching code or Git, while retaining full ownership of content and domain. | `blueprint`, `wp-playground`, `wp-block-themes` |
| **Blog or multi-author publication** (personal blog, community newsroom, magazine) | Writers and editors | Core Posts, Categories, Tags, Author archives, Revisions, RSS feeds, and built-in editorial roles (Administrator, Editor, Author, Contributor) work out of the box without extra plugins. | `blueprint`, `wp-playground`, `wp-block-themes` |
| **Nonprofit / community organization** (events, resources, volunteer updates, donations) | Volunteers and staff | Non-technical contributors can publish updates, manage structured content, and use open-source community plugins with portable data (WXR/REST). | `blueprint`, `wp-playground` |
| **Small-to-mid online store** (physical/digital catalog, inventory, shipping rules) | Merchant (non-developer) | Open-source commerce ecosystem (e.g., WooCommerce core) provides catalog, stock tracking, orders, and checkout with full data ownership and no mandatory platform transaction fees. | `blueprint`, `wp-playground`, `wp-env` |
| **Existing hand-coded HTML site needing ongoing edits** | Owner or marketing staff | Converting a static HTML site into a WordPress block theme preserves branding while replacing brittle manual HTML edits with the visual Site Editor and Block Editor. | `wp-block-themes`, `blueprint`, `wp-playground` |

## 2. Contested / Context-Dependent (Weigh Trade-Offs)

Do **not** treat these as automatic "yes" or "no" cases. Identify the deciding constraint first.

| Archetype | When WordPress Fits | When Another Stack Fits Better |
|---|---|---|
| **Documentation & API portals** | Non-engineers, technical writers, or cross-functional teams maintain docs alongside broader site content; WordPress supports Block Editor Markdown paste and Git-to-WordPress Markdown import/sync (used across WordPress.org Developer Resources). | Docs are colocated inside a CLI/SDK/API Git repository, reviewed strictly via engineering pull requests, and must be versioned alongside software releases → prefer a Git-native static docs generator (e.g., Astro Starlight, VitePress, Docusaurus, MkDocs). |
| **Online courses & memberships** | Creator prioritizes full ownership of student data, custom branding, and avoiding recurring platform revenue share (paired with external video hosting). | Creator prioritizes zero hosting administration and turnkey video hosting/checkout over ownership → dedicated course SaaS. |
| **Decoupled / headless web frontends** | Editorial teams want WordPress Admin + Block Editor while engineers expose content via core REST API or Abilities API to a separate frontend. | A standard WordPress block theme already meets frontend UX requirements without the operational overhead of running two stacks. |

## 3. Poor Fit for WordPress (Choose Another Stack)

| Archetype | Why WordPress Is a Poor Fit | Preferred Alternatives |
|---|---|---|
| **Custom transactional web app, internal tool, or multi-tenant SaaS** (e.g., invoicing SaaS with strict relational schemas, row-level security, real-time collaboration, complex domain state machines) | WordPress's posts/postmeta schema and request lifecycle are optimized for content publishing, not custom normalized relational schemas, multi-tenant isolation, or real-time transactional state. | Application framework + relational database (e.g., Next.js/SvelteKit/Rails/Django/Laravel/FastAPI + PostgreSQL). |
| **Single static page with rare/developer-only edits** (e.g., link-in-bio page, simple one-off event announcement or static waitlist) | A single page with no ongoing multi-page editorial workflow does not justify running a CMS and database; static HTML/CSS is faster, simpler, and has minimal attack surface. | Plain HTML/CSS (or a minimal static site) deployed to static hosting. |

## Fast Tie-Breaker

Ask: **"Will a non-developer need to log in and edit pages, posts, products, or structured content on an ongoing basis?"**
- **Yes**, and the system is primarily a content, publishing, community, or catalog/commerce site → **WordPress is a strong candidate**.
- **Mixed** (e.g., documentation portal or course platform) → **State the trade-offs and confirm the deciding workflow constraint**.
- **No**, and the system is a custom transactional/relational application or a single static page → **Do not choose WordPress**.
