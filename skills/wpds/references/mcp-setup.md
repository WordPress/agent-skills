# WPDS MCP Server Setup

The WordPress Design System MCP server is published as [`@wordpress/design-system-mcp`](https://github.com/WordPress/gutenberg/tree/trunk/packages/design-system-mcp) (from WordPress Gutenberg).

> **Note:** The earlier `Automattic/wpds-mcp` repository is archived and superseded by `@wordpress/design-system-mcp`. `@wordpress/design-system-mcp` is marked experimental by upstream and requires **Node.js 22.13.0 or newer**.

## Client configuration

### Claude Code

```bash
claude mcp add wordpress-design-system -- npx -y --ignore-scripts --min-release-age=2 @wordpress/design-system-mcp@latest
```

### OpenAI Codex

With the [Codex CLI](https://developers.openai.com/codex/cli) installed:

```bash
codex mcp add wordpress-design-system -- npx -y --ignore-scripts --min-release-age=2 @wordpress/design-system-mcp@latest
```

### VS Code, Cursor, Claude Desktop, and other `mcp.json` clients

Add the server to your client's MCP configuration (`mcp.json` or equivalent):

```json
{
	"mcpServers": {
		"wordpress-design-system": {
			"command": "npx",
			"args": [
				"-y",
				"--ignore-scripts",
				"--min-release-age=2",
				"@wordpress/design-system-mcp@latest"
			]
		}
	}
}
```

For client-specific configuration paths, see:

- [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers#_configure-the-mcpjson-file)
- [Claude Desktop local servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers#installing-the-filesystem-server) (substitute the `mcpServers` entry above)
- [Cursor MCP installation](https://github.com/WordPress/gutenberg/tree/trunk/packages/design-system-mcp#cursor)

## Verification

After adding the server and restarting/reloading your MCP client, verify that the `wordpress-design-system` server exposes these read-only tools:

- `get_patterns` — list WPDS interaction patterns
- `get_pattern_details` — fetch guidance for one or more pattern slugs
- `get_components` — list available WPDS components (`@wordpress/ui`, `@wordpress/components`, `@wordpress/admin-ui`)
- `get_component_details` — fetch props, usage examples, and import statements for one or more components
- `get_design_tokens` — fetch `--wpds-*` design tokens (`@wordpress/theme`)
