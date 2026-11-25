# Database Operations: Combined Query

**Prohibited**

None specific to this directive. All prohibitions in DB-2, DB-3, and DB-4 apply.

**Required**

- Apply DB-2, DB-3, and DB-4 together in a single `$wpdb->prepare()` call: every dynamic value prepared, one placeholder per list item with an empty list handled first, and every identifier from an allowlist and passed through `%i`.

**Exceptions:** None.

## Code

Shows: the rules together. An allowlisted identifier, a fixed direction, and one placeholder per id in a single query.

```php
// Unsafe: sanitized, but identifier and list are still interpolated from the request.
$orderby = sanitize_text_field( wp_unslash( $_GET['orderby'] ?? '' ) );
$ids     = sanitize_text_field( wp_unslash( $_GET['ids'] ?? '' ) );
$wpdb->get_results( "SELECT * FROM {$wpdb->prefix}myplugin_items WHERE id IN ($ids) ORDER BY $orderby" );

// Safe: allowlisted identifier, fixed direction, one placeholder per id.
// $requested_* hold the unslashed, sanitized request values.
$orderby = in_array( $requested_orderby, array( 'title', 'created_at' ), true ) ? $requested_orderby : 'created_at';
$order   = 'asc' === $requested_order ? 'ASC' : 'DESC';
$ids     = array_filter( array_map( 'absint', (array) $requested_ids ) );
if ( ! $ids ) {
	return array();
}
$in = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );
// Safely prepare and execute the SQL query with placeholders and allowlisted identifiers.
$wpdb->get_results(
	$wpdb->prepare(
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $in holds only %d placeholders and $order is the constant 'ASC' or 'DESC'.
		"SELECT * FROM %i WHERE id IN ($in) ORDER BY %i $order",
		array_merge( array( $wpdb->prefix . 'myplugin_items' ), $ids, array( $orderby ) )
	)
);
```

## Attack methodology

SQL injection

Security bulletins:
- CWE-89, Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
- OWASP A03:2021, Injection

- **Two injection points in one query.** The list and the sort key are separate routes into the same statement, and fixing one leaves the other open. Fixing only the list with `%d` placeholders still lets a subquery through `orderby`. Fix: close both, as in the safe sample.
