# Delegate helper pattern

When an ability's execute callback needs to hand work to an existing REST controller instead of duplicating business logic, extract a `delegate_to_rest_controller` helper. This reference documents the canonical signature, the three guards every implementation needs, the dual response-shape unwrap, and when NOT to use the helper at all.

Read `plugin-family-patterns.md` first — the helper's exact shape depends on whether your plugin follows the shared-API-client pattern or the zero-arg-controllers pattern.

## Why this helper exists

List-style read abilities typically repeat the same four steps in every execute callback:

1. Validate the plugin is initialized (class exists + dependencies resolved).
2. Build a `WP_REST_Request` and copy the ability's `$input` onto it as params.
3. Instantiate the backing controller and invoke the named method.
4. Unwrap the response (controllers return either a raw array or a `WP_REST_Response`).

Four abilities × this repetition = the boilerplate dominates the callback body. Extracting a helper keeps each execute callback a 3–4 line function that reads like pseudocode.

## When to extract

After the **second** list-style ability lands. Before the third ability gets added, refactor the duplicated code out of the first two execute callbacks into a private static helper. Convert subsequent abilities to call the helper as you add them.

If the plugin only ever ships one or two abilities, inline the code. The helper's payoff is at 3+ callers.

## Canonical signature (Pattern A — shared-API-client)

```php
/**
 * Delegate an ability's execute callback to a REST controller.
 *
 * Builds a WP_REST_Request from the ability's input, instantiates the
 * backing controller with the plugin's shared API client, invokes the
 * named method, and normalizes the return so callers always see
 * array|\WP_Error. Controllers in this plugin return either a
 * WP_REST_Response or a raw array; the helper unwraps both shapes.
 *
 * Not used by zero-arg abilities — those call their controller directly
 * so we don't synthesize a WP_REST_Request just to discard it.
 *
 * @param string     $controller_class Fully-qualified controller class (no leading backslash).
 * @param string     $method           Controller method to invoke on the built request.
 * @param string     $route            REST route string used when constructing WP_REST_Request.
 * @param array|null $input            Ability input; each key/value becomes a request param.
 * @param string     $http_method      HTTP method for WP_REST_Request. Defaults to 'GET'; writes pass 'POST'.
 * @return array|\WP_Error             Response payload as an array, or WP_Error on failure.
 */
private static function delegate_to_rest_controller(
    string $controller_class,
    string $method,
    string $route,
    ?array $input,
    string $http_method = 'GET'
) {
    $fqcn = '\\' . $controller_class;

    // Guard 1: controller class is loaded.
    if ( ! class_exists( $fqcn ) ) {
        return new \WP_Error(
            '<plugin>_not_initialized',
            __( '<Plugin> is not initialized.', '<text-domain>' )
        );
    }

    // Guard 2: shared API client is available.
    $api_client = null;
    if ( class_exists( '\<Plugin_Main_Class>' ) && method_exists( '\<Plugin_Main_Class>', 'get_<client_accessor>' ) ) {
        $api_client = \<Plugin_Main_Class>::get_<client_accessor>();
    }
    if ( null === $api_client ) {
        return new \WP_Error(
            '<plugin>_not_initialized',
            __( '<Plugin> is not initialized.', '<text-domain>' )
        );
    }

    // Build the request.
    $request = new \WP_REST_Request( $http_method, $route );
    if ( null !== $input ) {
        foreach ( $input as $param => $value ) {
            $request->set_param( $param, $value );
        }
    }

    // Invoke + guard 3: WP_Error short-circuit + dual-shape unwrap.
    $controller = new $fqcn( $api_client );
    $response   = $controller->{$method}( $request );

    if ( is_wp_error( $response ) ) {
        return $response;
    }
    if ( $response instanceof \WP_REST_Response ) {
        $data = $response->get_data();
        return is_array( $data ) ? $data : [];
    }
    return is_array( $response ) ? $response : [];
}
```

Positional (not named) arguments on purpose — the helper is called from every list ability and keyword-args for PHP 8 would add visual noise. Order is intentional: controller, method, route, input, http_method (the defaultable tail).

## The three guards

### 1. `class_exists` on the controller

Execute callbacks can be reached on sites where the plugin's classes haven't loaded (tests, WP-CLI with limited bootstrap, admin pages with conditional autoloading). Check is cheap; without it a missing class produces a fatal.

Note `'\\' . $controller_class` — accept controller class names without a leading backslash (readable in config arrays) and re-add it so `class_exists` and `new $fqcn(...)` both root-resolve.

### 2. Required dependency (API client) null-check

For Pattern A plugins the accessor is a `public static` method on the main plugin class. Both `class_exists` on the plugin class AND `method_exists` on the accessor are guarded because either could be absent during partial bootstraps. A null return from the accessor is also treated as "not initialized".

Missing this argument produces `ArgumentCountError: Too few arguments to function <Controller>::__construct(), 0 passed` — a PHP fatal. The standardized `<plugin>_not_initialized` error code is documented in `error-code-vocabulary.md`.

For Pattern B plugins, this guard is either skipped entirely (zero-arg constructor) or replaced with construction-time scalar args passed in via an optional `constructor_args` parameter.

### 3. `is_wp_error` short-circuit

Before trying to unwrap the response, check if it's already a `WP_Error`. Several controllers return `WP_Error` for both validation failures and upstream failures; that error needs to bubble up intact so the agent can see the upstream code.

## Dual response-shape unwrap

```php
if ( $response instanceof \WP_REST_Response ) {
    $data = $response->get_data();
    return is_array( $data ) ? $data : [];
}
return is_array( $response ) ? $response : [];
```

Real WordPress REST controllers return either:
- A `WP_REST_Response` (the output of `rest_ensure_response( ... )` or `new WP_REST_Response( ... )`), or
- A raw array (typical when a controller delegates to an internal request-handler class that returns the decoded transport payload directly).

Both happen. The helper unwraps `WP_REST_Response` via `get_data()` and passes raw arrays through. The `is_array(...) ? ... : []` coalesce defends against a non-array return type that the ability's `output_schema` would have rejected downstream anyway — returning `[]` fails safely rather than leaking a surprising type.

## When NOT to use the helper

Two categories of abilities bypass the helper and call the backing directly:

### Zero-arg backing methods

If the backing method takes no `WP_REST_Request` parameter, don't synthesize a request just to discard it. Call the method directly:

```php
public static function execute_get_overview( $input = null ) {
    if ( ! class_exists( '\My_Plugin_REST_Overview_Controller' ) ) {
        return new \WP_Error( '<plugin>_not_initialized', __( '<Plugin> is not initialized.', '<text-domain>' ) );
    }

    $api_client = /* ... same accessor check ... */;
    if ( null === $api_client ) {
        return new \WP_Error( '<plugin>_not_initialized', __( '<Plugin> is not initialized.', '<text-domain>' ) );
    }

    $controller = new \My_Plugin_REST_Overview_Controller( $api_client );
    $response   = $controller->get_overview(); // No $request argument.

    if ( is_wp_error( $response ) ) {
        return $response;
    }
    return is_array( $response ) ? $response : [];
}
```

### Abilities that use a non-REST service

If the execute callback reaches a service directly (e.g. `My_Plugin::get_account_service()->get_cached_account_data()`) rather than a REST controller, stay on the direct path. The ability is not REST-backed and the helper would add a construction step for no gain.

## Rule of thumb

**If the backing method's signature includes `WP_REST_Request`, use the helper. Otherwise direct-path.**

## Conversion pattern — before and after

Before extraction (inline in the execute callback):

```php
public static function execute_get_things( $input = null ) {
    if ( ! class_exists( '\My_Plugin_REST_Things_Controller' ) ) {
        return new \WP_Error( '<plugin>_not_initialized', __( '<Plugin> is not initialized.', '<text-domain>' ) );
    }
    $api_client = \My_Plugin::get_api_client();
    if ( ! $api_client ) {
        return new \WP_Error( '<plugin>_not_initialized', __( '<Plugin> is not initialized.', '<text-domain>' ) );
    }
    $request = new \WP_REST_Request( 'GET', '/my-plugin/v1/things' );
    foreach ( (array) $input as $param => $value ) {
        $request->set_param( $param, $value );
    }
    $controller = new \My_Plugin_REST_Things_Controller( $api_client );
    $response   = $controller->get_things( $request );
    // ... unwrap ...
}
```

After extraction:

```php
public static function execute_get_things( $input = null ) {
    return self::delegate_to_rest_controller(
        'My_Plugin_REST_Things_Controller',
        'get_things',
        '/my-plugin/v1/things',
        is_array( $input ) ? $input : null
    );
}
```

Note the `is_array( $input ) ? $input : null` — the helper signature is `?array`, and passing `null` tells it to build the request with no params at all. This matters because the Abilities API sometimes invokes a callback with no input object.

## Related references

- `plugin-family-patterns.md` — choosing the helper's constructor shape.
- `error-code-vocabulary.md` — the `<plugin>_not_initialized` code and its siblings.
- `input-schema-gotchas.md` — callbacks for list abilities often need `per_page` pagination translation BEFORE calling the helper.
