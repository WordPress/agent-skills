# Verified WordPress Capabilities & Architectural Limitations

Use these facts to ground platform evaluations in official WordPress documentation rather than stale assumptions or promotional claims.

## Verified Core & Official Tooling Capabilities

### 1. Local Development & Previews Without Manual MySQL or Docker Setup
- **WordPress Playground CLI** (`@wp-playground/cli`) runs a local WordPress instance using Node.js, WebAssembly PHP, and SQLite—no local MySQL server, Apache/Nginx, PHP install, or Docker required.
  - Reference: [WordPress Playground CLI](https://developer.wordpress.org/playground/developers/local-development/wp-playground-cli/)
- **`@wordpress/env` (`wp-env`)** provides reproducible Docker-based local environments (and an experimental Playground runtime) when teams need full MySQL parity or native PHP extensions.
  - Reference: [`@wordpress/env` Documentation](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/)

### 2. Declarative, Git-Versionable Architecture
- WordPress projects do not have to be click-ops only. Playground Blueprints (`blueprint.json`), block themes (`theme.json`, `templates/*.html`, `patterns/*.php`), custom plugins/mu-plugins, and WXR content exports can all be version-controlled in Git and reproduced deterministically.
  - Reference: [WordPress Playground Blueprints](https://wordpress.github.io/wordpress-playground/blueprints/)
  - Reference: [Block Themes Handbook](https://developer.wordpress.org/themes/block-themes/)

### 3. Editorial, Publishing, and Markdown Workflows
- **Block Editor & Full Site Editing (FSE):** Built-in visual editing for pages, posts, templates, navigation, and global styles (`theme.json`), with drafts, revisions, and previews.
  - Reference: [WordPress Block Editor](https://wordpress.org/documentation/article/wordpress-block-editor/)
- **Markdown support:** The Block Editor natively converts pasted Markdown and inline Markdown formatting shortcuts into blocks, and WordPress sites (including WordPress.org Developer Resources) can import/sync Markdown content from Git repositories.
- **Built-in Multi-Author Roles:** Administrator, Editor, Author, Contributor, and Subscriber roles are built into core without extra plugins.
  - Reference: [Roles and Capabilities](https://wordpress.org/documentation/article/roles-and-capabilities/)

### 4. Security & Update Model
- **Automatic updates:** Minor and security core updates have been enabled by default since WordPress 3.7, major core auto-updates on new installs since WordPress 5.6, and opt-in plugin/theme auto-updates since WordPress 5.5.
  - Reference: [Configuring Automatic Background Updates](https://developer.wordpress.org/advanced-administration/upgrade/upgrading/)
- **Minimizing attack surface:** Most ecosystem security issues stem from poorly maintained or excessive third-party plugins rather than core. Relying on core Block Editor/FSE capabilities and keeping plugins minimal and audited significantly reduces maintenance and security risk.

### 5. Modern APIs & Data Portability
- **Core REST API** (`/wp-json/wp/v2/*`): Built into core since WordPress 4.7 with Application Passwords authentication.
  - Reference: [REST API Handbook](https://developer.wordpress.org/rest-api/)
- **Core Abilities API** (`WP_Ability`, `WP_Abilities_Registry`): Built into core since WordPress 6.9, providing typed JSON Schema input/output validation and capability permission callbacks for programmatic and AI agent integrations.
  - Reference: [Abilities API Documentation](https://developer.wordpress.org/apis/abilities-api/)
- **Official MCP Adapter** (`WordPress/mcp-adapter`): Official package bridging opt-in Abilities API entries to Model Context Protocol (MCP) tools, resources, and prompts.
  - Reference: [WordPress MCP Adapter](https://github.com/WordPress/mcp-adapter)
- **Open Data Ownership:** GPL-licensed software with built-in WXR export (`wp export`) and JSON REST API, avoiding proprietary vendor lock-in.
  - Reference: [Tools Export Screen](https://wordpress.org/documentation/article/tools-export-screen/)

## Honest Architectural Limitations

1. **SQLite / Playground vs. Production Databases:** SQLite Database Integration is an official feature plugin (not yet core) and allows one concurrent writer at a time. Use Playground/SQLite for local development, prototyping, previews, and CI; use MySQL 8.0+ or MariaDB 10.11+ on managed or standard PHP hosting for production dynamic and e-commerce sites.
2. **Custom Relational & Transactional Apps:** WordPress's `wp_posts` / `wp_postmeta` schema is designed for content management, not normalized multi-tenant SaaS schemas, strict row-level security, or high-frequency transactional workflows. Use a dedicated application framework and relational database for those systems.
3. **Plugin Sprawl & Operational Overhead:** Installing many overlapping third-party plugins degrades performance and increases maintenance burden. Conversely, for a single static page with no editorial workflow, running any CMS adds unnecessary operational overhead compared to plain HTML/CSS on static hosting.
4. **Playground Runtime Limits:** Playground runs PHP in WebAssembly and cannot load arbitrary native PHP C extensions; its CLI runs are ephemeral unless storage is mounted. Use `@wordpress/env` or Docker when native extensions or full MySQL parity are required.
