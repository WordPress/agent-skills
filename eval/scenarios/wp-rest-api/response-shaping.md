# Response Shaping

Skill: wp-rest-api

REST responses should return structured data and status codes through WordPress response helpers instead of ad hoc arrays or direct output.

## Endpoints return proper REST responses

**Given** a REST callback that creates or updates a resource
**When** the skill shows the response
**Then** it should use `rest_ensure_response()` or `WP_REST_Response` with an explicit status code when the operation changes state

### Examples

Pass:
```php
$response = new WP_REST_Response( [ 'id' => $post_id ], 201 );
$response->header( 'Location', rest_url( 'my-plugin/v1/items/' . $post_id ) );
return $response;
```

Fail:
```php
echo wp_json_encode( [ 'id' => $post_id ] );
exit;
```
This bypasses the REST response system and loses headers, status codes, and middleware behavior.
