# Input: Cast Numeric IDs

**Prohibited**

- Treating a cast as authorization. `absint()` converts an ID to a non-negative integer; it does not mean the current user may act on that object.
- Treating `absint()` as format validation. It converts malformed input instead of rejecting it.

**Required**

- Convert numeric IDs with `absint()` before use, and reject `0`. Conversion does not authorize access to that object, so check the matching capability (for example `current_user_can( 'read_post', $post_id )`) before acting on it, and use `%d` in `$wpdb->prepare()` for SQL.
- `read_post`, `edit_post`, and `delete_post` apply to posts only. For a row in a plugin's custom table, the object-level check is a plugin capability or an owner comparison (for example the row's owner ID against `get_current_user_id()`).
- `absint()` is coercion, not validation: it returns `abs( (int) $value )`. It converts `'5abc'` and `'-5'` to `5`, `'1e3'` to `1000`, a non-empty array such as `post_id[]=5` to `1`, and an integer string above `PHP_INT_MAX` to `PHP_INT_MAX`. The `0` check rejects any input that converts to `0` (for example a missing or empty value, `'abc'`, `'0'`, `'0.5'`, or an empty array), not every malformed ID. Run the capability check on the converted ID, because that is the object the code acts on.
- `%d` in `$wpdb->prepare()` already casts to an integer, so it blocks injection on its own. `absint()` makes the value a non-negative integer, and the `0` check rejects any ID that converts to `0` before any query runs. Casting is the integer case of `03-validate-sanitize-type.md`.

**Exceptions:** None.

## Code

Shows: convert the ID with `absint()`, return 400 when it converts to `0`, return 403 when the object-level capability check fails, and pass the ID through `%d`.

```php
/*
 * Unsafe: the ID is sanitized as text, not cast to an integer, so a value such
 * as "1 UNION SELECT user_pass FROM wp_users" stays intact and is interpolated
 * into the query. Nothing checks that the current user may read the post, so
 * changing the number also exposes private and draft posts.
 */
$post_id = sanitize_text_field( wp_unslash( $_POST['post_id'] ?? '' ) );
$title   = $wpdb->get_var( "SELECT post_title FROM {$wpdb->posts} WHERE ID = $post_id" );

// Safe: reject an ID that converts to 0 before checking the user's capability.
$post_id = absint( wp_unslash( $_POST['post_id'] ?? '' ) );
if ( ! $post_id ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( 'read_post', $post_id ) ) {
	wp_send_json_error( null, 403 );
}
$title = $wpdb->get_var(
	$wpdb->prepare( "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $post_id )
);
```

## Attack methodology

### SQL injection

Security bulletins:
- CWE-89, Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
- OWASP A03:2021, Injection

- **Uncast ID → SQL injection → credential disclosure.** The ID is sanitized as text and interpolated into the query, so `1 UNION SELECT user_pass FROM wp_users` returns a password hash where the title should be. The injection comes from the interpolation; a `%d` placeholder alone would have stopped it. Fix: `absint()`, reject `0`, and `%d` in `$wpdb->prepare()`.

### Insecure direct object reference (IDOR)

Security bulletins:
- CWE-639, Authorization Bypass Through User-Controlled Key
- OWASP A01:2021, Broken Access Control

- **Cast ID, no capability check → insecure direct object reference.** The ID is a clean integer, but the attacker changes it to the ID of a private or draft post, or another user's row, and the handler returns it. Casting does not stop this. Fix: check the object-level capability (`read_post` for posts, a plugin capability or owner comparison for custom tables).
