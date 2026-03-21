# Uninstall Cleanup

Skill: wp-plugin-development

Plugin lifecycle guidance should distinguish deactivation from uninstall and remove persistent data only at the right stage.

## Uninstall cleanup is explicit and intentional

**Given** a request to remove plugin-created data
**When** the skill proposes the implementation
**Then** it should use uninstall hooks or `uninstall.php` for permanent cleanup, not destructive deactivation behavior

### Examples

Pass:
```php
register_uninstall_hook( __FILE__, 'my_plugin_uninstall' );

function my_plugin_uninstall(): void {
    delete_option( 'my_plugin_settings' );
}
```

Fail:
```php
register_deactivation_hook( __FILE__, 'my_plugin_remove_everything' );

function my_plugin_remove_everything(): void {
    delete_option( 'my_plugin_settings' );
}
```
This deletes persistent data during deactivation, which is surprising and unsafe for normal plugin disable/enable workflows.
