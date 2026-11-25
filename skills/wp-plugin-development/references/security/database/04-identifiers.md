# Database Operations: Allowlist Identifiers

**Prohibited**

- Using a sanitized request value as a table name, column name, or `ORDER BY` key without an allowlist. `sanitize_key()` and `sanitize_text_field()` make a value well-formed, but they do not make it safe to choose which identifier the query acts on.

**Required**

- Treat table names, column names, `ORDER BY` keys, and other identifiers from the request as unsafe unless they come from an allowlist. Pass allowlisted identifiers through `%i` (WordPress 6.2+). If the plugin's `Requires at least` is below 6.2, interpolate only the allowlisted constant value.

**Exceptions:** None.

## Code

Shows: treat table names, column names, and `ORDER BY` keys from the request as unsafe unless they come from an allowlist, and pass them through `%i`.

```php
// $requested_orderby and $requested_order hold the unslashed, sanitized request values.

// Unsafe: sanitized, but the request still chooses the column.
$wpdb->get_results( "SELECT * FROM {$wpdb->prefix}myplugin_items ORDER BY $requested_orderby" );

// Safe: the request can only pick from a fixed list, and %i quotes the identifier.
$orderby = in_array( $requested_orderby, array( 'title', 'created_at' ), true ) ? $requested_orderby : 'created_at';
$order   = 'asc' === $requested_order ? 'ASC' : 'DESC';
$wpdb->get_results(
	$wpdb->prepare(
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $order is the constant 'ASC' or 'DESC'.
		"SELECT * FROM %i ORDER BY %i $order",
		$wpdb->prefix . 'myplugin_items',
		$orderby
	)
);
```

TODO: add a sample for a request-chosen table name going through the allowlist and `%i`.

TODO: add the pre-6.2 fallback, which interpolates only the allowlisted constant value because `%i` is not available.

## Attack methodology

SQL injection

Security bulletins:
- CWE-89, Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
- OWASP A03:2021, Injection

- **Request-chosen identifier → data exposure.** The attacker passes a subquery as `orderby`, and the order of the results reveals data one comparison at a time. Fix: an allowlist, plus `%i` for the identifier.
