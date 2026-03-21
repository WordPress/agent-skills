# Schema and Argument Validation

Skill: wp-rest-api

REST guidance should use route argument schemas so input is validated before callbacks run.

## Route arguments define validation and sanitization

**Given** a custom REST endpoint that accepts request parameters
**When** the skill shows the route registration
**Then** it should include an `args` schema with type information and validation or sanitization callbacks where needed

### Examples

Pass:
```php
register_rest_route( 'my-plugin/v1', '/item', [
    'methods'             => WP_REST_Server::CREATABLE,
    'callback'            => 'my_plugin_create_item',
    'permission_callback' => 'my_plugin_can_edit',
    'args'                => [
        'title' => [
            'type'              => 'string',
            'required'          => true,
            'sanitize_callback' => 'sanitize_text_field',
        ],
    ],
] );
```

Fail:
```php
register_rest_route( 'my-plugin/v1', '/item', [
    'methods'             => WP_REST_Server::CREATABLE,
    'callback'            => 'my_plugin_create_item',
    'permission_callback' => 'my_plugin_can_edit',
] );
```
The callback receives unchecked input because the route does not define an argument schema.
