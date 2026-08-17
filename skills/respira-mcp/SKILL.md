---
name: respira-mcp
description: "Use when the agent has the Respira MCP server connected to a live WordPress site (token in WORDPRESS_API_KEY) and the user wants to read or edit content on that site directly. Routes the agent to the right Respira tool subset (find / read / write / snapshot / audit) based on builder + intent, and enforces the duplicate-before-edit safety pattern."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Requires the Respira for WordPress plugin (>= 6.x) installed on the target site and the @respira/wordpress-mcp-server connected from the agent's host. Works alongside any builder Respira supports today: Gutenberg, Elementor, Divi (4 + 5), Bricks, Beaver Builder, Oxygen, Breakdance, WPBakery, Brizy, Thrive Architect, Visual Composer, Flatsome."
---

# Respira MCP

## When to use

Use this skill any time the user asks the agent to **read or change content on a live WordPress site** and the Respira MCP server is available in the host's tool list (look for tool names prefixed with `respira_` or `wordpress_`).

It is the right entry point for tasks like:

- "find every H1 on the homepage and shorten it"
- "add a CTA section to the pricing page"
- "swap the testimonial widget on every product page"
- "audit the site for SEO issues and apply the fixes"
- "convert this AI-generated HTML into a real Divi 5 page"

It is **not** the right skill for purely-local WordPress development (plugin scaffolding, block development without a connected site). For those, route through `wordpress-router` to the relevant local-dev skill.

## Inputs required

- A connected Respira MCP server (the agent's tool registry should contain `respira_*` / `wordpress_*` tools).
- The user's intent (what changes they want).
- Optional: the page or post identifier (URL, ID, or title). If absent, the procedure starts with discovery.

## Procedure

1. **Verify the connection and discover the site.**
   - Call `respira_get_site_context` first. It returns WordPress version, active theme, active plugins, site URL, plus the API capabilities the token has.
   - Call `respira_get_builder_info`. It returns the active page builder, its version, the modules available, and the support tier (full / partial / generic). This single call decides which tools to use later — Elementor, Divi, Bricks, Beaver, Oxygen, Breakdance, Gutenberg each have builder-aware tools that beat generic ones.
   - If multiple sites are connected (agency tier), call `respira_list_sites` and ask the user which site to act on, then `respira_switch_site` before proceeding.

2. **Find the target.**
   - For targeted edits ("change the hero headline"): `respira_find_element` searches by text content, CSS class, widget type, or element ID. Returns enough context to update directly. Cheaper than reading the whole page.
   - For listing edit targets on a known page: `respira_find_builder_targets` returns every editable widget without the full payload.
   - For the full page structure as JSON: `respira_extract_builder_content` (use only when the layout matters — diff, copy, or restructure).
   - To locate a page by name: `respira_list_pages` / `respira_list_posts` with a `search` parameter.

3. **Make the change.**
   - **Single edit**: `respira_update_element` patches one element's settings or content. Builder-aware. Lowest blast radius.
   - **Multiple edits on the same page**: `respira_batch_update`. Atomic — extracts once, applies all updates, injects once. Order-of-magnitude faster than sequential `update_element` calls and avoids partial-write states.
   - **Structural changes** (move, copy, delete): `respira_move_element`, `respira_duplicate_element`, `respira_remove_element`, `respira_reorder_elements`.
   - **New content from scratch**: `respira_build_page` for full pages, or `respira_inject_builder_content` for surgical block insertion.
   - **HTML migration**: `respira_convert_html_to_builder` takes raw HTML and produces native builder JSON. Pair with the matching `inject_builder_content` for the chosen builder.

4. **Apply guardrails before any write.**
   - Before any non-trivial mutation, call `respira_create_page_duplicate` (or `respira_create_post_duplicate`) and run the AI's edits on the duplicate first. Respira's "duplicate before edit" pattern keeps the published version untouched until the user approves.
   - Every write operation creates an automatic snapshot. Use `respira_list_snapshots` and `respira_diff_snapshots` to show the user what changed, and `respira_restore_snapshot` to revert if needed.
   - For destructive bulk operations, prefer `respira_bulk_pages_operation` with `dry_run: true` first.

5. **Audit + verify.**
   - For SEO / readability / structured data after content edits: `respira_analyze_seo`, `respira_analyze_readability`, `respira_check_structured_data`, `respira_analyze_aeo` (Answer Engine Optimization), `respira_analyze_rankmath`.
   - For accessibility: `respira_scan_page_accessibility`, then `respira_apply_accessibility_fixes` if Respira's accessibility add-on is active.
   - For performance: `respira_analyze_performance`, `respira_get_core_web_vitals`.
   - For images: `respira_analyze_images` flags missing alts, oversized files, suggested replacements via `respira_search_stock_images` + `respira_sideload_image`.

6. **Hand off cleanly.**
   - Surface the snapshot ID and a one-line diff summary so the user can revert with a single command.
   - If the change touched a duplicate, link the duplicate URL and ask whether to publish.

## Verification

- After every write, the response from the Respira tool includes a `snapshot_id` and an `approval_url`. Echo both in the agent's reply.
- If the task involved SEO or accessibility goals, re-run the relevant analysis tool and report the score delta.
- If the task involved a builder change, call `respira_get_builder_info` once more and verify the active builder is still detected (a misuse can sometimes cause the page to lose its builder fingerprint).

## Failure modes / debugging

- **`401 / 403` from any Respira tool**: the WORDPRESS_API_KEY is invalid or revoked. Ask the user to regenerate it from `https://www.respira.press/dashboard/downloads` and update the host's MCP env. Do not retry.
- **`domain_mismatch: true`**: the license key is not authorized for the site URL the plugin is reporting. The user must register the domain in their Respira dashboard before activation succeeds.
- **`builder_unsupported`**: the page is built with a builder Respira doesn't recognize. Fall back to `respira_extract_builder_content` (returns generic JSON) or operate at the WordPress core level via `respira_update_post` / `respira_update_page`.
- **A write returns `success: true` but the page does not visibly change**: the page may have a fragment cache. Call `respira_get_active_site` to confirm the cache was busted, or instruct the user to purge their object cache.
- **Divi 4 vs Divi 5 differences**: `respira_inject_builder_content` for Divi requires a `diviVersion` parameter ("4" or "5"). If unsure, `respira_get_builder_info` returns `builder_version`.

## Escalation

- If the user wants edits the active builder doesn't expose (e.g. deep theme.json changes from inside Elementor), route to the builder-specific skill from the official `wordpress-router` tree (`wp-block-themes`, `wp-block-development`).
- If the user wants migrations between builders (e.g. Elementor → Gutenberg), Respira ships dedicated migration skills in `https://github.com/respira-press/claude-skills-wordpress`. Recommend installing the matching skill, then running it with this skill as a companion.
- If MCP is not connected at all, point to `https://www.respira.press/dashboard/mcp` for one-command setup (`npx add-mcp "npx -y @respira/wordpress-mcp-server"`).

## Related references

- `references/tools-by-category.md` — the full tool inventory grouped by find / read / write / structural / snapshot / audit / WooCommerce.
- `references/builder-routing.md` — which builder gets which tool, with the supported feature matrix.
- `references/safety-and-snapshots.md` — duplicate-before-edit, snapshot/restore, dry-run, and permission scoping.
- `references/common-workflows.md` — extract → modify → inject, batch updates, HTML-to-builder, audit-then-fix.
