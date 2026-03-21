# Output Escaping

Skill: wp-secure-code

Security guidance must distinguish input sanitization from output escaping.

## Dynamic output is escaped at render time

**Given** user-controlled or database-derived content rendered into HTML
**When** the skill writes or reviews the output code
**Then** it should escape at the point of output with the context-appropriate WordPress helper

### Examples

Pass:
```php
printf(
    '<a href="%s">%s</a>',
    esc_url( $url ),
    esc_html( $label )
);
```

Fail:
```php
$label = sanitize_text_field( $_POST['label'] );
echo '<a href="' . $url . '">' . $label . '</a>';
```
Sanitizing once on input does not replace escaping for the final HTML output context.
