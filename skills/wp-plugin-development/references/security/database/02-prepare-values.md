# Database Operations: Prepare Every Dynamic Value

**Prohibited**

- Concatenating user input into SQL.
- Executing SQL taken from request parameters.
- Treating sanitization as a substitute for `$wpdb->prepare()`. `sanitize_text_field()` and similar functions make a value well-formed, but they keep quotes and SQL keywords, so a sanitized value can still change the query.

**Required**

- Prefer `$wpdb->insert()` / `update()` / `delete()` with a formats array for simple writes.
- Use `$wpdb->prepare()` for every dynamic value.

**Exceptions:** None.

## Code

Shows: use `$wpdb->prepare()` for every dynamic value, and prefer `$wpdb->insert()` / `update()` / `delete()` with a formats array for simple writes.

```php
// $title and $item_id hold the unslashed, sanitized request values.

// Unsafe: sanitizing does not stop a quote or SQL fragment from changing the query.
$wpdb->query( "UPDATE {$wpdb->prefix}myplugin_items SET title = '$title' WHERE id = $item_id" );

// Safe: a simple write uses the formats array, and $wpdb->update() prepares the values.
$wpdb->update(
	$wpdb->prefix . 'myplugin_items',
	array( 'title' => $title ),
	array( 'id' => $item_id ),
	array( '%s' ),
	array( '%d' )
);

// Safe: a read or complex write uses prepare() with one placeholder per value.
$row = $wpdb->get_row(
	$wpdb->prepare(
		"SELECT * FROM {$wpdb->prefix}myplugin_items WHERE id = %d AND title = %s",
		$item_id,
		$title
	)
);
```

## Attack methodology

SQL injection

Security bulletins:
- CWE-89, Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
- OWASP A03:2021, Injection

- **Unprepared value → SQL injection → data disclosure or modification.** The attacker submits a title containing a quote, for example `x', title = (SELECT user_pass FROM wp_users LIMIT 1), status = '`. Sanitization does not help, because `sanitize_text_field()` strips tags but keeps quotes and SQL keywords. The query rewrites another column with a password hash, and the page prints it. Fix: pass every value through `$wpdb->prepare()` placeholders, or use `$wpdb->update()` with a formats array.
