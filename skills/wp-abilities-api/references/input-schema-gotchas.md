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
public function test_execute_returns_wp_error_when_id_not_a_string(): void {
    $result = My_Plugin_Abilities::execute_get_thing( [ 'order_id' => 123 ] );
    $this->assertInstanceOf( \WP_Error::class, $result );
    $this->assertSame( '<plugin>_missing_order_id', $result->get_error_code() );
}
```

The integer `123` is a fine canary — it's non-empty, it `isset`s, but it's not a string. A callback that only uses `isset` + `empty` would false-pass this input and fall through to the URL construction with an integer argument.

## Putting the three together

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
