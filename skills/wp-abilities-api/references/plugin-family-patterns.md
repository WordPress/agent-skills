# Plugin-family patterns

This reference covers shared implementation *mechanics* — the call shape your execute callbacks follow when handing work to existing business logic. Two shapes are common enough across real-world WordPress plugins to be worth naming; which one fits is determined by how the backing controller is constructed, not by a choice you make up front. The choice still ripples through your delegate helper, your tests, and your error codes, so it's worth confirming early.

Family-specific *registration* conventions — loader path, ability category, MCP exposure defaults, error-code prefix house style — live in separate plugin-family overlays (for example, a WooCommerce-extension overlay), not in this reference. Apply any relevant overlay before scaffolding registration. The patterns below should stay portable: they describe how the execute callback talks to backing code, not what the registration metadata should look like for your plugin family.

There is also a third option that sits *outside* this dichotomy. If the operation does not yet have a shared service class — or if you can refactor toward one — extracting a service that the ability, the REST controller, and the UI all consume is the default per `shared-core-service.md`. Delegation through an existing REST controller (either shape below) is a conditional shortcut for low-stakes reads, not the starting point. Confirm the shape is right before you reach for either.

## Shape: shared API client

Common in plugins that talk to a remote service (Stripe, a first-party SaaS, an upstream API). The plugin bootstraps a single API client, exposes it via a static accessor on a main plugin class, and every REST controller takes that client as a constructor argument.

### Detection

```bash
# Inspect the backing REST controller's __construct signature.
grep -n "public function __construct" <path/to/rest-controller.php>
```

If the constructor takes a required typed argument (e.g. `My_Plugin_API_Client $api_client`), you're in the shared-API-client shape. Confirm the plugin has a central accessor:

```bash
grep -rn "get_api_client\|get_.*_api_client\|get_service" <path/to/plugin/main-class.php>
```

You're looking for a `public static function get_<something>()` that returns the shared client.

### Minimal skeleton

```php
<?php
namespace My_Plugin\Abilities;

class Abilities_Registrar {

    const CATEGORY_SLUG = 'my-plugin';

    public static function init() {
        add_action( 'wp_abilities_api_categories_init', [ __CLASS__, 'register_category' ] );
        add_action( 'wp_abilities_api_init', [ __CLASS__, 'register_abilities' ] );
    }

    public static function register_abilities() {
        wp_register_ability(
            'my-plugin/get-things',
            [
                'label'               => __( 'Get things', 'my-plugin' ),
                'description'         => __( 'List things with filters.', 'my-plugin' ),
                'category'            => self::CATEGORY_SLUG,
                'input_schema'        => [ /* ... */ ],
                'execute_callback'    => [ __CLASS__, 'execute_get_things' ],
                'permission_callback' => [ __CLASS__, 'current_user_has_capability' ],
                'meta'                => [
                    'annotations'  => [ 'readonly' => true, 'destructive' => false, 'idempotent' => true ],
                    'show_in_rest' => true,
                ],
            ]
        );
    }

    public static function execute_get_things( $input = null ) {
        return self::delegate_to_rest_controller(
            'My_Plugin_REST_Things_Controller',
            'get_things',
            '/my-plugin/v1/things',
            is_array( $input ) ? $input : null
        );
    }

    private static function delegate_to_rest_controller( $controller_class, $method, $route, $input, $http_method = 'GET' ) {
        $fqcn = '\\' . $controller_class;
        if ( ! class_exists( $fqcn ) ) {
            return new \WP_Error( 'my_plugin_not_initialized', __( 'My Plugin is not initialized.', 'my-plugin' ) );
        }

        // Shape specifics: fetch the shared API client and null-check.
        $api_client = null;
        if ( class_exists( '\My_Plugin' ) && method_exists( '\My_Plugin', 'get_api_client' ) ) {
            $api_client = \My_Plugin::get_api_client();
        }
        if ( null === $api_client ) {
            return new \WP_Error( 'my_plugin_not_initialized', __( 'My Plugin is not initialized.', 'my-plugin' ) );
        }

        $request = new \WP_REST_Request( $http_method, $route );
        if ( is_array( $input ) ) {
            foreach ( $input as $param => $value ) {
                $request->set_param( $param, $value );
            }
        }

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
}
```

### Testing implications

- **Bootstrap test doubles need the API client.** Unit tests that instantiate controllers must provide a mocked or stubbed client; otherwise the constructor fails with `ArgumentCountError: Too few arguments`.
- **The "not initialized" error path is reachable and must be covered.** One unit test should stub the accessor to return null and assert the ability returns `<plugin>_not_initialized`. This is a common failure during partial bootstraps (WP-CLI with restricted loading, test harnesses, admin pages with conditional autoloading).
- **Integration tests need real or faked HTTP.** The backing controller will hit the upstream unless the API client is mocked, so integration harnesses typically route through a fake transport.

Worked example: a plugin that talks to an external SaaS or upstream HTTP service typically follows this pattern. The plugin's main class exposes the API client via a static accessor (e.g. `Plugin_Main::get_api_client()`); REST controllers extend a base class whose constructor takes that client as a typed argument; the abilities registrar pulls the client through the same accessor before constructing controllers.

## Shape: zero-arg controllers

Common in plugins/packages that delegate primarily to WordPress core mechanisms (custom post types, options, meta) and don't maintain a single shared API client. Controllers instantiate cleanly without a dependency graph.

### Detection

```bash
grep -n "public function __construct" <path/to/rest-controller.php>
```

If the constructor takes no required arguments, or takes only simple scalars you can hardcode at the ability call site (e.g. a post-type string), you're in the zero-arg shape.

Also grep the plugin's main bootstrap class for the absence of a singleton API accessor — if there isn't one, the zero-arg shape is the honest choice.

### Minimal skeleton

```php
<?php
namespace My_Plugin\Abilities;

class Abilities_Registrar {

    const CATEGORY_SLUG = 'my-plugin';

    public static function init() {
        add_action( 'wp_abilities_api_categories_init', [ __CLASS__, 'register_category' ] );
        add_action( 'wp_abilities_api_init', [ __CLASS__, 'register_abilities' ] );
    }

    public static function register_abilities() {
        wp_register_ability(
            'my-plugin/get-things',
            [
                /* ... */
                'execute_callback' => [ __CLASS__, 'execute_get_things' ],
                /* ... */
            ]
        );
    }

    public static function execute_get_things( $input = null ) {
        $input    = is_array( $input ) ? $input : [];
        $endpoint = new \My_Plugin_Things_Endpoint();
        $request  = new \WP_REST_Request( 'GET', '/my-plugin/v1/things' );

        foreach ( [ 'page', 'per_page', 'status', 'search' ] as $key ) {
            if ( isset( $input[ $key ] ) ) {
                $request->set_param( $key, $input[ $key ] );
            }
        }

        $response = $endpoint->get_items( $request );
        if ( is_wp_error( $response ) ) {
            return $response;
        }
        return $response instanceof \WP_REST_Response ? $response->get_data() : $response;
    }
}
```

No helper is required — the construction step is a single line and inlining per callback stays readable. If you do extract a helper, it takes a `constructor_args` parameter because the controller class isn't constant across abilities:

```php
/**
 * @param string     $controller_class Fully-qualified controller class.
 * @param string     $method           Method to invoke on the request.
 * @param string     $route            REST route used when constructing WP_REST_Request.
 * @param array|null $input            Ability input (or null).
 * @param string     $http_method      HTTP method. Defaults to 'GET'.
 * @param array      $constructor_args Optional scalar args for the controller's constructor.
 * @return array|\WP_Error
 */
private static function delegate_to_rest_controller(
    $controller_class,
    $method,
    $route,
    $input,
    $http_method = 'GET',
    $constructor_args = array()
) {
    /* ... */
}
```

The phpDoc carries the `array|\WP_Error` return shape; the function signature itself stays untyped on the return so this snippet parses on PHP 7.2+.

See `delegate-helper-pattern.md` for the full helper signature and guards.

### Testing implications

- **No API-client mock needed.** Unit tests instantiate the ability registrar directly and call `execute_*` with input arrays.
- **Test at the `wp_get_ability()` level when possible.** With zero-arg controllers the backing often exists in WordPress core territory (e.g. custom post types), so integration tests can exercise the full pipeline without a fake transport.
- **The `<plugin>_not_initialized` failure mode is less common.** It still exists — if a package isn't loaded, `class_exists` on the backing controller still fails — but the surface area is smaller.

Worked example: a plugin whose REST controllers wrap a custom post type, taxonomy, option, or meta typically follows this pattern. Each execute callback constructs its controller inline (e.g. `new My_CPT_Endpoint( 'my_cpt' )`), passing whatever scalar (post-type slug, taxonomy name) the controller needs. No shared helper in the registrar; the construction step is small enough to inline.

## Hybrid cases

A single plugin can legitimately use both patterns across different abilities:

- A shared-API-client ability for backing controllers that talk to the upstream service.
- A zero-arg ability for backing controllers that only touch WP core (e.g. a CPT-based settings endpoint in the same plugin).

If this happens, the helper in `delegate-helper-pattern.md` can support both via optional `constructor_args` — but resist the temptation to over-engineer until you have at least two zero-arg abilities that would share the helper.

## Anti-pattern — inventing an API client where there isn't one

Don't introduce a fake shared API client to fit the shared-client helper shape. If the plugin is genuinely stateless / CPT-driven, inline construction is the honest answer. The helper is scaffolding that pays back when you have 4+ abilities sharing the build-request → instantiate → unwrap flow; before that, inline code is faster to read and review.

## Picking quickly

| Signal | Likely pattern |
|---|---|
| Backing controller's `__construct` takes an API-client-like object | A |
| Plugin has a `Plugin::get_*_client()` static accessor | A |
| Plugin talks to an external SaaS / upstream HTTP service | A |
| Backing controller `__construct` is zero-arg or only takes scalars | B |
| Backing is a CPT / options / meta wrapper | B |
| Plugin's REST surface wraps WP-core post types, taxonomies, options, or meta | B |
