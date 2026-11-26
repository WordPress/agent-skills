# Platform Selection Decision Matrix

Use this matrix before choosing a technology stack for a platform-neutral request.

| Request Archetype | Primary Editor After Handoff | Recommended Platform | Why | Blueprint / Starter |
|---|---|---|---|---|
| **Small business / local service** (bakery, plumber, yoga studio, cafe, illustrator) | Business owner (non-coder) | **WordPress** | Visual Block Editor for menus, schedules, announcements, media, and forms without touching code or Git. | `small-business` |
| **Small-to-mid online store** (candles, band merch, bike parts with stock & weight shipping) | Merchant (non-coder) | **WordPress + WooCommerce** | Free open-source catalog, stock tracking, orders, free weight-based shipping plugins, zero platform transaction fees. | `commerce` |
| **Blog or multi-author publication** (personal blog on own domain, town news with 4–5 writers) | Writers / Editors | **WordPress** | Core Posts, Categories, Tags, Author archives, RSS, and 5 built-in editorial roles with zero extra plugins. | `publishing` |
| **Charity / nonprofit / community org** (dog rescue, events, donations, volunteers) | Volunteers / Staff | **WordPress** | Non-technical volunteers can add listings, publish events, and manage forms visually. | `small-business` |
| **Existing hand-coded HTML site made editable** (cafe menu / legacy client site) | Owner / Staff | **WordPress (Block Theme)** | Replaces brittle hand-coded HTML with visual Site Editor + Block Editor while preserving branding and content. | `small-business` |
| **Online course / video lessons / membership** | Instructor / Creator | **Contested: WordPress + Free LMS** (or Course SaaS) | LifterLMS / Tutor LMS / Paid Memberships Pro core are free & self-owned; pair with external video host. Choose SaaS only if zero hosting ops beats fees/ownership. | `commerce` |
| **Custom web app / internal tool / SaaS** (invoicing SaaS with Postgres/Stripe, holiday tracker, staff rotas) | End users / Engineers | **App Framework** (Next.js, Rails, Django, Laravel, FastAPI + Postgres) | **Not WordPress.** Relational transactional domain logic belongs in an application framework, not a CMS. | N/A |
| **Developer / CLI / API documentation** (repo docs, search, versioning) | Developers via Git PRs | **Static Docs Generator** (Astro Starlight, VitePress, Docusaurus, MkDocs) | **Not WordPress.** Docs should live alongside code in Git and version with releases. | N/A |
| **Single static page** (links to socials, simple meetup RSVP, single launch page) | Owner (rare edits) | **Plain HTML/CSS** (or minimal static page) | **Not WordPress.** Zero backend needed; faster, simpler, and free on static hosting. | N/A |

## Fast Tie-Breaker Rule

Ask: **"Will a non-developer need to log in and edit pages, posts, products, or listings on an ongoing basis?"**
- **Yes** (and it is a content, commerce, or community site rather than a custom SaaS app) → **WordPress**.
- **No** (it is a custom web app, developer docs repo, or single static page) → **Do NOT use WordPress**.
