# Input schema gotchas

Three surprises the Abilities API's `input_schema` will ship with if you rely on schema declarations alone. All three have been caught in real plugin work after the schema looked correct and tests passed; each has a defensive pattern that makes the execute callback robust regardless.

## 1. Schema `default` values are NOT injected into execute callback input

### Problem

`wp_register_ability()` lets you declare per-property defaults in `input_schema`:

```php
'input_schema' => [
    'type'       => 'object',
    'properties' => [
        'submit' => [
            'type'        => 'boolean',
            'default'     => false,
            'description' => __( 'Whether to submit evidence for review.', '<text-domain>' ),
        ],
    ],
],
```

The Abilities API's validate path enforces `type` and `required`, but it does NOT populate missing properties with their declared `default`. If an agent invokes the ability with `{ dispute_id: "dp_..." }` and omits `submit`, the execute callback receives `$input` **without** a `submit` key — it does not get `$input['submit'] = false`.

### Symptoms

- Boolean defaults silently become "undefined" in the callback and any `if ( $input['submit'] )` check compares against `null`, which works by accident but fails `isset` checks and strict-type branches.
- Integer pagination defaults like `'page' => [ 'default' => 1 ]` never reach the backing controller, so pagination falls back to the controller's internal default rather than the one declared in the schema.
- Object defaults (`'metadata' => [ 'default' => [] ]`) become `null` rather than `[]` and any `foreach ( $input['metadata'] as ... )` hits a type error.

### Fix — normalize defaults explicitly in the execute callback

```php
public static function execute_submit_evidence( $input = null ) {
    if ( ! is_array( $input ) ) {
        $input = [];
    }

    // Apply schema defaults the Abilities API does not inject.
    if ( ! array_key_exists( 'submit', $input ) || null === $input['submit'] ) {
        $input['submit'] = false;
    }
    $input['submit'] = (bool) $input['submit'];

    if ( ! array_key_exists( 'metadata', $input ) || null === $input['metadata'] ) {
        $input['metadata'] = [];
    }

    // ... rest of callback
}
```

The `array_key_exists` + null-check pattern catches both "missing key" and "explicit null" (some serializers produce nulls for optional fields).

Keep the declared `default` in `input_schema` anyway — it documents the expected behavior for anyone reading the registration and is visible to agents in the schema introspection endpoints. Just don't rely on it for runtime population.

## 2. Pagination parameter-name drift

### Problem

The `input_schema` convention across most WordPress REST endpoints is `per_page` (matching WP core REST list endpoints and `WP_REST_Controller`'s `get_collection_params()`). Some plugin REST controllers, however, delegate to an internal request-builder class that reads a different key (e.g. `pagesize` or `page_size`), typically for historical reasons.

If the ability's `input_schema` exposes `per_page` and the backing controller reads `pagesize`, the agent's `per_page: 50` silently never reaches pagination — the value is accepted, forwarded verbatim to the backing, and then ignored. Agents keep getting the default page size and suspect their filter is broken.

### Symptoms

- List abilities return the backing controller's default page size regardless of the agent's `per_page` input.
- Integration tests that only check "a list came back" pass; only a test asserting `count( $response['data'] )` catches it.
- Harness runs show the raw response count matching the default (25, 10, etc.) for every call.

### Detection heuristic

Before shipping a paginated ability, grep the backing controller's call chain:

```bash
# Check the backing controller and anything it delegates to.
grep -rn "pagesize\|page_size" <path/to/backing-controller.php> <path/to/request-helpers/>
```

If `pagesize` (or any non-`per_page` key) appears in the chain and the ability's schema exposes `per_page`, the execute callback MUST translate.

### Fix — translate before delegating

```php
/**
 * Translate pagination keys for abilities whose backing reads a non-standard key.
 *
 * Abilities expose `per_page` uniformly for agent-facing consistency; this
 * helper rewrites it to whatever key the backing actually reads.
 *
 * @param array|null $input Ability input (or null).
 * @return array|null       Input with `per_page` rewritten to `<backing_key>` when present.
 */
private static function translate_pagination_keys( $input ) {
    if ( ! is_array( $input ) ) {
        return $input;
    }
    if ( isset( $input['per_page'] ) ) {
        $input['<backing_key>'] = $input['per_page'];
        unset( $input['per_page'] );
    }
    return $input;
}

public static function execute_get_things( $input = null ) {
    $input = self::translate_pagination_keys( is_array( $input ) ? $input : null );

    return self::delegate_to_rest_controller(
        '<Backing_Controller_Class>',
        'get_things',
        '/my-plugin/v1/things',
        $input
    );
}
```

Place the translation BEFORE the delegate call so `per_page` never reaches the backing.

### When NOT to apply this

Do not apply blindly. If the backing reads `per_page` directly (most modern WP REST controllers do), adding this translation would silently break pagination by renaming the key to something the backing doesn't understand.

**Always grep the backing first.** The translation is only correct for a specific backing chain; it's not a general safety net.

## 3. ID validation must not use `empty()`

### Problem

PHP's `empty()` is permissive in ways that bite ID validation:

```php
empty( '0' )   // true  — but "0" is a legal string ID (order ID, row ID, post ID in some code paths)
empty( 0 )     // true  — same for integer zero
empty( [] )    // true  — expected, but same keyword used for different cases
```

An execute callback that guards required IDs with `empty( $input['order_id'] )` will false-reject a legitimate `"0"` and return a "missing" error for input that's actually present. The agent retries with the same input, gets the same error, and the call is stuck.

### Symptoms

- Abilities reject specific IDs ending in zero or consisting of zero.
- Unit tests written with non-zero IDs pass; a regression lands the day an agent tries a real zero-ID.
- `WP_Error( '<plugin>_missing_<field>' )` fires for input the schema validator would have accepted.

### Fix — three explicit checks

```php
if ( ! isset( $input['order_id'] )
    || ! is_string( $input['order_id'] )
    || '' === $input['order_id']
) {
    return new \WP_Error(
        '<plugin>_missing_order_id',
        __( 'An order_id is required to fetch order detail.', '<text-domain>' )
    );
}
```

Three separate checks, each non-redundant:

1. `! isset( ... )` — the key is present on the array.
2. `! is_string( ... )` — type is right. (For integer IDs, use `is_int` + non-negative check instead.) Without this, a caller that passes `123` (integer) where the schema documents a string would fall through to a later step that does `rawurlencode( $input['order_id'] )` and produces a cryptic coercion error rather than a clean missing-field response.
3. `'' === $input[ ... ]` — non-empty in the strict sense. Rejects empty string only; accepts `"0"` as a legal value.

Use the standardized `<plugin>_missing_<field>` error code (see `error-code-vocabulary.md`) for this case.

### Add a regression-guard unit test

The guard is load-bearing enough that it deserves an explicit test — otherwise someone will simplify it back to `empty()` in a future refactor:

```php
public function test_execute_returns_wp_error_when_id_not_a_string() {
    $result = My_Plugin_Abilities::execute_get_thing( [ 'order_id' => 123 ] );
    $this->assertInstanceOf( \WP_Error::class, $result );
    $this->assertSame( '<plugin>_missing_order_id', $result->get_error_code() );
}
```

The integer `123` is a fine canary — it's non-empty, it `isset`s, but it's not a string. A callback that only uses `isset` + `empty` would false-pass this input and fall through to the URL construction with an integer argument.

## 4. Direct vs indirect invocation differ in strictness

### Problem

Two ways exist to invoke an ability's `execute_callback`:

- **Direct.** A caller imports the registrar and calls the static method (`Abilities_Registrar::execute_get_things( $input )`). PHP signature defaults apply; no schema validation runs.
- **Indirect.** A caller resolves the ability through `wp_get_ability( '<id>' )->execute( $input )`. WordPress runs `WP_Ability::normalize_input()` then `validate_input()` (then `check_permissions()`) before the callback is invoked.

The two paths differ in three ways agents trip over:

1. **Validation against `input_schema` runs only on the indirect path.** If the ability declares an object-typed schema with properties and the indirect caller passes `null` (or omits the argument entirely, as `$ability->execute()` does), `validate_input()` rejects with an `ability_invalid_input` error before the callback runs. The PHP-level `$input = null` default in the callback signature is dead code on this path.

2. **Schema's top-level `default` IS applied — but only on the indirect path.** `normalize_input()` substitutes the schema's top-level `default` when the caller passes `null`. Direct callers don't run through this method; they get whatever PHP default the callback signature declares. Declaring `default => (object) array()` at the schema root makes `$ability->execute()` work without arguments — but the same callback called directly still receives PHP `null`.

3. **The callback's first argument arrives only when `input_schema` is non-empty.** WordPress only forwards `$input` to the callback when the schema is declared. Without an input schema, the callback is invoked with zero arguments — PHP-level signature defaults compensate for this if you wrote them; without them, the indirect path produces an `ArgumentCountError`.

### Symptoms

- An ability looks fine when unit-tested by directly invoking the static method, then fails the moment it's exercised through `wp_get_ability(...)->execute()` from MCP / Command Palette / agent harnesses.
- "Works in the test, breaks in MCP" — typical pattern when a test calls `Abilities_Registrar::execute_get_things( [] )` (passing an empty array) but the agent invocation goes through the indirect pipeline.
- A schema with all-optional properties still rejects zero-arg indirect calls because `null` is not an object.

### Fix — declare a top-level schema `default` for any zero-arg-allowed ability

```php
'input_schema' => [
    'type'       => 'object',
    'default'    => (object) array(),  // applied by normalize_input() on null inputs
    'properties' => [
        'per_page' => [ 'type' => 'integer', 'default' => 10 ],
        // ...
    ],
],
```

`(object) array()` is preferred over `[]` because it json-encodes to `{}` rather than the array literal `[]`, avoiding PHP's array/object ambiguity at the validator boundary.

### Distinguish from Gotcha 1

Top-level schema `default` is honored by `normalize_input()` and reaches the callback. Property-level `default` (Gotcha 1) is NOT — those values are dropped by the validator, and the callback has to defensively reapply them. Different layers, different fates.

If you've declared the top-level `default` in the schema, the PHP-level signature default exists only for direct callers. Don't add a third layer of fallback inside the callback that re-checks `if ( $input === null )` — three compensating defaults stacked on each other diffuses the meaning of "no input."

## Putting gotchas 1-3 together

A hardened execute callback for a list-style ability with a required ID, schema defaults, and backing pagination drift:

```php
public static function execute_get_thing_details( $input = null ) {
    if ( ! is_array( $input ) ) {
        $input = [];
    }

    // Gotcha 3: required-ID validation (not empty()).
    if ( ! isset( $input['thing_id'] )
        || ! is_string( $input['thing_id'] )
        || '' === $input['thing_id']
    ) {
        return new \WP_Error(
            '<plugin>_missing_thing_id',
            __( 'A thing_id is required.', '<text-domain>' )
        );
    }

    // Gotcha 1: apply defaults the Abilities API doesn't inject.
    if ( ! array_key_exists( 'include_history', $input ) || null === $input['include_history'] ) {
        $input['include_history'] = false;
    }
    $input['include_history'] = (bool) $input['include_history'];

    // Gotcha 2: translate pagination before delegating (only if backing reads a non-standard key).
    $input = self::translate_pagination_keys( $input );

    return self::delegate_to_rest_controller(
        '<Backing_Controller_Class>',
        'get_thing',
        '/my-plugin/v1/things/' . rawurlencode( $input['thing_id'] ),
        $input
    );
}
```

Each of the three lines the callback adds on top of the "just delegate" pattern has a paid-for bug behind it. Keep them.
