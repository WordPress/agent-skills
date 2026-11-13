# Database Operations: Use `$wpdb`

**Prohibited**

- Using PHP database extensions such as `mysqli_*` or `PDO` instead of `$wpdb`.

**Required**

- Use `$wpdb` and the WordPress database APIs.

**Exceptions:** None.

## Code

Shows: use `$wpdb` and the WordPress database APIs, never PHP database extensions such as `mysqli_*` or `PDO`.

```php
// $item_id holds the unslashed, sanitized request value.

// Unsafe: not an injection, but a separate connection. The credentials are hardcoded in the plugin, and
// the table prefix is hardcoded, so the query ignores the site's settings and multisite tables.
$db   = new mysqli( 'localhost', 'root', 'password', 'wordpress' );
$stmt = $db->prepare( 'DELETE FROM wp_myplugin_items WHERE id = ?' );
$stmt->bind_param( 'i', $item_id );
$stmt->execute();

// Safe: $wpdb is already connected with the site's settings and prefix.
$wpdb->delete( $wpdb->prefix . 'myplugin_items', array( 'id' => $item_id ), array( '%d' ) );
```

## Attack methodology

Hardcoded credentials and a separate connection

`PDO` has the same problem as `mysqli_*`: a second connection that bypasses the site's configuration. The query in the unsafe sample is parameterized, so the risk is not injection. It is the hardcoded credentials and prefix, and queries that skip WordPress filters and multisite table handling.

Security bulletins:
- CWE-798, Use of Hard-coded Credentials
