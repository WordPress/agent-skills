---
name: wpds
description: "Use when building UIs leveraging the WordPress Design System (WPDS) and its components, tokens, patterns, etc."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). WPDS MCP is preferred when available; official WordPress component/package sources are the fallback."
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

### Check the WPDS MCP server before choosing sources

1. Check whether the WPDS MCP resources (`wpds://pages`, `wpds://components`, `wpds://design-tokens`) are available.
2. If available, use them as the canonical component/token source:
  - reference site (`wpds://pages`)
  - list of available components (`wpds://components`) and specific component information (`wpds://components/:name`)
  - list of available tokens (`wpds://design-tokens`)
3. If the WPDS MCP server is unavailable, state that MCP-only resources could not be queried (including pages, component records, and token lists) and use only official WordPress sources:
   - [Component Reference](https://developer.wordpress.org/block-editor/reference-guides/components/)
   - [`@wordpress/components` package reference](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-components/)
   - [Gutenberg Storybook](https://wordpress.github.io/gutenberg/)
   - [`@wordpress/ui` tagged package source](https://github.com/WordPress/gutenberg/tree/trunk/packages/ui)
4. In fallback mode, verify every component prop and token against a cited official page or installed package type/source. Do not invent undocumented APIs or token names.

For version-specific fallback evidence, use the source tag that matches the installed package version rather than assuming trunk behavior.

### Required documentation

Before working on any WPDS-related task, follow the source decision above and read the relevant available documentation. When MCP is available, its resources take precedence; otherwise, disclose the narrower MCP-only evidence and rely on the listed official fallback sources.

### Boundaries

- Skip non-UI related aspects of an answer (for example, fetching data from stores, or localizing strings of text).
- Focus on building UI that adheres as much as possible to the WPDS best practices, uses the most fitting WPDS components/tokens/patterns.

### Tech stack

- Unless you are told otherwise (or gathered specific information from the local context of the request), assume the following tech stack: TypeScript, React, CSS.

### Validation

- If the local context in which a task is running provide lint scripts, use them to validate the proposed code output when possible.

## Verification

- Every component used exists in the WPDS component list (`wpds://components`); no invented or deprecated components.
- Design values reference WPDS tokens (`wpds://design-tokens`) rather than hard-coded colors, spacing, or font sizes.
- The proposed solution was checked against the reference site (`wpds://pages`) documentation for the components involved.
- Accessibility affordances (labels, roles, keyboard handling) follow each component's documented guidance.
- If the local project provides lint scripts, they pass on the proposed code.

## Output

- As a recap at the end of your response, provide a clear and concise explanation of what the solution does, and add context to why each decision was made.
- Be explicit about the boundaries, ie. what was explicitly left out of the task because not relevant (eg non-ui related).
- Provide working code snippets
