# Style Variation File

Skill: wp-block-themes

Style variations in block themes should be implemented with the theme's native file conventions.

## Style variations use `styles/*.json`

**Given** a request to add a new block theme style variation
**When** the skill describes the implementation
**Then** it should place the variation in `styles/*.json` and explain how it will appear in the Site Editor

### Examples

Pass:
```markdown
Create `styles/sunrise.json` with the variation metadata and theme settings/styles overrides, then verify it appears in the global styles variation picker.
```

Fail:
```markdown
Add a new stylesheet in `assets/css/sunrise.css` and tell users to swap files manually.
```
That does not use the block theme variation system the skill is responsible for.
