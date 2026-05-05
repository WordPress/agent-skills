# Respira tool inventory (by category)

Respira exposes 250+ tools across the WordPress and WooCommerce surface. The agent never needs to know all of them — pick from the category that matches the user's intent.

The full live catalog (with parameters, return shapes, and per-builder coverage) is published at
`https://www.respira.press/dashboard/skills` and the source of truth is the MCP server at
`https://github.com/respira-press/respira-wordpress-mcp-server`.

## Discovery

| Tool | Use when |
|---|---|
| `respira_get_site_context` | First call. WP version, theme, plugins, site URL, capabilities. |
| `respira_get_builder_info` | Second call. Active page builder, version, supported modules. |
| `respira_get_server_compatibility` | Plugin and MCP server version compatibility check. |
| `respira_list_sites` / `respira_switch_site` | Multi-site (agency) accounts only. |

## Find

| Tool | Use when |
|---|---|
| `respira_find_element` | Search a page by text, CSS class, widget type, or element ID. Best for targeted edits. |
| `respira_find_builder_targets` | List every editable widget on a page without the full payload. |
| `respira_list_pages` / `respira_list_posts` | Find a page or post by title or search term. |
| `respira_list_custom_posts` | Custom post types. |
| `respira_list_taxonomies` / `respira_list_terms` | Categories, tags, custom taxonomies. |

## Read

| Tool | Use when |
|---|---|
| `respira_read_page` / `respira_read_post` | Full content + meta + builder info for one page or post. |
| `respira_extract_builder_content` | Full page structure as JSON. Use when the layout matters. |
| `respira_get_custom_post` / `respira_get_user` / `respira_get_media` / `respira_get_menu` | Single record reads for the matching resource type. |
| `respira_get_option` / `respira_list_options` | WordPress options API. |

## Write — single

| Tool | Use when |
|---|---|
| `respira_update_element` | Patch one element's settings/content. Builder-aware. |
| `respira_update_module` | Patch one module on Divi / Elementor / Bricks pages with a path-based identifier. |
| `respira_update_page` / `respira_update_post` | Update post-level fields (title, slug, status, meta). |
| `respira_update_user` / `respira_update_term` / `respira_update_menu_item` | Single-record updates for the matching resource type. |
| `respira_apply_builder_patch` | Surgical patch on a builder field by selector. |

## Write — batch

| Tool | Use when |
|---|---|
| `respira_batch_update` | Multiple edits on the same page. Atomic — extract once, apply, inject once. |
| `respira_update_media_batch` | Bulk alt-text / caption / filename rewrites. |
| `respira_bulk_pages_operation` | Bulk publish / draft / trash with `dry_run: true` previews. |

## Structural

| Tool | Use when |
|---|---|
| `respira_move_element` / `respira_reorder_elements` | Rearrange elements within or between containers. |
| `respira_duplicate_element` | Copy a section / widget. |
| `respira_remove_element` | Delete an element. |
| `respira_inject_builder_content` | Surgical insertion of new builder JSON into a page. |
| `respira_build_page` | Build a complete new page from a structured spec. |
| `respira_convert_html_to_builder` | Convert raw HTML to native builder JSON (Elementor, Divi, Bricks, Gutenberg). |

## Snapshots + safety

| Tool | Use when |
|---|---|
| `respira_create_page_duplicate` / `respira_create_post_duplicate` | Always before a non-trivial edit. The user reviews the duplicate, then promotes it. |
| `respira_list_snapshots` | Show change history for a resource. |
| `respira_get_snapshot` | Read one snapshot. |
| `respira_diff_snapshots` | Diff between two snapshots (or one snapshot vs current). |
| `respira_restore_snapshot` | Revert. |

## Audit + analysis

| Tool | Use when |
|---|---|
| `respira_analyze_seo` / `respira_check_seo_issues` | Generic SEO score + issue list. |
| `respira_analyze_rankmath` | Rank Math-specific score and recommendations. |
| `respira_analyze_aeo` | Answer Engine Optimization. |
| `respira_analyze_readability` | Reading-level + clarity score. |
| `respira_check_structured_data` | Schema.org markup validation. |
| `respira_analyze_images` | Missing alts, oversized, format suggestions. |
| `respira_analyze_performance` / `respira_get_core_web_vitals` | LCP / INP / CLS, Server-Timing breakdown. |
| `respira_scan_page_accessibility` | WCAG 2.2 axe-core scan. |
| `respira_get_accessibility_scan` / `respira_list_accessibility_scans` | Read past scans. |
| `respira_apply_accessibility_fixes` | Apply scan-suggested fixes (requires accessibility add-on). |

## Media

| Tool | Use when |
|---|---|
| `respira_list_media` / `respira_get_media` / `respira_update_media` / `respira_delete_media` | Media library CRUD. |
| `respira_upload_media` / `respira_sideload_image` | Upload local file or sideload from URL. |
| `respira_search_stock_images` | Free stock image search (Pexels / Unsplash). |
| `respira_add_stock_image` | Pick a stock image and insert it via the active builder's image module. |

## Builder-specific add helpers

When building a page from scratch, prefer `respira_build_page` with a structured spec. For one-off additions, the per-widget helpers exist for every common module type: `respira_add_section`, `respira_add_heading`, `respira_add_text`, `respira_add_image`, `respira_add_button`, `respira_add_form`, `respira_add_gallery`, `respira_add_video`, `respira_add_accordion`, `respira_add_tabs`, `respira_add_pricing_table`, `respira_add_testimonial`, `respira_add_counter`, `respira_add_progress_bar`, `respira_add_icon`, `respira_add_icon_list`, `respira_add_social_icons`, `respira_add_search`, `respira_add_menu`, `respira_add_map`, `respira_add_alert`, `respira_add_divider`, `respira_add_spacer`, `respira_add_html`, `respira_add_sidebar`, `respira_add_slider`, `respira_add_toggle`. Each is builder-aware and takes builder-native settings.

## WooCommerce

When the active site has WooCommerce + the Respira WooCommerce add-on, an additional ~25 tools are exposed: product CRUD, variations, attributes, categories, tags, orders, customers, coupons, taxonomies, plus storefront-design tools (`respira_woo_*`). Use `respira_get_site_context` to detect WooCommerce, then ask the user before invoking — Respira gates these behind the add-on subscription.

## Plugins

| Tool | Use when |
|---|---|
| `respira_list_plugins` / `respira_install_plugin` / `respira_activate_plugin` / `respira_deactivate_plugin` / `respira_update_plugin` / `respira_delete_plugin` | Plugin lifecycle. Prefer install-then-activate for safety. |
