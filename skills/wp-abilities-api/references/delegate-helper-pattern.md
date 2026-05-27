# Delegate helper pattern

Once you've decided delegation is the right shape for an ability — that is, the backing REST controller is a pure data-fetch, the operation is a read, and the ability runs predominantly inside REST contexts (see `shared-core-service.md` for when the answer is "no, extract a shared service" instead) — extract a `delegate_to_rest_controller` helper rather than open-coding the request-build/dispatch/unwrap pipeline in each execute callback. This reference documents one helper shape that works, the three guards every implementation needs, the dual response-shape unwrap, and when NOT to use the helper at all. Adapt the exact signature to the plugin you're working in — the guards and unwrap matter more than the parameter list.

Read `plugin-family-patterns.md` first — the helper's exact shape depends on how the backing controller is constructed (shared API client vs. zero-arg).

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

## Helper shape

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
    $controller_class,
    $method,
    $route,
    $input,
    $http_method = 'GET'
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

When the controller takes a shared API client as a constructor argument, the accessor is typically a `public static` method on the main plugin class. Guard both `class_exists` on the plugin class AND `method_exists` on the accessor because either could be absent during partial bootstraps. Treat a null return from the accessor as "not initialized".

Missing this argument produces `ArgumentCountError: Too few arguments to function <Controller>::__construct(), 0 passed` — a PHP fatal. The standardized `<plugin>_not_initialized` error code is documented in `error-code-vocabulary.md`.

When the controller takes no constructor args, skip this guard entirely. When it takes only simple scalars (e.g. a post-type string), pass them in via an optional `constructor_args` parameter on the helper.

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

Three categories of abilities bypass the helper and call the backing directly:

### Backing request class can be invoked without the controller

If the REST controller's only role is to translate `WP_REST_Request` into a call to an underlying request class (e.g., `Things_Request::from_rest_request( $request )->execute()`) and adds no validation, permission logic, or orchestration on top, bypass the controller and call the request class directly:

```php
public static function execute_get_things( $input = null ) {
    if ( ! class_exists( '\My_Plugin\Things_Request' ) ) {
        return new \WP_Error( '<plugin>_not_initialized', __( '<Plugin> is not initialized.', '<text-domain>' ) );
    }

    $request = new \WP_REST_Request( 'GET', '/my-plugin/v1/things' );
    foreach ( (array) $input as $param => $value ) {
        $request->set_param( $param, $value );
    }

    $things_request = \My_Plugin\Things_Request::from_rest_request( $request );
    $rows           = $things_request->execute();

    return is_array( $rows ) ? $rows : [];
}
```

The `WP_REST_Request` object exists only to satisfy `from_rest_request()`'s parameter contract — nothing dispatches it. This is the shortest path through the layers: no controller construction, no controller-emitted side effects, and (when the request class is hit before any REST traffic in the lifecycle) no `rest_api_init` cost. See `shared-core-service.md` for the broader discussion of REST-path side effects and the first-call bootstrap cost on cold paths.

The tradeoff is real: bypassing the controller bypasses anything the controller does. If the controller runs validation that the request class doesn't, or emits an audit hook the request class doesn't, that work is lost on the ability path. Use this shape when the controller is genuinely a thin wrapper, not when it's doing work you'd want to keep.

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

**If the backing method takes `WP_REST_Request` and the controller adds something beyond delegating to an underlying request class (validation, permissions, orchestration, side effects you want to keep), use the helper. If the controller is a thin wrapper over a request class, call the request class directly. Otherwise direct-path.**

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
