# WordPress-specific documentation patterns

> **Upstream sources:**
> - [WordPress Plugin Hooks](https://developer.wordpress.org/plugins/hooks/)
> - [WordPress REST API Reference](https://developer.wordpress.org/rest-api/)
>
> This reference provides copy-pasteable templates for documenting WordPress-specific constructs: hooks, REST API endpoints, capabilities, and migration guides. Always defer to the upstream sources for edge cases.

---

## Hook documentation pattern

Hooks (filters and actions) are a core WordPress extension mechanism. Every hook your plugin exposes is a public API contract and must be documented in two places:

1. **User-facing markdown** (in `docs/` or a developer guide) for discoverability
2. **Inline PHPDoc** (in the source file) for developers reading the code

### Markdown format

Use this template in user-facing documentation to describe a hook. Wrap the hook name in backticks as an H3 heading. Include type, version, description, parameters, default value (for filters), and a working code example.

````markdown
### `your_plugin_hook_name`

**Type:** Filter
**Since:** 1.0.0

Description of what the hook does and when it fires. Explain the use case
in plain language so a developer knows whether they need this hook.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `$value` | `string` | The value being filtered. |
| `$context` | `array` | Additional context about the current request. |

**Default:** `'default_value'`

**Example:**

```php
add_filter( 'your_plugin_hook_name', function ( string $value, array $context ): string {
	if ( 'special_case' === $context['type'] ) {
		return 'custom_value';
	}

	return $value;
}, 10, 2 );
```
````

For actions, omit the **Default** line since actions do not return values:

````markdown
### `your_plugin_after_process`

**Type:** Action
**Since:** 1.2.0

Fires after the processing step completes. Use this hook to run
side effects such as logging, cache invalidation, or notifications.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `$item_id` | `int` | The ID of the processed item. |
| `$result` | `array` | The processing result data. |

**Example:**

```php
add_action( 'your_plugin_after_process', function ( int $item_id, array $result ): void {
	error_log( sprintf( 'Processed item %d with status %s', $item_id, $result['status'] ) );
}, 10, 2 );
```
````

### Inline PHPDoc format

Use this template in source code directly above the `apply_filters()` or `do_action()` call. The PHPDoc block documents what the hook does, when it fires, the version it was introduced, and all parameters passed to callbacks.

**Filter (inline PHPDoc):**

```php
/**
 * Filters the output format before rendering.
 *
 * Allows plugins to modify the output format string used when
 * rendering items in the admin list table.
 *
 * @since 1.0.0
 * @since 1.3.0 Added the `$context` parameter.
 *
 * @param string $format  The output format string.
 * @param int    $item_id The current item ID.
 * @param array  $context Additional rendering context.
 */
$format = apply_filters( 'your_plugin_output_format', $format, $item_id, $context );
```

**Action (inline PHPDoc):**

```php
/**
 * Fires after a subscription has been activated.
 *
 * Use this action to trigger welcome emails, provision resources,
 * or update external systems when a subscription becomes active.
 *
 * @since 1.0.0
 *
 * @param int    $subscription_id The subscription ID.
 * @param string $plan_slug       The plan slug (e.g., 'pro', 'enterprise').
 * @param array  $meta            Subscription metadata.
 */
do_action( 'your_plugin_subscription_activated', $subscription_id, $plan_slug, $meta );
```

### Key rules for hook documentation

| Rule | Standard |
|------|----------|
| Placement | PHPDoc directly before the `apply_filters()` / `do_action()` call |
| First `@param` (filters) | Always the value being filtered |
| `@since` | Required; add new entries when parameters change |
| Summary (filters) | "Filters the..." |
| Summary (actions) | "Fires after/before/when..." |
| Markdown heading | Hook name in backticks as H3 |

---

## REST API endpoint documentation pattern

Use this template to document each REST API endpoint your plugin registers. Include the route, HTTP method, authentication requirements, required capability, request parameters, a successful response example, and error responses.

````markdown
### Create item

**Route:** `POST /wp-json/your-plugin/v1/items`
**Authentication:** Required (application password, cookie with nonce, or OAuth)
**Capability:** `edit_posts`

Creates a new item in the system. The item is created in `draft` status
until you explicitly publish it via the update endpoint.

**Request body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | The item name. Maximum 200 characters. |
| `type` | `string` | Yes | The item type. Accepts `'standard'`, `'premium'`. |
| `metadata` | `object` | No | Key-value pairs of additional metadata. |

**Response:** `201 Created`

```json
{
    "id": 42,
    "name": "Example item",
    "type": "standard",
    "status": "draft",
    "metadata": {},
    "created_at": "2026-03-17T12:00:00Z",
    "_links": {
        "self": [
            {
                "href": "https://example.com/wp-json/your-plugin/v1/items/42"
            }
        ]
    }
}
```

**Error responses:**

| Code | HTTP status | Condition |
|------|-------------|-----------|
| `rest_missing_param` | `400` | A required parameter is missing. |
| `rest_invalid_param` | `400` | A parameter value is invalid (see `data.params` for details). |
| `rest_forbidden` | `403` | The authenticated user lacks the required capability. |
| `rest_not_logged_in` | `401` | No authentication credentials provided. |
````

### Key rules for REST API documentation

| Rule | Standard |
|------|----------|
| Route format | Full path including `/wp-json/` prefix and namespace |
| HTTP method | Included in the route line |
| Authentication | State whether required and which methods are accepted |
| Capability | Always document the required capability |
| Parameters | Type, required/optional, description with constraints |
| Response | Include the HTTP status code and a realistic JSON example |
| Error responses | Cover validation errors, auth failures, and not-found cases |

---

## Capability documentation pattern

Every privileged operation in a WordPress plugin must document its capability requirement. This tells developers what permission is needed, how to customize it, and what happens when the check fails.

### Inline format

Use this one-line format when documenting a capability within a broader section (such as an endpoint or admin page description):

````markdown
**Required capability:** `edit_posts` (filterable via `your_plugin_required_capability`)
````

### Expanded format

Use the expanded format when a capability needs more context, such as in a permissions reference page or when the capability logic is complex:

````markdown
### Item management permissions

**Required capability:** `manage_options`
**Filter:** `your_plugin_manage_items_capability`
**Failure behavior:** Returns `WP_Error` with code `rest_forbidden` and HTTP 403 status.

By default, only administrators can manage items. You can customize this
with the `your_plugin_manage_items_capability` filter:

```php
add_filter( 'your_plugin_manage_items_capability', function ( string $capability ): string {
	return 'edit_others_posts';
} );
```

> **Note:** Changing the required capability affects all item management
> operations including create, update, and delete.
````

### Key rules for capability documentation

| Rule | Standard |
|------|----------|
| Always document | Which capability is required |
| Always document | Which filter customizes the capability (if filterable) |
| Always document | What happens when the check fails (error code, HTTP status, user-facing behavior) |
| Code example | Show how to change the capability via the filter |

---

## Migration guide pattern

Use this template when releasing a version that includes breaking changes, significant new features, or internal API changes. Lead with reassurance about what does not break, then cover new features, and finally detail changes that affect advanced users.

````markdown
# Migration guide: version X.Y.Z

Brief summary of what changed and why. One to two sentences that give
readers the high-level picture before diving into details.

## For most users: seamless upgrade

List the public APIs and behaviors that remain unchanged. Lead with
what does NOT break to reassure the majority of users who depend on
stable interfaces.

- The `your_plugin_hook_name` filter continues to work as before.
- All REST API endpoints maintain backward compatibility.
- Configuration stored in `wp_options` is automatically migrated.

## New features

Describe new capabilities introduced in this version. Focus on what
users can now do that they could not do before.

### Feature name

Description of the feature and how to use it.

```php
// Example showing the new feature in action.
$result = your_plugin_new_function( 'example' );
```

## Advanced: internal API changes

> This section only applies if you have extended the plugin's internal
> classes, overridden protected methods, or directly called internal APIs
> marked with `@internal` or `@access private`.

### Change title

**What changed:** One-sentence description of the change.

**Who is affected:** Developers who [specific condition].

**Before (vX.Y-1.Z):**

```php
// Old pattern that no longer works.
$old_service = new Internal_Service();
$old_service->process( $data );
```

**After (vX.Y.Z):**

```php
// New pattern replacing the old approach.
$new_service = your_plugin_get_service( 'processor' );
$new_service->handle( $data );
```

**Migration steps:**

1. Replace `new Internal_Service()` with `your_plugin_get_service( 'processor' )`.
2. Replace `->process()` calls with `->handle()`.
3. Update any type hints from `Internal_Service` to `Processor_Interface`.
````

### Key rules for migration guides

| Rule | Standard |
|------|----------|
| Title | Includes the version number |
| Lead with stability | Show what does NOT break before showing what changed |
| Before/after code | Always show both the old and new patterns side by side |
| Migration steps | Numbered list of concrete actions the developer must take |
| Scope qualifier | The "Advanced" section starts with a note about who is affected |
| Tone | Reassuring, not alarming; factual, not apologetic |

---

## Quick-reference checklist

Use this checklist when writing or reviewing WordPress-specific documentation:

- [ ] Every public hook has both markdown documentation and inline PHPDoc
- [ ] Hook markdown includes type, since, parameters table, and code example
- [ ] Hook PHPDoc is placed directly before `apply_filters()` / `do_action()`
- [ ] Filter PHPDoc lists the filtered value as the first `@param`
- [ ] REST endpoints document route, method, auth, capability, request, response, and errors
- [ ] Every privileged operation documents its required capability
- [ ] Capability documentation includes the customization filter and failure behavior
- [ ] Migration guides lead with what does NOT break
- [ ] Migration guides include before/after code blocks for every breaking change
- [ ] Migration guides include numbered migration steps
