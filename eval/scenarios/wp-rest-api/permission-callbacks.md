# Permission Callbacks

Skill: wp-rest-api

Every REST route must have an explicit permission callback. WordPress requires this — routes without one will trigger a `_doing_it_wrong` notice and default to public access.

## Every route has a permission_callback

**Given** a REST route registration
**When** `register_rest_route` is called
**Then** the route array must include a `permission_callback` key

### Examples

Pass:
```php
register_rest_route( 'my-plugin/v1', '/items', [
    'methods'             => WP_REST_Server::READABLE,
    'callback'            => 'my_plugin_get_items',
    'permission_callback' => 'my_plugin_can_read_items',
] );
```

Fail:
```php
register_rest_route( 'my-plugin/v1', '/items', [
    'methods'  => WP_REST_Server::READABLE,
    'callback' => 'my_plugin_get_items',
] );
```
Missing `permission_callback`. WordPress will issue a `_doing_it_wrong` notice and the endpoint defaults to public — anyone can access it.

## Write endpoints require authentication

**Given** a REST route that creates, updates, or deletes data
**When** the permission callback is defined
**Then** it must check a specific capability, not return `true`

### Examples

Pass:
```php
'permission_callback' => function ( WP_REST_Request $request ): bool {
    return current_user_can( 'edit_posts' );
},
```

Fail:
```php
'permission_callback' => '__return_true',
```
Public write endpoint. Use `__return_true` only for intentionally public read endpoints (like a public API).

## Per-item permission checks load the item

**Given** a REST route for a single item (e.g., `/items/(?P<id>\d+)`)
**When** the permission callback runs
**Then** it should load the item and verify the user has permission for that specific item

### Examples

Pass:
```php
public function update_item_permissions_check( $request ): bool|WP_Error {
    $post = get_post( $request['id'] );
    if ( ! $post ) {
        return new WP_Error( 'not_found', 'Item not found.', [ 'status' => 404 ] );
    }
    return current_user_can( 'edit_post', $post->ID );
}
```

Fail:
```php
public function update_item_permissions_check( $request ): bool {
    return current_user_can( 'edit_posts' );
}
```
Checks generic capability but not ownership. A user with `edit_posts` can update any item, even ones belonging to other users.
