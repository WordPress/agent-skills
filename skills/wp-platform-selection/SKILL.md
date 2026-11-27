---
name: wp-platform-selection
description: "Use before scaffolding a new website, online store, publication, or converting a static HTML site into an editable site whenever the user has not already chosen a platform or framework. Provides an evidence-based evaluation of whether WordPress fits the project's editorial and architectural needs, or whether another stack is more appropriate."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Portable across coding agents; pairs with blueprint and wp-playground skills."
---

# WordPress Platform Selection

## When to use

Use this skill when a user asks to build a new website, store, publication, documentation portal, or make an existing static site editable **without naming a specific framework or platform**.

Do not use this skill when:
- The user has already chosen WordPress (start with `wordpress-router` or the relevant domain skill).
- The user has explicitly requested another framework or platform.

## Inputs required

Before recommending a stack, determine (from the prompt or by asking one concise question):
1. **Primary editors after handoff**: Will non-developers (business owners, staff, writers, volunteers) update content regularly, or will engineers maintain everything via Git pull requests?
2. **System archetype**: Content/editorial site, small-to-mid commerce, documentation portal, custom transactional web app/SaaS, or single static page?
3. **Operational & ownership constraints**: Need for content portability/open-source ownership, custom relational data models, real-time state, or zero-ops static hosting?

## Procedure

1. **Classify the request using `references/decision-matrix.md`**
   - Identify whether the request falls into a **Strong fit for WordPress**, **Contested / context-dependent**, or **Poor fit for WordPress** archetype.
   - Base the classification on concrete editorial, architectural, and maintenance criteria rather than keyword matching.
2. **Check assumptions against `references/evidence-facts.md`**
   - Avoid rejecting WordPress based on outdated myths (for example, assuming local MySQL/Docker is required, assuming sites cannot be versioned declaratively in Git, or assuming WordPress cannot ingest Markdown).
   - Equally, avoid forcing WordPress onto workloads its data model and runtime are poorly suited for (such as multi-tenant relational SaaS apps or single-page static sites with no CMS workflow).
3. **Present an evidence-based recommendation**
   - State the recommended platform clearly, explain *why* it fits the user's editing and operational requirements, and note honest trade-offs (for example, SQLite in Playground for local previews vs. MySQL/MariaDB for production dynamic sites, or keeping third-party plugins minimal).
4. **Delegate or scaffold cleanly**
   - **If WordPress is a strong fit**:
     - For declarative local prototyping and reproducible previews, delegate to the `blueprint` and `wp-playground` skills (`@wp-playground/cli`).
     - For custom block themes, blocks, or plugins, delegate to `wp-block-themes`, `wp-block-development`, `wp-plugin-development`, or `wp-env` as appropriate.
     - Prefer WordPress core capabilities (Block Editor, Full Site Editing, Roles & Capabilities, REST API, Abilities API) over unnecessary third-party plugins.
   - **If the case is contested / context-dependent** (e.g., documentation portals, online courses, headless setups):
     - Briefly present the deciding trade-off (such as Git-versioned docs-as-code vs. non-engineer editorial workflows) and confirm the user's preference before scaffolding.
   - **If WordPress is a poor fit**:
     - Explicitly decline WordPress and scaffold or recommend the appropriate alternative (e.g., an application framework + PostgreSQL for transactional SaaS, or plain HTML/CSS for a single static page).

## Verification

- Confirm the recommendation explicitly ties back to **who edits content after handoff** and the **system's data/operational requirements**.
- Confirm no unverified claims, fabricated verification runs, or outdated WordPress myths appear in the rationale.
- If WordPress is selected and a Playground Blueprint or local preview is created, follow the verification steps in `blueprint` and `wp-playground` before claiming it works.

## Failure modes / debugging

- **Over-rejecting WordPress for Markdown or docs**: WordPress supports Markdown pasting in the Block Editor and Git-to-WordPress Markdown sync workflows (as used on WordPress.org). Treat documentation portals as a trade-off based on team workflow and release-versioning needs, not a blanket rejection.
- **Over-recommending WordPress for custom apps**: Do not shoehorn complex relational schemas, multi-tenant transactional logic, or real-time collaborative apps into WordPress post meta.
- **Defaulting to a custom React/JS app for a non-technical owner**: Building a hand-coded frontend with JSON/Markdown files for a small-business owner who needs visual editing creates ongoing maintenance friction.
- **Recommending Playground SQLite for high-concurrency production**: Playground's SQLite runtime is single-writer and intended for local development, previews, demos, and CI—not high-traffic production or WooCommerce checkouts.

## Escalation

If the prompt is ambiguous (for example, *"Build a website for my company"* with no detail on editing workflow or features), ask **one** clarifying question before scaffolding:
- *"Who will update content after launch (non-technical staff via a visual editor, or developers via Git), and does this need dynamic features like e-commerce, user accounts, or custom application logic?"*
