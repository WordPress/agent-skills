---
name: wp-admin-ui
description: "Use when building WordPress admin interfaces: menu and submenu pages, options pages via Settings API, data tables (WP_List_Table or @wordpress/dataviews), schema-driven forms (@wordpress/dataform), meta boxes, and dashboard widgets. Covers both classic PHP and modern React paradigms."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Classic approach works on all versions; @wordpress/dataviews and @wordpress/dataform require WP 6.6+."
---

# WP Admin UI

## When to use

Use this skill when:

- registering admin menu pages or submenu pages
- building options/settings pages
- displaying tabular data in the admin (list tables, data views)
- building admin forms (Settings API or @wordpress/dataform)
- adding meta boxes to post/page editors
- creating dashboard widgets

## Inputs required

- Repo root and target plugin (path to main plugin file).
- WordPress version (determines whether @wordpress/dataviews is available — 6.6+).
- Whether the page is top-level menu or submenu, and required capability.
- For list tables: data source (custom DB table, posts, options, REST endpoint).
- For React-based UI: whether @wordpress/scripts build tooling is present.

## Procedure

### 0) Triage and detect project

1. Run triage:
   - `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. Detect plugin headers:
   - `node skills/wp-plugin-development/scripts/detect_plugins.mjs`
3. Check WordPress version to decide classic vs modern path:
   - WP < 6.6 → classic only (PHP, WP_List_Table)
   - WP 6.6+ → modern path available (@wordpress/dataviews, @wordpress/dataform)

### 1) Register admin pages

- Use `add_menu_page()` for top-level entries; `add_submenu_page()` for children.
- Always pass the minimum required capability (`manage_options` for site-wide settings, narrower caps for scoped tools).
- Hook registration on `admin_menu`.
- Gate the callback body immediately with `current_user_can()` before rendering anything.

See:
- `references/admin-menus.md`

### 2a) Classic: Settings API + WP_List_Table

For options pages:

- Register each option with `register_setting()` and a `sanitize_callback`.
- Group with `add_settings_section()` and `add_settings_field()`.
- Render using `settings_fields()` + `do_settings_sections()` inside a `<form>` posting to `options.php`.
- Verify nonce via `check_admin_referer()` in any custom save handler.

For tabular data:

- Extend `WP_List_Table`; implement `get_columns()`, `prepare_items()`, and `column_default()`.
- Add bulk action support via `get_bulk_actions()` and `process_bulk_action()`.
- Always verify nonce + capability before processing bulk actions.

See:
- `references/settings-api.md`
- `references/list-table.md`

### 2b) Modern: @wordpress/dataviews + @wordpress/dataform (WP 6.6+)

For data tables with filtering, sorting, and bulk actions:

- Use `<DataViews>` from `@wordpress/dataviews` with a `data` array and `fields` config.
- Connect to a REST API endpoint for data fetching (`@wordpress/api-fetch`).
- Define `actions` for row-level and bulk operations; gate each action with a server-side capability check.

For schema-driven forms:

- Use `<DataForm>` from `@wordpress/dataviews` with a `schema` matching registered REST fields or meta.
- Wire `onChange` to local state; submit via `apiFetch` with nonce header (`X-WP-Nonce`).

See:
- `references/dataviews.md`

### 3) Meta boxes (if needed)

- Register with `add_meta_box()`; hook on `add_meta_boxes`.
- Output a nonce field with `wp_nonce_field()` inside the render callback.
- Save on `save_post`; verify nonce, capability (`edit_post`), and auto-save guard before writing.

See:
- `references/meta-boxes.md`

### 4) Security baseline (always)

- Capability check before any output or data write.
- Nonce verification before processing any form submission or action.
- Escape all output: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()` as appropriate.
- Sanitize all input before saving: `sanitize_text_field()`, `absint()`, `wp_kses_post()`, etc.

See:
- `references/security.md`

## Verification

- Admin page appears in the correct menu location for users with the required capability and is absent for users without it.
- Settings save and reload correctly; sanitization callbacks run.
- Nonce verification passes on valid submission and blocks forged requests.
- List table or DataViews displays correct data with working sort, filter, and bulk actions.
- No PHP notices or JS console errors on page load.

## Failure modes / debugging

- **Page not appearing in menu:** hook not on `admin_menu`, capability too restrictive, or `add_menu_page()` called too early.
- **Settings not saving:** option not registered with `register_setting()`, wrong option group in `settings_fields()`, or sanitize callback returning `null`.
- **Nonce failure on Settings API form:** using a custom POST handler instead of `options.php` without adding `settings_fields()`.
- **WP_List_Table blank:** `prepare_items()` not called, `$_column_headers` not set, or `set_pagination_args()` missing.
- **DataViews not rendering:** `@wordpress/dataviews` not enqueued, missing REST nonce, or `data` prop is not a plain array.
- **Meta box data not saving:** missing `save_post` hook, auto-save not guarded, or nonce field name mismatch.

## Escalation

Consult the Plugin Handbook (Admin Menus, Settings API, Meta Boxes) and the Block Editor Handbook (@wordpress/dataviews) before inventing patterns. For multisite capability nuances, see `wp-wpcli-and-ops`.
