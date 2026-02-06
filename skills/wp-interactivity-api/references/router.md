# Interactivity Router (`@wordpress/interactivity-router`)

## Key Concept: Automatic Link Interception

**The router automatically intercepts ALL same-origin `<a>` link clicks.** You do NOT need custom click handlers.

## How It Works

When `@wordpress/interactivity-router` is enqueued and `data-wp-router-region` exists on the page:

1. User clicks any `<a href="...">` link (same-origin)
2. Router intercepts the click automatically (calls `preventDefault`)
3. Fetches the target page via AJAX
4. Finds the matching `data-wp-router-region` on the new page
5. Swaps ONLY that region's innerHTML
6. Updates the browser URL via History API
7. Sidebar, header, footer stay intact

## Required Setup

```php
// 1. Enqueue the router module
wp_enqueue_script_module(
    'my-navigation',
    get_stylesheet_directory_uri() . '/assets/js/navigation.js',
    ['@wordpress/interactivity', '@wordpress/interactivity-router'],
    '1.0.0'
);

// 2. Mark module as compatible with client-side navigation (WordPress 6.9+)
// This is REQUIRED for manually registered script modules!
wp_interactivity()->add_client_navigation_support_to_script_module('my-navigation');
```

```php
// 3. Add router region to the content area (via filter or directly in template)
<main data-wp-interactive="my/namespace" data-wp-router-region="main-content">
    <!-- This content gets swapped on navigation -->
</main>
```

```html
<!-- 4. Use regular links - NO directives needed! -->
<nav>
    <a href="/page-1/">Page 1</a>
    <a href="/page-2/">Page 2</a>
</nav>
```

## WordPress 6.9+ Requirements

**CRITICAL: Script modules must be marked as compatible with client-side navigation.**

For blocks, this is automatic when `block.json` has:
```json
{
  "supports": {
    "interactivity": { "clientNavigation": true }
  }
}
```

For manually registered script modules (themes/plugins), you MUST call:
```php
wp_interactivity()->add_client_navigation_support_to_script_module('my-module');
```

This adds `data-wp-router-options='{"loadOnClientNavigation":true}'` to the script tag.

**Without this, the router will not intercept link clicks.**

Reference: https://make.wordpress.org/core/2025/11/12/interactivity-apis-client-navigation-improvements-in-wordpress-6-9/

## Common Mistakes

### ❌ WRONG: Adding click handlers to links

```html
<!-- DON'T DO THIS -->
<nav data-wp-interactive="my/nav" data-wp-on--click="actions.navigate">
    <a href="/page/">Link</a>
</nav>
```

```javascript
// DON'T DO THIS
store('my/nav', {
    actions: {
        navigate(e) {
            e.preventDefault();
            routerActions.navigate(e.target.href);
        }
    }
});
```

### ✅ CORRECT: Plain links, router does the work

```html
<!-- DO THIS -->
<nav>
    <a href="/page/">Link</a>
</nav>
```

```javascript
// Just register an empty store if needed, or don't register one at all
import { store } from '@wordpress/interactivity';
store('my/namespace', {});
```

## When You DO Need Custom Handlers

Only use custom navigation handlers for:

- Non-link elements (buttons, divs) that should navigate
- Conditional navigation (confirm dialogs, form validation)
- Links that need special processing before navigation

```javascript
// Example: Button that navigates
store('my/namespace', {
    actions: {
        *navigateToProfile() {
            const { actions } = yield import('@wordpress/interactivity-router');
            yield actions.navigate('/profile/');
        }
    }
});
```

## Debugging

If navigation isn't working:

1. **Check router is enqueued**: View page source, search for `interactivity-router`
2. **Check region exists**: Search HTML for `data-wp-router-region`
3. **Check target page has same region ID**: Both pages need matching region IDs
4. **Check for custom handlers**: Remove any `data-wp-on--click` from nav elements
5. **Check console errors**: Router logs navigation events
6. **Check script module has router options (WP 6.9+)**: Your script tag should have `data-wp-router-options` attribute. If missing, call `wp_interactivity()->add_client_navigation_support_to_script_module('your-module')`

## Multiple Router Regions

You can have multiple independent regions:

```html
<aside data-wp-router-region="sidebar">...</aside>
<main data-wp-router-region="main">...</main>
```

Each region swaps independently based on the target page's matching regions.
