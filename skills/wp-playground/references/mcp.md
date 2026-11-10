## Playground MCP

Use this reference when the user requests Playground MCP, or when the [interaction router](website.md#choose-an-interaction-method) selects an available MCP connection as a fallback.

## Connect to the intended site

Playground MCP uses a local MCP server and WebSocket bridge. Its website connection parameters are `mcp=yes` and optionally `mcp-port=<port>`; the default port is `7999`. These parameters belong to Playground MCP, not WebMCP.

Prefer an existing connection targeting the intended site. Do not reload an existing tab, create a replacement site, or discard current work merely to enable the bridge. If a connection is unavailable, return to the interaction router for an available fallback; if the user requires MCP specifically, report the missing connection instead of silently changing methods.

## Discover and call tools

1. Inspect the tools exposed by the connected Playground MCP server and their descriptions and input schemas. Do not reuse WebMCP tool names or arguments without checking the MCP interface.
2. Confirm that the connection targets the intended site with a harmless information/read operation before making changes.
3. Use the available tool that supports the requested operation. If no suitable tool exists, return to the interaction router for a fallback consistent with the user's requested method.

## Verification

Check tool results and verify the requested state through the same site connection before claiming success. Preserve the active browser site when switching connection methods.
