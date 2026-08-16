# `theme.json` guidance

Use this file when changing global settings/styles or per-block styling.

## High-level structure

Common top-level keys:

- `version`
- `settings` (what the UI exposes / allows)
- `styles` (default appearance)
- `customTemplates` and `templateParts` (optional, to describe templates and parts)

Upstream references:

- Theme Handbook: https://developer.wordpress.org/themes/global-settings-and-styles/
- Block Editor Handbook (often more current): https://developer.wordpress.org/block-editor/how-to-guides/themes/theme-json/
- Theme JSON living reference: https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/theme-json-living/
- Theme JSON version 3 (dev note): https://make.wordpress.org/core/2024/06/19/theme-json-version-3/

## Practical guardrails

- Prefer presets when you want editor-visible controls (colors, font sizes, spacing).
- Prefer `styles` when you want consistent defaults without requiring user choice.
- Be careful with specificity: user global styles override theme defaults.

## WordPress 6.9 additions

**Form element styling:**
- Style text inputs and selects via `styles.elements.textInput` and `styles.elements.select`.
- `textInput` targets `<textarea>` and `<input>` elements whose `type` is one of: email, number, password, search, text, tel, url.
- There is no `input`, `checkbox`, `radio`, or `label` element key.
- Supports border, color, outline, shadow, and spacing properties.
- Note: Focus state styling is not yet available in 6.9.

**Border radius presets:**
- Define presets in `settings.border.radiusSizes` for visual selection in the border radius control.
- Users can still enter custom values.

```json
{
  "settings": {
    "border": {
      "radiusSizes": [
        { "name": "Small", "slug": "small", "size": "4px" },
        { "name": "Medium", "slug": "medium", "size": "8px" },
        { "name": "Large", "slug": "large", "size": "16px" }
      ]
    }
  }
}
```

**Button pseudo-classes:**
- Style Button block hover and focus states directly in theme.json.
- No longer requires custom CSS for simple button state styling.

References:

- Border radius presets: https://make.wordpress.org/core/2025/11/12/theme-json-border-radius-presets-support-in-wordpress-6-9/
- Form element styling: https://developer.wordpress.org/news/2025/11/how-wordpress-6-9-gives-forms-a-theme-json-makeover/

## Slug normalisation gotcha

> **Slug normaliser trap (silent failure).** WordPress inserts hyphens inside preset/custom slugs before emitting CSS vars: slug `3xl` becomes `--wp--preset--font-size--3-xl`; slug `cardShadow` becomes `--wp--custom--card-shadow`. A handwritten reference to the *un-normalised* form (e.g. `var(--wp--preset--font-size--3xl)`) resolves to nothing and silently falls back to the second `var()` argument.

Before assembling the variable name, `WP_Theme_JSON` passes each preset/custom slug through `_wp_to_kebab_case()`, which splits it into word tokens — at digit/letter boundaries, camelCase transitions, and non-alphanumeric characters — lowercases them, and joins with `-`. Reference the emitted form, not the slug you typed.

Grep pattern to catch un-normalised references in CSS/SCSS/PHP/JS:

```
var\(\s*--wp--(?:preset|custom)--[a-z-]+--\d+[a-z]
```

This matches a digit immediately followed by a letter inside the variable name (`3xl`, `2xs`, `4x-large`) — every emitted form keeps the hyphen (`3-xl`, `2-xs`, `4-x-large`) and is correctly not flagged.
