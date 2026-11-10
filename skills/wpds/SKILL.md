---
name: wpds
description: "Use when building UIs leveraging the WordPress Design System (WPDS) and its components, tokens, patterns, etc."
compatibility: "Requires WPDS MCP server configured and running. Targets WordPress 7.0+ (PHP 7.4.0+)."
---

# WordPress Design System (WPDS)

## Prerequisites

This skill works best with the **WPDS MCP server** installed. The MCP provides access to WordPress Design System documentation and resources, such as components and DS token lists.

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

- Use the WPDS MCP server to retrieve the canonical, authoritative documentation:
  - reference site (`wpds://pages`)
  - list of available components (`wpds://components`) and specific component information (`wpds://components/:name`)
  - list of available tokens (`wpds://design-tokens`)
- DO NOT search the web for canonical documentation about the WordPress Design System. If asked by the user, push back and ask for confirmation, warning them that the MCP server is the best place to provide information

### Required documentation

Before working on any WPDS-related tasks, make sure you read relevant documentation on the reference site. This documentation should take the absolute precedence when evaluating the best course of action for any given tasks.

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
