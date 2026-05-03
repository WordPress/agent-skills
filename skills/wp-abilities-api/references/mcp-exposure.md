# Exposing abilities via the MCP Adapter

The MCP Adapter (`WordPress/mcp-adapter`) bridges the Abilities API to the Model Context Protocol, letting external AI agents (Claude Desktop, Claude Code, Cursor, ChatGPT) discover and execute WordPress abilities as MCP tools, resources, and prompts.

The adapter is a separate Composer package and plugin. WordPress 7.0 ships the Abilities API in core but does **not** ship the adapter. Install it explicitly when MCP exposure is required.

## Installation

The adapter is designed to be a Composer dependency, not a standalone plugin install for distributed use:

```bash
composer require wordpress/mcp-adapter
```

Then load it from your plugin's bootstrap. If multiple plugins on the same site depend on the adapter (likely as the ecosystem grows), use the Jetpack Autoloader to avoid version conflicts:

```php
require_once plugin_dir_path( __FILE__ ) . 'vendor/autoloader.php'; // Jetpack Autoloader
```

For local exploration / smoke testing, the standalone plugin zip from the [adapter's Releases page](https://github.com/WordPress/mcp-adapter/releases) is fine. Don't ship that to production with multiple consumers — version conflicts will bite.

## How abilities become MCP tools

Once the adapter is loaded:

1. It reads everything registered via `wp_register_ability()`.
2. By default, abilities become MCP **tools** (callable functions). Read-only abilities can be configured as MCP **resources** (data the agent ingests as context). Abilities with structured prompt-like outputs can be configured as MCP **prompts**.
3. The adapter respects the ability's `permission_callback` — agents can only invoke what the authenticated user is authorized to do.
4. The ability's `input_schema` and `output_schema` translate directly into the MCP tool's input and output schemas.
5. The ability's annotations map to MCP annotations: `readonly` → `readOnlyHint`, `destructive` → `destructiveHint`, `idempotent` → `idempotentHint`.

So a well-shaped ability — namespaced ID, label, description, schemas, permission callback, accurate annotations — becomes a well-shaped MCP tool with no extra work.

## Default server vs custom server

On activation, the adapter registers a default MCP server (`mcp-adapter-default-server`) with three core abilities for inspection and execution:

- `mcp-adapter/discover-abilities` — list all available abilities
- `mcp-adapter/get-ability-info` — inspect a single ability's schema
- `mcp-adapter/execute-ability` — run any ability

(Ability names follow the `namespace/ability` convention — slash, not hyphen, between the two parts. They register inside the `mcp-adapter` ability namespace.)

This is enough for most use cases — point an MCP client at the default server and it can discover and call every server-registered ability on the site.

For finer control (exposing only a subset, separating tool/resource/prompt categorization, server-level metadata), register a custom server. **`create_server()` has 13 parameters in current source (v0.5.0+); the 7th is required and takes an array of transport class names, not a config array.** The signature and convention follow what `DefaultServerFactory::create()` does internally:

```php
use WP\MCP\Core\McpAdapter;
use WP\MCP\Transport\Http\HttpTransport;
use WP\MCP\Infrastructure\ErrorHandling\Implementations\ErrorLogMcpErrorHandler;
use WP\MCP\Infrastructure\Observability\Implementations\NullMcpObservabilityHandler;

add_action( 'mcp_adapter_init', function ( McpAdapter $adapter ) {
    $adapter->create_server(
        'my-plugin-server',                           // server_id
        'my-plugin/v1',                               // server_route_namespace
        'mcp',                                        // server_route
        'My Plugin MCP Server',                       // server_name
        'Tools for managing my plugin',               // server_description
        '1.0.0',                                      // server_version
        array( HttpTransport::class ),                // mcp_transports (required, array of class strings)
        ErrorLogMcpErrorHandler::class,               // error_handler (class string or null)
        NullMcpObservabilityHandler::class,           // observability_handler (optional, class string)
        array(                                        // tools (ability names to expose)
            'my-plugin/list-comments',
            'my-plugin/approve-comment',
            'my-plugin/mark-as-spam',
        ),
        array(),                                      // resources (ability names)
        array(),                                      // prompts (ability names)
        null                                          // transport_permission_callback (defaults to is_user_logged_in)
    );
} );
```

`create_server()` enforces that it can only be called inside the `mcp_adapter_init` action — calling it elsewhere triggers `_doing_it_wrong()`. The function returns either an `McpAdapter` instance or a `WP_Error`.

Read the `create_server()` docblock in `includes/Core/McpAdapter.php` for the complete parameter documentation, and `includes/Servers/DefaultServerFactory.php` for the canonical "how to call it" example.

## Customizing the default server (without replacing it)

Two filters let you tune the default server without writing a custom one:

- **`mcp_adapter_default_server_config`** — receives the default config array and lets you override any of: `server_id`, `server_route_namespace`, `server_route`, `server_name`, `server_description`, `server_version`, `mcp_transports`, `error_handler`, `observability_handler`, `tools`, `resources`, `prompts`. Useful for restricting which abilities the default server exposes.

  ```php
  add_filter( 'mcp_adapter_default_server_config', function ( array $config ): array {
      // Allow-list which abilities the default server exposes.
      $config['tools'] = array( 'core/get-site-info', 'core/get-user-info' );
      return $config;
  } );
  ```

- **`mcp_adapter_create_default_server`** — return `false` to skip default server creation entirely. Use when you want only your custom servers exposed.

  ```php
  add_filter( 'mcp_adapter_create_default_server', '__return_false' );
  ```

## Permalinks requirement

The MCP Adapter's HTTP transport uses REST API endpoints. **Plain permalinks break the routing.** Site owners need to set permalinks to anything other than Plain (Post name is the typical recommendation). If your plugin requires the adapter, document this in your readme and consider a `wp_admin_notice` when Plain is detected:

```php
if ( '' === get_option( 'permalink_structure' ) ) {
    add_action( 'admin_notices', function () {
        echo '<div class="notice notice-warning"><p>';
        esc_html_e( 'My Plugin: change Settings → Permalinks away from Plain to enable MCP.', 'my-plugin' );
        echo '</p></div>';
    } );
}
```

## Authentication for HTTP transport

External agents authenticate via WordPress's standard mechanisms. For Claude Desktop, Cursor, and similar local clients, **Application Passwords** are the practical default:

1. Users → Profile → Application Passwords → create one for "My MCP Server".
2. Copy the generated password (shown once).
3. The MCP client uses it as basic auth or a bearer credential, depending on the client.

For self-hosted scenarios with stricter requirements, the adapter supports JWT and OAuth in different deployments — but the canonical pattern documented in the WordPress.com MCP work is OAuth 2.1 with browser-based authorization. Production setups should use that rather than long-lived application passwords.

## STDIO transport

For local development and CLI integration, the adapter ships a STDIO transport. WP-CLI commands wrap it. This is the right transport for:

- Local Claude Code / Claude Desktop integration via the standard MCP STDIO config
- Testing abilities without setting up auth
- Scripted agent runs against a local site

HTTP transport is the right choice for production, remote sites, and any case where the AI client and the WordPress site aren't on the same machine.

## Verifying the server

A quick way to confirm the MCP server is registered: hit the WordPress REST API root (`/wp-json/`) and look for your server's namespace. If it shows up, the server registered. If it doesn't, the server creation hook didn't fire or the ID conflicted.

For a more thorough check, connect an MCP client (Claude Desktop, MCP Inspector, or similar) and:

1. Confirm the client lists your tools (your registered abilities).
2. Inspect a tool's schema and confirm it matches your `input_schema` declaration.
3. Execute a tool and confirm `permission_callback` enforcement.

## Security posture

MCP clients act as authenticated WordPress users. An overly permissive ability is the same risk as giving an external service the user's credentials.

- **Default-deny.** Don't expose abilities you haven't reviewed for safety. Use a custom server with an explicit allow-list rather than the default server in production.
- **Discipline `permission_callback`.** Every write or destructive ability needs one. Read-only abilities should still have one if they expose anything sensitive.
- **Mark annotations honestly.** `readonly: true` on an ability that actually mutates state misleads both human reviewers and the MCP client's safety logic.
- **Test with an unprivileged user.** If you've been testing as administrator, your permission callbacks are probably under-tested. Create an editor or author user, regenerate an Application Password for them, and verify the client only sees what they're allowed to do.

## Sources

- MCP Adapter repo: https://github.com/WordPress/mcp-adapter
- Adapter releases: https://github.com/WordPress/mcp-adapter/releases
- Developer Blog walkthrough: https://developer.wordpress.org/news/2026/02/from-abilities-to-ai-agents-introducing-the-wordpress-mcp-adapter/
- Make/AI overview of MCP: https://make.wordpress.org/ai/2025/07/17/mcp-adapter/
- Archived predecessor (do not use for new work): https://github.com/Automattic/wordpress-mcp
