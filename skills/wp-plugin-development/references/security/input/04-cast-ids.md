# Input: Cast Numeric IDs

**Prohibited**

- Treating a cast as authorization. `absint()` makes an ID well-formed; it does not mean the current user may act on that object.

**Required**

- Cast numeric IDs to positive integers with `absint()` before use, and reject `0`. A cast makes the value well-formed; it does not authorize access to that object, so check the matching capability (for example `current_user_can( 'read_post', $post_id )`) before acting on it, and use `%d` in `$wpdb->prepare()` for SQL.
- `read_post`, `edit_post`, and `delete_post` apply to posts only. For a row in a plugin's custom table, the object-level check is a plugin capability or an owner comparison (for example the row's owner ID against `get_current_user_id()`).
- `%d` in `$wpdb->prepare()` already casts to an integer, so it blocks injection on its own. `absint()` adds a guaranteed non-negative integer (non-numeric input becomes `0`), and the `0` check rejects missing or invalid IDs before any query runs. Casting is the integer case of `03-validate-sanitize-type.md`.

**Exceptions:** None.

## Code

Shows: cast the ID with `absint()`, reject `0`, check the object-level capability, and pass the ID through `%d`.

```php
/*
 * Unsafe: the ID is sanitized as text, not cast to an integer, so a value such
 * as "1 UNION SELECT user_pass FROM wp_users" stays intact and is interpolated
 * into the query. Nothing checks that the current user may read the post, so
 * changing the number also exposes private and draft posts.
 */
$post_id = sanitize_text_field( wp_unslash( $_POST['post_id'] ?? '' ) );
$title   = $wpdb->get_var( "SELECT post_title FROM {$wpdb->posts} WHERE ID = $post_id" );

// Safe: positive integer, 0 rejected, object-level capability checked, value prepared.
$post_id = absint( wp_unslash( $_POST['post_id'] ?? '' ) );
if ( ! $post_id || ! current_user_can( 'read_post', $post_id ) ) {
	wp_send_json_error( null, 403 );
}
$title = $wpdb->get_var(
	$wpdb->prepare( "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $post_id )
);
```

## Attack methodology

SQL injection; insecure direct object reference (IDOR)

Security bulletins:
- CWE-89, Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
- CWE-639, Authorization Bypass Through User-Controlled Key
- OWASP A03:2021, Injection
- OWASP A01:2021, Broken Access Control

- **Uncast ID → SQL injection → credential disclosure.** The ID is sanitized as text and interpolated into the query, so `1 UNION SELECT user_pass FROM wp_users` returns a password hash where the title should be. The injection comes from the interpolation; a `%d` placeholder alone would have stopped it. Fix: `absint()`, reject `0`, and `%d` in `$wpdb->prepare()`.
- **Cast ID, no capability check → insecure direct object reference.** The ID is a clean integer, but the attacker changes it to the ID of a private or draft post, or another user's row, and the handler returns it. Casting does not stop this. Fix: check the object-level capability (`read_post` for posts, a plugin capability or owner comparison for custom tables).
