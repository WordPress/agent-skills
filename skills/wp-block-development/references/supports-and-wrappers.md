# Supports and wrapper attributes

Use this file when changing `supports` or when your block wrapper styling behaves unexpectedly.

## Canonical references

- Block supports: https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/
- theme.json: https://developer.wordpress.org/block-editor/how-to-guides/themes/global-settings-and-styles/
- `get_block_wrapper_attributes()`: https://developer.wordpress.org/reference/functions/get_block_wrapper_attributes/

## Required wrapper patterns

- In `edit()`, use `useBlockProps()`.
- In `save()`, use `useBlockProps.save()`.
- In dynamic render (PHP), use `get_block_wrapper_attributes()`.

These functions apply the classes and inline styles that WordPress generates from `supports`. Omitting them causes support-driven styles (colors, spacing, typography) to silently fail.

## Recommended default supports for new blocks

New blocks should enable color, typography, and spacing supports unless there is a specific reason not to. This ensures the block integrates with the site's design system and works across themes without custom CSS.

```json
{
  "supports": {
    "color": {
      "background": true,
      "text": true,
      "link": true
    },
    "typography": {
      "fontSize": true,
      "lineHeight": true
    },
    "spacing": {
      "margin": true,
      "padding": true
    }
  }
}
```

**Why this matters:** Themes define palettes, font sizes, and spacing scales in `theme.json`. When a block declares these supports, users can style it using the same controls they use for core blocks. Without supports, users resort to custom CSS or the block ships with hardcoded values that clash with other themes.

## When to add align support

Add `align` support when the block is intended to be used as a top-level layout element that may need wide or full-width presentation:

```json
{
  "supports": {
    "align": [ "wide", "full" ]
  }
}
```

Avoid adding `align` to small inline or nested blocks where width alignment is not meaningful.

## CSS custom properties over hardcoded values

Block styles should reference design tokens from `theme.json` via CSS custom properties rather than hardcoding colors, font sizes, or spacing values.

**Antipattern — hardcoded values:**

```css
.wp-block-example {
  color: #666;
  font-size: 14px;
  padding: 20px;
}
```

**Correct pattern — CSS custom properties:**

```css
.wp-block-example {
  color: var(--wp--preset--color--contrast, #666);
  font-size: var(--wp--preset--font-size--small, 14px);
  padding: var(--wp--preset--spacing--20, 20px);
}
```

The fallback value after the comma ensures the block still renders sensibly if the preset is not defined, but the custom property allows themes to override the value through `theme.json`.

## When supports can eliminate SCSS

If a block's only visual customization is colors, typography, and spacing, `supports` alone may be sufficient — no SCSS or CSS file is needed. WordPress generates the necessary inline styles from the block's attributes.

You still need SCSS or a stylesheet when:

- The block has layout-specific styles (grid, flexbox, positioning).
- The block uses pseudo-elements, animations, or transitions.
- The block requires responsive breakpoints beyond what layout supports provide.
- The block has interactive states (hover, focus) that go beyond color changes.

When in doubt, start with supports only and add a stylesheet when you encounter a styling need that supports cannot express.
