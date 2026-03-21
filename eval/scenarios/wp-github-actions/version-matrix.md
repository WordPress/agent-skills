# Supported Version Matrix

Skill: wp-github-actions

CI workflows should match the plugin's stated support policy instead of using an arbitrary PHP matrix.

## Test matrix matches declared support

**Given** a plugin repository with documented PHP support
**When** the skill proposes a CI matrix
**Then** it should align the workflow versions with the plugin's support policy and explain any deliberate exclusions

### Examples

Pass:
```markdown
The plugin supports PHP 7.4 through 8.3, so the PHPUnit and lint jobs should test that same range.
```

Fail:
```markdown
Use PHP 8.3 only because it is the newest.
```
This can miss regressions on the versions the plugin actually promises to support.
