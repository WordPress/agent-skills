# Input: Read Explicit Keys and Unslash

**Prohibited**

None.

**Required**

- Never process a whole `$_POST` / `$_GET` / `$_REQUEST` array; read explicit keys and apply `wp_unslash()` before sanitizing.

**Exceptions:** None.

## Code

Shows: read only the keys the handler expects, unslash each one, and sanitize it for its type, instead of storing or looping over the whole request array.

```php
/*
 * Unsafe: the whole request array is stored. Any key the attacker adds is
 * saved with it, and no value is unslashed or sanitized.
 */
update_option( 'myplugin_settings', $_POST );

// Safe: read the keys the form owns, unslash each one, sanitize it for its type.
$color = wp_unslash( $_POST['color'] ?? '' );
if ( ! is_string( $color ) ) {
	wp_send_json_error( null, 400 );
}
$color = sanitize_hex_color( $color );
if ( '' === $color || null === $color ) {
	wp_send_json_error( null, 400 );
}
$settings = array(
	'color'   => $color,
	'columns' => absint( wp_unslash( $_POST['columns'] ?? 0 ) ),
	'title'   => sanitize_text_field( wp_unslash( $_POST['title'] ?? '' ) ),
);
update_option( 'myplugin_settings', $settings );
```

## Attack methodology

Mass assignment

Security bulletins:
- CWE-915, Improperly Controlled Modification of Dynamically-Determined Object Attributes
- OWASP A08:2021, Software and Data Integrity Failures

- **Whole-array write → attacker-added key → setting the form never offered.** The handler saves `$_POST` as the settings array. The attacker adds a key the form does not show but the plugin reads later, such as a capability or "allow public access" setting, and the plugin trusts it on the next request. Fix: read explicit keys only, each unslashed and sanitized for its type.
