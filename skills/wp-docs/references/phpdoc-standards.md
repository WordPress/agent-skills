# WordPress PHP documentation standards (PHPDoc)

> **Upstream:** [WordPress PHP Documentation Standards](https://developer.wordpress.org/coding-standards/inline-documentation-standards/php/)
>
> This reference provides agent-first checklists and rules extracted from the official WordPress PHP Documentation Standards. Always defer to the upstream source for edge cases.

---

## Function and method documentation

Every public and protected function or method requires a PHPDoc block directly preceding it with no intervening code.

### Summary line

| Rule | Standard |
|------|----------|
| Verb form | Third-person singular ("Retrieves", "Registers", "Deletes") |
| Length | One sentence, maximum two lines |
| Punctuation | Ends with a period |
| Markup | No HTML or Markdown in summaries — write "image tag" not `` `<img>` `` |
| Mental model | Prefix with "It" to verify: "It retrieves the post title." |

```php
/**
 * Retrieves the post title for the given post ID.
 *
 * @since 1.0.0
 *
 * @param int $post_id The post ID.
 * @return string The post title.
 */
function get_post_title( int $post_id ): string {
	// ...
}
```

### Long description

Separate the long description from the summary with a blank line. Use it for complex methods that need additional context. Markdown is allowed in descriptions (but never HTML outside code examples).

```php
/**
 * Registers a custom post type with the given arguments.
 *
 * This method validates the provided arguments against the WordPress
 * post type schema before registration. Invalid arguments trigger a
 * `_doing_it_wrong()` notice and fall back to defaults.
 *
 * @since 1.2.0
 *
 * @param string $post_type Post type key. Must not exceed 20 characters.
 * @param array  $args      Optional. Post type arguments. Default empty array.
 * @return WP_Post_Type|WP_Error The registered post type object, or WP_Error on failure.
 */
function register_custom_post_type( string $post_type, array $args = array() ) {
	// ...
}
```

---

## `@since` tag

| Rule | Standard |
|------|----------|
| Required | On all public and protected members (functions, methods, classes, properties, constants, hooks) |
| Format | Three-digit version: `@since 1.0.0` |
| Unreleased | Use `@since n.e.x.t` for unreleased versions in plugin projects; WordPress core uses `@since Unknown` when the version cannot be determined |
| Multiple entries | Add a new `@since` when behavior changes significantly (new parameter, changed default, deprecated) |
| MU exception | `@since MU (3.0.0)` for features originating in WordPress MU |

```php
/**
 * Retrieves the formatted date string.
 *
 * @since 1.0.0
 * @since 1.3.0 Added the `$gmt` parameter.
 * @since 2.0.0 The `$format` parameter now accepts 'relative'.
 *
 * @param string $format Date format string.
 * @param bool   $gmt    Optional. Whether to use GMT. Default false.
 * @return string The formatted date.
 */
function get_formatted_date( string $format, bool $gmt = false ): string {
	// ...
}
```

---

## `@param` tag

| Rule | Standard |
|------|----------|
| Format | `@param type $name Description.` |
| Required params | Type, variable name, description ending with a period |
| Optional params | Description starts with "Optional." and ends with "Default X." |
| Accepted values | List with "Accepts 'value1', 'value2'." before the default |
| Alignment | Align type, variable name, and description columns when multiple params exist |

### Required parameter

```php
/**
 * Deletes a user by ID.
 *
 * @since 1.0.0
 *
 * @param int $user_id The ID of the user to delete.
 * @return bool True on success, false on failure.
 */
function delete_user( int $user_id ): bool {
	// ...
}
```

### Optional parameter

```php
/**
 * Retrieves posts matching the given criteria.
 *
 * @since 1.0.0
 *
 * @param string $post_type Optional. Post type slug. Default 'post'.
 * @param string $status    Optional. Post status. Accepts 'publish', 'draft',
 *                          'pending', 'trash'. Default 'publish'.
 * @param int    $limit     Optional. Maximum number of posts to return.
 *                          Default 10.
 * @return WP_Post[] Array of post objects.
 */
function get_matching_posts(
	string $post_type = 'post',
	string $status = 'publish',
	int $limit = 10
): array {
	// ...
}
```

### Array shape parameters

Use `@param array $args { ... @type ... }` syntax to document the expected keys of associative arrays. Each key uses `@type` in the originating function. Note: this is the WordPress convention — do not confuse with the PHPStan `@param array{key: type}` syntax used for static analysis. When consuming the same array in a called function, use `@see` to reference the original documentation rather than duplicating it.

```php
/**
 * Registers a custom sidebar with the given arguments.
 *
 * @since 1.0.0
 *
 * @param array $args {
 *     Arguments for registering the sidebar.
 *
 *     @type string $id            Required. Sidebar ID.
 *     @type string $name          Required. Sidebar display name.
 *     @type string $description   Optional. Sidebar description. Default empty string.
 *     @type string $class         Optional. CSS class. Default empty string.
 *     @type string $before_widget Optional. HTML before each widget. Default
 *                                 `<li id="%1$s" class="widget %2$s">`.
 *     @type string $after_widget  Optional. HTML after each widget. Default `</li>`.
 *     @type string $before_title  Optional. HTML before the title. Default `<h2>`.
 *     @type string $after_title   Optional. HTML after the title. Default `</h2>`.
 * }
 * @return string The sidebar ID.
 */
function register_custom_sidebar( array $args ): string {
	// ...
}
```

---

## `@return` tag

| Rule | Standard |
|------|----------|
| Format | `@return type Description.` |
| Never bare | Always include a description — never just `@return string` |
| Multiple types | Separate with pipe: `@return string|false` |
| Void | Omit `@return` entirely when a function returns nothing — do not use `@return void` |
| Description | Ends with a period |

```php
/**
 * Finds a user by email address.
 *
 * @since 1.0.0
 *
 * @param string $email The email address to search for.
 * @return WP_User|false The user object if found, false otherwise.
 */
function find_user_by_email( string $email ) {
	// ...
}
```

---

## `@throws` tag

| Rule | Standard |
|------|----------|
| Required | Document every exception a public method can throw |
| Format | `@throws ExceptionClass Description of when this is thrown.` |
| Placement | After `@return`; consistency within a project matters most |

```php
/**
 * Processes a payment for the given order.
 *
 * @since 2.0.0
 *
 * @param int   $order_id The order ID.
 * @param float $amount   The payment amount.
 * @return string The transaction ID.
 *
 * @throws InvalidArgumentException When the amount is negative or zero.
 * @throws PaymentGatewayException  When the payment gateway is unreachable.
 */
function process_payment( int $order_id, float $amount ): string {
	if ( $amount <= 0 ) {
		throw new InvalidArgumentException( 'Payment amount must be positive.' );
	}

	// ...
}
```

---

## Class, interface, and trait documentation

Every class, interface, and trait requires a PHPDoc block with a summary, optional long description, `@since`, and `@package`.

| Tag | Required | Notes |
|-----|----------|-------|
| Summary | Yes | Third-person singular, one sentence, ends with period |
| Long description | No | Separated by blank line from summary |
| `@since` | Yes | Version the class was introduced |
| `@package` | Yes | Namespace or logical package grouping |

```php
/**
 * Manages webhook subscriptions and delivery scheduling.
 *
 * Handles registration of webhook endpoints, validates payload
 * signatures, and schedules delivery via Action Scheduler. Failed
 * deliveries are retried with exponential backoff.
 *
 * @since 1.0.0
 * @package MyPlugin\Webhooks
 */
class Webhook_Manager {
	// ...
}
```

```php
/**
 * Defines the contract for cache storage backends.
 *
 * @since 1.2.0
 * @package MyPlugin\Contracts
 */
interface Cache_Interface {
	// ...
}
```

```php
/**
 * Provides shared logging capabilities for service classes.
 *
 * @since 1.0.0
 * @package MyPlugin\Concerns
 */
trait Has_Logging {
	// ...
}
```

---

## Property and constant documentation

### Class properties

```php
/**
 * The maximum number of retry attempts.
 *
 * @since 1.0.0
 * @var int
 */
private int $max_retries = 3;
```

### Class constants

```php
/**
 * The cache key prefix for all transients.
 *
 * @since 1.0.0
 * @var string
 */
const CACHE_PREFIX = 'myplugin_';
```

---

## Hook documentation (inline)

PHPDoc blocks for `apply_filters()` and `do_action()` are placed immediately before the call. They document what the hook does, when it fires, and all parameters passed to callbacks.

### Filter documentation (`apply_filters`)

| Rule | Standard |
|------|----------|
| Placement | Directly before the `apply_filters()` call |
| Summary | Describes what is being filtered |
| `@since` | Required |
| `@param` | One for each argument passed; first `@param` is the value being filtered |

```php
/**
 * Filters the list of allowed file extensions for upload.
 *
 * Allows plugins to add or remove file extensions from the
 * whitelist used during media upload validation.
 *
 * @since 1.0.0
 * @since 1.4.0 Added the `$user_id` parameter.
 *
 * @param string[] $extensions Array of allowed file extensions.
 * @param int      $user_id   The ID of the uploading user.
 */
$extensions = apply_filters( 'myplugin_allowed_extensions', $extensions, $user_id );
```

### Action documentation (`do_action`)

| Rule | Standard |
|------|----------|
| Placement | Directly before the `do_action()` call |
| Summary | Describes when the action fires |
| `@since` | Required |
| `@param` | One for each argument passed to callbacks |

```php
/**
 * Fires after a webhook has been successfully delivered.
 *
 * @since 1.0.0
 *
 * @param int    $webhook_id  The webhook subscription ID.
 * @param string $endpoint    The delivery endpoint URL.
 * @param array  $payload     The delivered payload data.
 * @param int    $response_code The HTTP response code from the endpoint.
 */
do_action( 'myplugin_webhook_delivered', $webhook_id, $endpoint, $payload, $response_code );
```

---

## File-level documentation

File-level PHPDoc blocks should be included whenever possible. They are especially important for files with procedural functions, main plugin files, and config files. For files containing a single class, the class-level docblock can serve as file documentation, but a separate file-level block is still recommended. Place the block at the top of the file immediately after the opening `<?php` tag.

| Tag | Required | Notes |
|-----|----------|-------|
| Summary | Yes | Describes the file's purpose |
| Long description | No | Additional context |
| `@since` | Yes | Version the file was introduced |
| `@package` | Yes | Logical package grouping |

```php
<?php
/**
 * Plugin bootstrap and initialization.
 *
 * Registers autoloading, defines constants, and hooks the plugin
 * into the WordPress lifecycle.
 *
 * @since 1.0.0
 * @package MyPlugin
 */

// ...
```

For files that contain a single class, the class-level docblock serves as the file documentation. A separate file-level block is not required.

---

## Formatting rules

| Rule | Standard |
|------|----------|
| Line width | Wrap text at 80 characters, never exceed 120 (including indentation) |
| Tag order | `@since`, `@access`, `@global`, `@param`, `@return` (then `@throws` if needed) |
| Blank lines | One blank line between description and tags; one blank line between tag groups |
| Alignment | Align `@param` types, names, and descriptions across a block |
| Inline tags | `{@see ClassName}` or `{@see function_name()}` for cross-references within descriptions |
| `@see` vs `@link` | `@see` for code references (functions, classes); `@link` for URLs only |
| Code in descriptions | Use backticks for variables (`` `$variable` ``) and inline code |

---

## Quick-reference checklist

Use this checklist when reviewing or writing PHPDoc:

- [ ] Summary uses third-person singular verb form ("Retrieves", not "Retrieve")
- [ ] Summary is one sentence ending with a period
- [ ] No HTML or Markdown in the summary line
- [ ] Long description separated from summary by a blank line
- [ ] `@since` present on all public and protected members
- [ ] `@since` uses three-digit format (`1.0.0`) or `n.e.x.t`
- [ ] `@param` includes type, variable name, and description
- [ ] Optional parameters start with "Optional." and end with "Default X."
- [ ] Array parameters document keys with `@type` syntax
- [ ] `@return` includes both type and description (never bare)
- [ ] `@throws` documents every thrown exception with condition
- [ ] Classes have summary, `@since`, and `@package`
- [ ] Hook PHPDoc placed directly before `apply_filters()` / `do_action()`
- [ ] Hook PHPDoc includes `@since` and `@param` for every argument
- [ ] Filter `@param` lists the filtered value as the first parameter
- [ ] Text wraps at 80 characters, never exceeds 120
