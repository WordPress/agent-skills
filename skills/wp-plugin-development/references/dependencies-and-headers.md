# Plugin dependencies and header requirements

Use this file when declaring plugin dependencies or auditing the main file header.

## Plugin dependencies (`Requires Plugins`, WordPress 6.5+)

WordPress 6.5 added a `Requires Plugins` header so a plugin can declare the other
plugins it needs. Prefer this over bundling another plugin's code or failing silently.

- Value is a comma-separated list of WordPress.org **slugs** (folder name), e.g. `woocommerce, contact-form-7`.
- Use the slug only. The `my-plugin/my-plugin.php` file path form is **not** supported, and commas inside a slug are not allowed.
- A plugin hosted on WordPress.org may only declare dependencies that are also hosted on WordPress.org. If you depend on a plugin that is not on WordPress.org, do not use this header.

Example main-file header:

```php
/**
 * Plugin Name:      Express Checkout for Shop
 * Requires Plugins: shop, payment-gateway
 */
```

Core enforces dependencies:

- A dependent plugin cannot be installed or activated until its dependencies are installed and active.
- A dependency cannot be deactivated or deleted while a plugin that requires it is active/installed.
- Dependents are deactivated automatically if their requirements become unmet.

Still code defensively: check that a dependency's API exists (e.g. `class_exists()` /
`function_exists()`) before calling it, so the plugin degrades gracefully if loaded
in an unexpected state.

Upstream references:

- Header requirements: https://developer.wordpress.org/plugins/plugin-basics/header-requirements/
- Dev note (WP 6.5): https://make.wordpress.org/core/2024/03/05/introducing-plugin-dependencies-in-wordpress-6-5/

## Standard header requirements

Keep these headers accurate; several of them gate install, activation, and updates:

- `Plugin Name` (required).
- `Requires at least` and `Requires PHP` — block activation on unsupported environments; keep in sync with the code you actually use.
- `Text Domain` — must match the plugin slug for translations; `Domain Path` points at the language files. For WordPress.org-hosted plugins, translations load automatically (no manual `load_plugin_textdomain()` for .org-hosted strings).
- `Update URI` — controls update routing; set it to avoid accidental clashes with the WordPress.org update API when self-hosting.
- `License` / `License URI` — required for WordPress.org; see the `wp-plugin-directory-guidelines` skill for GPL compatibility.

Upstream reference:

- https://developer.wordpress.org/plugins/plugin-basics/header-requirements/
