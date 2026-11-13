# Database Operations: Dynamic Lists

**Prohibited**

- Treating sanitization as a substitute for casting and placeholders in a list. `sanitize_text_field()` keeps quotes, commas, and SQL keywords, so a sanitized list can still add a clause to the query.

**Required**

- Generate one placeholder per item in a dynamic list, and handle an empty list before querying.

**Exceptions:** None.

## Code

Shows: generate one placeholder per item in a dynamic list, and handle an empty list before querying.

```php
// $requested_ids holds the unslashed request value.

// Unsafe: the list is sanitized as text and interpolated into the query.
$ids = sanitize_text_field( $requested_ids );
$wpdb->get_results( "SELECT * FROM {$wpdb->prefix}myplugin_items WHERE id IN ($ids)" );

// Safe: every item is cast, an empty list stops early, and each id gets a %d placeholder.
$ids = array_filter( array_map( 'absint', (array) $requested_ids ) );
if ( ! $ids ) {
	return array();
}
$in = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );
$wpdb->get_results(
	$wpdb->prepare(
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $in holds only %d placeholders.
		"SELECT * FROM {$wpdb->prefix}myplugin_items WHERE id IN ($in)",
		$ids
	)
);
```

## Attack methodology

SQL injection

Security bulletins:
- CWE-89, Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
- OWASP A03:2021, Injection

- **Uncast value or list → SQL injection → credential disclosure.** The attacker sends `ids=1) UNION SELECT user_pass FROM wp_users -- `. Sanitization does not help, because `sanitize_text_field()` strips tags but keeps SQL keywords. The query returns password hashes in a field the page prints, and they can be cracked offline. Fix: cast every item with `absint()` *and* use one `%d` placeholder per item.
