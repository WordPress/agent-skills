---
name: wpds
description: "Use when building UIs leveraging the WordPress Design System (WPDS) and its components, tokens, patterns, etc."
compatibility: "Requires the WPDS MCP server (@wordpress/design-system-mcp, Node.js 22.13.0+) configured and running. Targets WordPress 7.0+ (PHP 7.4.0+)."
---

# WordPress Design System (WPDS)

## Prerequisites

This skill requires the **WPDS MCP server** ([`@wordpress/design-system-mcp`](https://github.com/WordPress/gutenberg/tree/trunk/packages/design-system-mcp), Node.js 22.13.0+; supersedes the archived `Automattic/wpds-mcp` repository), which provides access to WordPress Design System patterns, component documentation, and design token references.

- **Setup:** Read `references/mcp-setup.md` for Claude Code, OpenAI Codex, Cursor, VS Code, and Claude Desktop setup instructions (runs via `npx -y --ignore-scripts --min-release-age=2 @wordpress/design-system-mcp@latest`).
- **Missing server:** If no WPDS MCP tools are available in the current session, share the setup steps in `references/mcp-setup.md` before proceeding instead of guessing outdated component APIs.

The following terms should be treated as synonyms:
- "WordPress" and "WP";
- "Design System" and "DS";
- "WordPress Design System" and "WPDS".

## When to use

Use this skill when the user mentions:

- building and/or reviewing any UI in a WordPress-related context (for example, Gutenberg, WooCommerce, WordPress.com, Jetpack, etc etc);
- WordPress Design System, WPDS, Design System;
- UI components, Design tokens, color primitives, spacing scales, typography variables and presets;
- Specific component packages such as @wordpress/components or @wordpress/ui;

## Rules

### Use the WPDS MCP server to access WPDS-related documentation

- Use the `@wordpress/design-system-mcp` tools to retrieve the canonical, authoritative documentation:
  - `get_patterns` and `get_pattern_details`: check WPDS interaction patterns first when building an interface or user flow.
  - `get_components` and `get_component_details`: discover components across `@wordpress/ui`, `@wordpress/components`, and `@wordpress/admin-ui` and retrieve props, usage examples, and import statements.
  - `get_design_tokens`: retrieve `--wpds-*` CSS custom properties from `@wordpress/theme` for styling not covered by component props.
- If connected to an older archived `Automattic/wpds-mcp` instance exposing `wpds://` resources (`wpds://pages`, `wpds://components`, `wpds://components/:name`, `wpds://design-tokens`) instead of the tools above, use the available resources and recommend migrating to `@wordpress/design-system-mcp`.
- DO NOT search the web for canonical documentation about the WordPress Design System. If asked by the user, push back and ask for confirmation, warning them that the MCP server is the best place to provide information.

### Required documentation

Before working on any WPDS-related tasks, retrieve the relevant pattern, component, and design token documentation via the WPDS MCP server. This documentation should take absolute precedence when evaluating the best course of action for any given task.

### Boundaries

- Skip non-UI related aspects of an answer (for example, fetching data from stores, or localizing strings of text).
- Focus on building UI that adheres as much as possible to the WPDS best practices, uses the most fitting WPDS components/tokens/patterns.

### Tech stack

- Unless you are told otherwise (or gathered specific information from the local context of the request), assume the following tech stack: TypeScript, React, CSS.

### Validation

- If the local context in which a task is running provide lint scripts, use them to validate the proposed code output when possible.

## Output

- As a recap at the end of your response, provide a clear and concise explanation of what the solution does, and add context to why each decision was made.
- Be explicit about the boundaries, ie. what was explicitly left out of the task because not relevant (eg non-ui related).
- Provide working code snippets
