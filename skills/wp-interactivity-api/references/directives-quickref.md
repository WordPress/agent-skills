# Directives quick reference (high level)

Common directives to recognize in markup:

- `data-wp-interactive`: declares an interactive region (and often a store namespace).
- `data-wp-context`: provides server-rendered context/state.
- `data-wp-on--event`: attaches event handlers (e.g. `click`, `submit`).
- `data-wp-on-async--event`: async event handlers (preferred for most actions).
- `data-wp-bind--attr`: binds DOM attributes to state.
- `data-wp-class--name`: toggles CSS classes based on state.

Use these as search anchors when triaging bugs.

## Unique directive IDs (WordPress 6.9+)

HTML doesn't allow duplicate attributes. To attach multiple handlers of the same type from different plugins, use the `---` separator:

```html
<button
  data-wp-on--click---plugin-a="actions.handleA"
  data-wp-on--click---plugin-b="actions.handleB"
>
```

Both handlers will fire. The ID after `---` must be unique per element.

## Deprecated directive

- **`data-wp-ignore`**: Deprecated in WordPress 6.9. It was intended to prevent hydration of a region but broke context inheritance and client-side navigation. Will be removed in future versions. Avoid using it.

