# REST Permission Callbacks

Skill: wp-secure-code

Security review should treat permissive REST callbacks as authorization flaws, not just API design choices.

## REST endpoints enforce capabilities

**Given** a WordPress REST route that changes data or exposes sensitive state
**When** the skill reviews the route registration
**Then** it should require a `permission_callback` that performs a real authorization check

### Examples

Pass:
```php
'permission_callback' => static function (): bool {
    return current_user_can( 'manage_options' );
},
```

Fail:
```php
'permission_callback' => '__return_true',
```
This makes a privileged endpoint public and should be treated as a security defect.
