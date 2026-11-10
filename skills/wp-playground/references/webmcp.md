## WebMCP site tools

Use this reference when interacting with the open Playground page through callable WebMCP tools. For setup or connection-method selection, use [website workflows](website.md).

## Discover and call tools

1. Use the intended Playground tab, wait for WordPress to load, and discover the site's tools through the browser environment's tool discovery mechanism (sometimes called **Site tools**).
2. Inspect each discovered tool's description and input schema before calling it. Do not assume that Playground MCP and WebMCP expose identical interfaces.
3. Confirm the target site with a harmless information/read operation, then use the discovered tool for the requested operation.

WebMCP exposes tools through the open webpage. It does not require the local Playground MCP server, its WebSocket bridge, or `mcp=yes`.

Examples to look for during discovery include:

| Purpose | Example WebMCP tools |
| --- | --- |
| Site information and persistence | `playground_get_site_info`, `playground_list_sites`, `playground_rename_site`, `playground_save_in_browser` |
| PHP and WordPress requests | `playground_execute_php`, `playground_request` |
| Navigation | `playground_navigate`, `playground_get_current_url` |
| Filesystem operations | `playground_read_file`, `playground_write_file`, `playground_list_files`, `playground_mkdir` |

Use the discovered tool set as the source of truth. Playground can also proxy tools registered by plugins inside the WordPress iframe onto the outer page; rediscover tools after navigation or a site switch when needed. A WordPress ability registration alone does not make it a WebMCP tool.

Background: [WordPress Playground and WebMCP: bringing AI agents into your browser workflow](https://make.wordpress.org/playground/2026/09/05/wordpress-playground-and-webmcp-bringing-ai-agents-into-your-browser-workflow/).

## Unsupported operations

If WebMCP is unavailable or lacks an operation, return to the [interaction router](website.md#choose-an-interaction-method) and read the selected fallback reference. Preserve the intended site when changing methods; do not create a replacement or reload away current work.

## Verification

Check tool results and verify the requested state in the same site before claiming success. After navigation or a site switch, confirm the active site and rediscover tools when needed.
