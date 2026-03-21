# View Script Module and Directives

Skill: wp-interactivity-api

Interactivity API guidance should connect directives in markup to the module-based client entrypoint.

## Advice covers both markup and module wiring

**Given** a request to add Interactivity API behavior to a block
**When** the skill outlines the implementation
**Then** it should address both `data-wp-*` directives in markup and the `viewScriptModule` or equivalent module wiring

### Examples

Pass:
```markdown
1. Add the required `data-wp-interactive` and related directives to the rendered markup.
2. Register the module via the block's `viewScriptModule`.
3. Verify hydration and action/state behavior in the browser.
```

Fail:
```markdown
Add a `click` listener in jQuery and call it done.
```
This bypasses the Interactivity API model rather than using it.
