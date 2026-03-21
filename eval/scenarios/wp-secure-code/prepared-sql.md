# Prepared SQL

Skill: wp-secure-code

Security guidance must reject interpolated SQL and point to WordPress-safe query patterns.

## SQL examples use prepared statements

**Given** a WordPress code example that queries the database with user-controlled input
**When** the skill writes or reviews the code
**Then** it should require `$wpdb->prepare()` or another safe API instead of string interpolation

### Examples

Pass:
```php
$sql = $wpdb->prepare(
    "SELECT * FROM {$wpdb->posts} WHERE post_author = %d",
    $author_id
);
```

Fail:
```php
$sql = "SELECT * FROM {$wpdb->posts} WHERE post_author = $author_id";
```
Interpolating user-influenced data into SQL invites injection and bypasses WordPress-safe patterns.
