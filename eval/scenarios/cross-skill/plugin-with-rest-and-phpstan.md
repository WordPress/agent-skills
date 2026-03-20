# Plugin with REST API and PHPStan

Skill: wp-plugin-development, wp-rest-api, wp-phpstan

A WordPress plugin that exposes REST endpoints must satisfy the constraints of all three skills simultaneously. This scenario tests that cross-skill requirements don't conflict.

## REST endpoints in plugins follow both skill sets

**Given** a WordPress plugin that registers REST API routes
**When** the plugin code is reviewed
**Then** it must satisfy wp-plugin-development security requirements AND wp-rest-api schema/permission requirements

### Examples

Pass:
```php
// Plugin registers route with full security stack
add_action( 'rest_api_init', function () {
    register_rest_route( 'my-plugin/v1', '/settings', [
        'methods'             => WP_REST_Server::EDITABLE,
        'callback'            => [ $this, 'update_settings' ],
        'permission_callback' => function () {
            return current_user_can( 'manage_options' );
        },
        'args' => [
            'value' => [
                'type'              => 'string',
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ],
    ] );
} );
```
Satisfies: permission_callback (wp-rest-api), capability check (wp-plugin-development), input sanitization (both), arg schema (wp-rest-api).

Fail:
```php
add_action( 'rest_api_init', function () {
    register_rest_route( 'my-plugin/v1', '/settings', [
        'methods'  => WP_REST_Server::EDITABLE,
        'callback' => [ $this, 'update_settings' ],
    ] );
} );
```
Missing: permission_callback (wp-rest-api violation), no capability check (wp-plugin-development violation), no arg schema (wp-rest-api violation).

## PHPStan covers REST controller code

**Given** a plugin with REST controllers and a PHPStan configuration
**When** PHPStan analysis paths are defined
**Then** the REST controller files must be included in the analysis paths

### Examples

Pass:
```neon
parameters:
    paths:
        - plugin.php
        - inc/
        - includes/rest-api/
```

Fail:
```neon
parameters:
    paths:
        - plugin.php
        - inc/
    excludePaths:
        - inc/rest-api/
```
REST controllers excluded from static analysis. Type errors and missing return types in API code won't be caught.
