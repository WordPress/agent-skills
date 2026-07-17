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
- Style text inputs and selects via `styles.elements` (e.g., `styles.elements.input`, `styles.elements.select`).
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

## WordPress 7.0 additions

Keep `theme.json` at version 3. Under `settings.dimensions`, WordPress 7.0 supports reusable dimension presets through `dimensionSizes`. Use the resulting preset values for `width`, `height`, and `min-height` only in controls or block properties that support the corresponding dimension; do not replace unsupported use cases with custom CSS.

Core Button styles can now express interaction states in `theme.json`: `:hover`, `:focus`, `:focus-visible`, and `:active`. Use `:focus-visible` to provide a keyboard-visible focus indicator, and retain the WordPress 6.9 form styling and border-radius presets above as separate guidance.

```json
{
  "version": 3,
  "settings": {
    "dimensions": {
      "dimensionSizes": [
        { "name": "Content", "slug": "content", "size": "40rem" },
        { "name": "Wide", "slug": "wide", "size": "72rem" }
      ]
    }
  },
  "styles": {
    "blocks": {
      "core/button": {
        ":hover": { "color": { "background": "#1e1e1e" } },
        ":focus-visible": { "outline": { "color": "#3858e9", "style": "solid", "width": "2px" } },
        ":active": { "color": { "background": "#000000" } }
      }
    }
  }
}
```

References:

- Border radius presets: https://make.wordpress.org/core/2025/11/12/theme-json-border-radius-presets-support-in-wordpress-6-9/
- Form element styling: https://developer.wordpress.org/news/2025/11/how-wordpress-6-9-gives-forms-a-theme-json-makeover/
