# Announce Dynamic Errors

Skill: wp-accessibility

Accessibility guidance should address dynamic status and error messaging, not just static semantics.

## Dynamic feedback is announced accessibly

**Given** a UI that displays validation or save-status messages without a full page reload
**When** the skill reviews or designs the interaction
**Then** it should ensure the message is announced to assistive technology using an appropriate live region or WordPress accessibility helper

### Examples

Pass:
```javascript
wp.a11y.speak( 'Settings saved successfully.' );
```

Fail:
```javascript
document.querySelector( '.notice' ).textContent = 'Settings saved successfully.';
```
Visible text alone may not be announced to screen reader users when it is injected dynamically.
