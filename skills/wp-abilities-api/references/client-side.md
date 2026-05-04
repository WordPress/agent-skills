# Client-side Abilities API (WP 7.0+)

WordPress 6.9 introduced the server-side Abilities API. WordPress 7.0 added the JavaScript counterpart, letting plugins register and execute abilities entirely on the client (e.g., navigating, inserting blocks) and consume server-registered abilities from JS.

## Two packages, one store

- **`@wordpress/abilities`** — pure state management, no server dependencies. Provides the store, registration, querying, and execution. Use when you only need the store; works in non-WordPress contexts too.
- **`@wordpress/core-abilities`** — the WordPress integration layer. When loaded, it auto-fetches all server-registered abilities and categories via `/wp-abilities/v1/` and registers them in the `@wordpress/abilities` store with execution callbacks. Use this for the common case.

## Enqueuing

### Server abilities + client UI (most common)

```php
add_action( 'admin_enqueue_scripts', function () {
    wp_enqueue_script_module( '@wordpress/core-abilities' );
} );
```

This loads `@wordpress/core-abilities` plus its dependency `@wordpress/abilities`, and the server abilities show up in the store automatically. WordPress core enqueues `@wordpress/core-abilities` on all admin pages, so server abilities are available in the admin by default — you don't need to re-enqueue unless you're outside admin.

### Client-only abilities on a specific page

```php
add_action( 'admin_enqueue_scripts', function ( $hook_suffix ) {
    if ( 'my-plugin-page' !== $hook_suffix ) {
        return;
    }
    wp_enqueue_script_module( '@wordpress/abilities' );
} );
```

Skips the server fetch overhead when you only need client-registered abilities on one screen.

## Importing in JS

Dynamic import:

```js
const {
    registerAbility,
    registerAbilityCategory,
    getAbilities,
    executeAbility,
} = await import( '@wordpress/abilities' );
```

Or, if your code is a script module compiled with `@wordpress/scripts`, a normal static import works:

```js
import {
    registerAbility,
    registerAbilityCategory,
    getAbilities,
    executeAbility,
} from '@wordpress/abilities';
```

## Registering a category

Categories must exist before abilities reference them. Server categories load automatically with `@wordpress/core-abilities`. Register client categories explicitly:

```js
const { registerAbilityCategory } = await import( '@wordpress/abilities' );

registerAbilityCategory( 'my-plugin-actions', {
    label: 'My Plugin Actions',
    description: 'Actions provided by My Plugin',
} );
```

Slug rules: lowercase alphanumeric with dashes only (e.g., `data-retrieval`, `user-management`). No underscores, no caps.

## Registering an ability

```js
const { registerAbility } = await import( '@wordpress/abilities' );

registerAbility( {
    name: 'my-plugin/navigate-to-settings',
    label: 'Navigate to Settings',
    description: 'Navigates to the plugin settings page',
    category: 'my-plugin-actions',
    callback: async () => {
        window.location.href = '/wp-admin/options-general.php?page=my-plugin';
        return { success: true };
    },
} );
```

### Input/output schemas (recommended)

JSON Schema (draft-04). Inputs are validated before `callback` runs; outputs are validated after. Validation failures throw `ability_invalid_input` or `ability_invalid_output`.

```js
registerAbility( {
    name: 'my-plugin/create-item',
    label: 'Create Item',
    description: 'Creates a new item with the given title and content',
    category: 'my-plugin-actions',
    input_schema: {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1 },
            content: { type: 'string' },
            status: { type: 'string', enum: [ 'draft', 'publish' ] },
        },
        required: [ 'title' ],
    },
    output_schema: {
        type: 'object',
        properties: {
            id: { type: 'number' },
            title: { type: 'string' },
        },
        required: [ 'id' ],
    },
    callback: async ( { title, content, status = 'draft' } ) => {
        // Implementation...
        return { id: 123, title };
    },
} );
```

### Permission callback

```js
registerAbility( {
    name: 'my-plugin/admin-action',
    label: 'Admin Action',
    description: 'An action only available to administrators',
    category: 'my-plugin-actions',
    permissionCallback: () => currentUserCan( 'manage_options' ),
    callback: async () => ({ success: true }),
} );
```

Returns false → throws `ability_permission_denied`.

## Annotations

Behavioral hints used by the runtime and (importantly) by the MCP Adapter when exposing the ability over MCP:

| Annotation | Type | Description |
| --- | --- | --- |
| `readonly` | boolean | Reads only, no state change |
| `destructive` | boolean | Performs destructive operations |
| `idempotent` | boolean | Same result if called multiple times with same input |

```js
registerAbility( {
    name: 'my-plugin/get-stats',
    label: 'Get Stats',
    description: 'Returns plugin statistics',
    category: 'my-plugin-actions',
    callback: async () => ({ views: 100 }),
    meta: { annotations: { readonly: true } },
} );
```

The MCP Adapter maps these to MCP tool annotations: `readonly` → `readOnlyHint`, `destructive` → `destructiveHint`, `idempotent` → `idempotentHint`. So getting these right pays off for both the local execution surface and any MCP-exposed external surface.

## HTTP method routing for server abilities

When `executeAbility` calls a server-registered ability through the REST API, the HTTP method is chosen from the ability's annotations:

- `readonly: true` → `GET`
- `destructive: true` + `idempotent: true` → `DELETE`
- All other cases → `POST`

This matters for caching, logging, and CSRF posture. A read-only ability should always be marked `readonly` so it gets `GET` and benefits from any HTTP caching layer.

## Querying

```js
const {
    getAbilities,
    getAbility,
    getAbilityCategories,
    getAbilityCategory,
} = await import( '@wordpress/abilities' );

const all      = getAbilities();
const filtered = getAbilities( { category: 'data-retrieval' } );
const one      = getAbility( 'my-plugin/create-item' );
const cats     = getAbilityCategories();
const cat      = getAbilityCategory( 'data-retrieval' );
```

### Reactive queries with `@wordpress/data`

The store registers via `@wordpress/data` and integrates with `useSelect`. Use `useSelect` for reactive queries in React:

```jsx
import { useSelect } from '@wordpress/data';
import { store as abilitiesStore } from '@wordpress/abilities';

function AbilitiesList() {
    const abilities = useSelect(
        ( select ) => select( abilitiesStore ).getAbilities(),
        []
    );
    const dataAbilities = useSelect(
        ( select ) => select( abilitiesStore ).getAbilities( { category: 'data-retrieval' } ),
        []
    );
    // Updates automatically when the store changes.
}
```

Use the imported `store` constant rather than referencing the store by string name. The string key differs by environment: the standalone `WordPress/abilities-api` plugin registers it as `'abilities-api/abilities'`; the WP 7.0 dev note documents it as `'core/abilities'`. Importing `store` sidesteps the discrepancy.

## Executing

```js
import { executeAbility } from '@wordpress/abilities';

try {
    const result = await executeAbility( 'my-plugin/create-item', {
        title: 'New Item',
        content: 'Item content',
        status: 'draft',
    } );
} catch ( error ) {
    switch ( error.code ) {
        case 'ability_permission_denied':
        case 'ability_invalid_input':
        case 'ability_invalid_output':
            // Handle each appropriately.
            break;
        default:
            console.error( 'Execution failed:', error.message );
    }
}
```

`executeAbility` works for both client- and server-registered abilities. For server abilities loaded via `@wordpress/core-abilities`, execution is dispatched over REST automatically using the method derived from annotations.

## Unregistering

```js
const { unregisterAbility, unregisterAbilityCategory } = await import( '@wordpress/abilities' );

unregisterAbility( 'my-plugin/navigate-to-settings' );
unregisterAbilityCategory( 'my-plugin-actions' );
```

Only client-registered abilities and categories can be unregistered from the client. Server-registered ones are removed by unregistering on the server side.

## Sources

- Dev note: https://make.wordpress.org/core/2026/03/24/client-side-abilities-api-in-wordpress-7-0/
- Server-side dev note (WP 6.9): https://make.wordpress.org/core/2025/11/10/abilities-api-in-wordpress-6-9/
- WebMCP context (why this work matters for browser agents): https://github.com/WordPress/ai/pull/224
