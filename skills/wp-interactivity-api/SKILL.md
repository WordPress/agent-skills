---
name: wp-interactivity-api
description: "Use when building or debugging WordPress Interactivity API features (data-wp-* directives, @wordpress/interactivity store/state/actions, block viewScriptModule integration, wp_interactivity_*()) including performance, hydration, and directive behavior."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WP Interactivity API

## When to use

Use this skill when the user mentions:

- Interactivity API, `@wordpress/interactivity`,
- `data-wp-interactive`, `data-wp-on--*`, `data-wp-bind--*`, `data-wp-context`,
- block `viewScriptModule` / module-based view scripts,
- hydration issues or "directives don't fire",
- **client-side navigation**, `@wordpress/interactivity-router`, `data-wp-router-region`.

## Inputs required

- Repo root + triage output (`wp-project-triage`).
- Which block/theme/plugin surfaces are affected (frontend, editor, both).
- Any constraints: WP version, whether modules are supported in the build.

## Procedure

### 1) Detect existing usage + integration style

Search for:

- `data-wp-interactive`
- `@wordpress/interactivity`
- `viewScriptModule`

Decide:

- Is this a block providing interactivity via `block.json` view script module?
- Is this theme-level interactivity?
- Is this plugin-side “enhance existing markup” usage?

If you’re creating a new interactive block (not just debugging), prefer the official scaffold template:

- `@wordpress/create-block-interactive-template` (via `@wordpress/create-block`)

### 2) Identify the store(s)

Locate store definitions and confirm:

- state shape,
- actions (mutations),
- callbacks/event handlers used by `data-wp-on--*`.

### 3) Server-side rendering (best practice)

**Pre-render HTML on the server** before outputting to ensure:

- Correct initial state in the HTML before JavaScript loads (no layout shift).
- SEO benefits and faster perceived load time.
- Seamless hydration when the client-side JavaScript takes over.

#### Enable server directive processing

For components using `block.json`, add `supports.interactivity`:

```json
{
  "supports": {
    "interactivity": true
  }
}
```

For themes/plugins without `block.json`, use `wp_interactivity_process_directives()` to process directives.

#### Initialize state/context in PHP

Use `wp_interactivity_state()` to define initial global state:

```php
wp_interactivity_state( 'myPlugin', array(
  'items'    => array( 'Apple', 'Banana', 'Cherry' ),
  'hasItems' => true,
));
```

For local context, use `wp_interactivity_data_wp_context()`:

```php
<?php
$context = array( 'isOpen' => false );
?>
<div <?php echo wp_interactivity_data_wp_context( $context ); ?>>
  ...
</div>
```

#### Define derived state in PHP

When derived state affects initial HTML rendering, replicate the logic in PHP:

```php
wp_interactivity_state( 'myPlugin', array(
  'items'    => array( 'Apple', 'Banana' ),
  'hasItems' => function() {
    $state = wp_interactivity_state();
    return count( $state['items'] ) > 0;
  }
));
```

This ensures directives like `data-wp-bind--hidden="!state.hasItems"` render correctly on first load.

For detailed examples and patterns, see `references/server-side-rendering.md`.

### 4) Implement or change directives safely

When touching markup directives:

- keep directive usage minimal and scoped,
- prefer stable data attributes that map clearly to store state,
- ensure server-rendered markup + client hydration align.

**WordPress 6.9 changes:**

- **`data-wp-ignore` is deprecated** and will be removed in future versions. It broke context inheritance and caused issues with client-side navigation. Avoid using it.
- **Unique directive IDs**: Multiple directives of the same type can now exist on one element using the `---` separator (e.g., `data-wp-on--click---plugin-a="..."` and `data-wp-on--click---plugin-b="..."`).
- **New TypeScript types**: `AsyncAction<ReturnType>` and `TypeYield<T>` help with async action typing.

For quick directive reminders, see `references/directives-quickref.md`.

### 5) Build/tooling alignment

Verify the repo supports the required module build path:

- if it uses `@wordpress/scripts`, prefer its conventions.
- if it uses custom bundling, confirm module output is supported.

### 6) Client-side navigation with the Router

**CRITICAL: The router automatically intercepts `<a>` links. Do NOT add custom click handlers.**

When using `@wordpress/interactivity-router` for SPA-like navigation:

1. Enqueue the router: `wp_enqueue_script_module('my-nav', '...', ['@wordpress/interactivity', '@wordpress/interactivity-router'])`
2. **Mark module as compatible (WordPress 6.9+ REQUIRED):**
   ```php
   wp_interactivity()->add_client_navigation_support_to_script_module('my-nav');
   ```
3. Add `data-wp-router-region="region-id"` to the content area to be swapped
4. Use **plain `<a href="...">` links** - NO `data-wp-on--click` handlers!

The router automatically:
- Intercepts all same-origin link clicks
- Fetches the target page
- Swaps ONLY the matching router region content
- Updates browser URL via History API

**WordPress 6.9+ CRITICAL:** Script modules must be marked as compatible with client-side navigation:
- For blocks: use `"supports": { "interactivity": { "clientNavigation": true } }` in block.json
- For manual modules: call `wp_interactivity()->add_client_navigation_support_to_script_module('module-id')`

Without this, the router will NOT intercept link clicks. The script tag must have `data-wp-router-options` attribute.

Reference: https://make.wordpress.org/core/2025/11/12/interactivity-apis-client-navigation-improvements-in-wordpress-6-9/

**Common mistake:** Adding `data-wp-on--click="actions.navigate"` to nav elements. This breaks the router. Remove it.

See `references/router.md` for full details.

### 7) Debug common failure modes

If "nothing happens" on interaction:

- confirm the `viewScriptModule` is enqueued/loaded,
- confirm the DOM element has `data-wp-interactive`,
- confirm the store namespace matches the directive's value,
- confirm there are no JS errors before hydration.

If client-side **navigation** isn't working:
- confirm `@wordpress/interactivity-router` is enqueued,
- confirm `data-wp-router-region` exists on both source and target pages with SAME ID,
- **confirm script module has `data-wp-router-options` attribute** (WP 6.9+) - if missing, call `wp_interactivity()->add_client_navigation_support_to_script_module('your-module')`,
- **remove any custom `data-wp-on--click` handlers from navigation links**,
- links should be plain `<a href>` tags.

See `references/debugging.md` and `references/router.md`.

## Verification

- `wp-project-triage` indicates `signals.usesInteractivityApi: true` after your change (if applicable).
- Manual smoke test: directive triggers and state updates as expected.
- If tests exist: add/extend Playwright E2E around the interaction path.

## Failure modes / debugging

- Directives present but inert:
  - view script not loading, wrong module entrypoint, or missing `data-wp-interactive`.
- Hydration mismatch / flicker:
  - server markup differs from client expectations; simplify or align initial state.
  - derived state not defined in PHP: use `wp_interactivity_state()` with closures.
- Initial content missing or wrong:
  - `supports.interactivity` not set in `block.json` (for blocks).
  - `wp_interactivity_process_directives()` not called (for themes/plugins).
  - state/context not initialized in PHP before render.
- Layout shift on load:
  - derived state like `state.hasItems` missing on server, causing `hidden` attribute to be absent.
- Performance regressions:
  - overly broad interactive roots; scope interactivity to smaller subtrees.
- Client-side navigation issues (WordPress 6.9):
  - `getServerState()` and `getServerContext()` now reset between page transitions—ensure your code doesn't assume stale values persist.
  - Router regions now support `attachTo` for rendering overlays (modals, pop-ups) dynamically.

## Escalation

- If repo build constraints are unclear, ask: "Is this using `@wordpress/scripts` or a custom bundler (webpack/vite)?"
- Consult:
  - `references/router.md` - **READ THIS FIRST for navigation issues**
  - `references/server-side-rendering.md`
  - `references/directives-quickref.md`
  - `references/debugging.md`
