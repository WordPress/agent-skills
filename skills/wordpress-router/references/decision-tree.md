# Router decision tree (v1)

This is a lightweight routing guide. It assumes you can run `wp-project-triage` first.

## Step 1: classify repo kind (from triage)

Use `triage.project.kind` and the strongest signals:

- `wp-core` → treat as WordPress core checkout work (core patches, PHPUnit, build tools).
- `wp-site` → treat as a full site repo (wp-content present; changes might be theme + plugins).
- `wp-block-theme` → theme.json/templates/patterns workflows.
- `wp-theme` → classic theme workflows (templates PHP, `functions.php`, `style.css`).
- `wp-block-plugin` → Gutenberg block development in a plugin (block.json, build pipeline).
- `wp-plugin` / `wp-mu-plugin` → plugin workflows (hooks, admin, settings, cron, REST, security).
- `gutenberg` → Gutenberg monorepo workflows (packages, tooling, docs).

If multiple kinds match, prefer the most specific:
`gutenberg` > `wp-core` > `wp-site` > `wp-block-theme` > `wp-block-plugin` > `wp-theme` > `wp-plugin`.

## Step 2: route by user intent (keywords)

Route by intent even if repo kind is broad (like `wp-site`):

- **Interactivity API / data-wp-* directives / @wordpress/interactivity / viewScriptModule**
  - Route → `wp-interactivity-api`.
- **AI Client / wp_ai_client_prompt / WP_AI_Client_Prompt_Builder / generate_text_result / using_model_preference / WP 7.0 AI**
  - Route → `wp-ai-client`.
- **AI provider plugin / Connectors API / Settings → Connectors / wp_connectors_init / WP_Connector_Registry / wp_get_connector / connectors_ai_*_api_key / `_ai_` prefix**
  - Route → `wp-ai-connectors`.
- **AI plugin (canonical) / WordPress/ai / Abstract_Feature / Experiments framework / WPAI_* / wp_supports_ai / Refine from Notes / dashboard AI widgets / Guidelines integration / ai-wp-admin**
  - Route → `wp-ai-plugin`.
- **Abilities API / wp_register_ability / wp-abilities/v1 / @wordpress/abilities / @wordpress/core-abilities / executeAbility / core/abilities store**
  - Route → `wp-abilities-api`.
- **MCP Adapter / mcp_adapter_init / mcp-adapter-default-server / expose abilities to Claude Desktop / Cursor / ChatGPT via MCP**
  - Route → `wp-abilities-api` (see `references/mcp-exposure.md`).
- **Playground / run-blueprint / build-snapshot / @wp-playground/cli / playground.wordpress.net**
  - Route → `wp-playground`.
- **Blocks / block.json / registerBlockType / attributes / save serialization**
  - Route → `wp-block-development`.
- **theme.json / Global Styles / templates/*.html / patterns/**
  - Route → `wp-block-themes`.
- **Plugins / hooks / activation hook / uninstall / Settings API / admin pages**
  - Route → `wp-plugin-development`.
- **REST endpoint / register_rest_route / permission_callback**
  - Route → `wp-rest-api`.
- **WP-CLI / wp-cli.yml / commands**
  - Route → `wp-wpcli-and-ops`.
- **Build tooling / @wordpress/scripts / webpack / Vite / npm scripts**
  - Route → `wp-build-tooling` (planned).
- **Testing / PHPUnit / wp-env / Playwright**
  - Route → `wp-testing` (planned).
- **PHPStan / static analysis / phpstan.neon / phpstan-baseline.neon**
  - Route → `wp-phpstan`.
- **Performance / caching / query profiling / editor slowness**
  - Route → `wp-performance`.
- **Security / nonces / capabilities / sanitization/escaping / uploads**
  - Route → `wp-security` (planned).

## Step 3: guardrails checklist (always)

- Verify detected tooling before suggesting commands (Composer vs npm/yarn/pnpm).
- Prefer existing lint/test scripts if present.
- If version constraints aren’t detectable, ask for target WP core and PHP versions.
