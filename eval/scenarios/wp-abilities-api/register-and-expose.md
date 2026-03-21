# Register and Expose Abilities

Skill: wp-abilities-api

Ability work is incomplete if registration and REST exposure do not line up.

## Guidance covers registration and client visibility

**Given** a task to add a new ability
**When** the skill proposes the implementation
**Then** it should address PHP registration, category/meta details, and how the ability becomes visible to clients

### Examples

Pass:
```markdown
1. Register the ability in PHP with `wp_register_ability()`.
2. Assign it to the correct category and metadata.
3. Confirm it appears through the abilities REST endpoint for authorized clients.
4. Verify client-side checks use the exposed ability consistently.
```

Fail:
```markdown
Add a string constant in JavaScript and check it in the UI.
```
This bypasses the server-side registration and REST exposure model that the skill is meant to enforce.
