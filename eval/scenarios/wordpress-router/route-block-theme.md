# Route Block Theme Work

Skill: wordpress-router

Routing should classify the repo correctly before recommending domain-specific skills.

## Block theme tasks route to block-theme workflows

**Given** a request about `theme.json`, templates, or style variations in a WordPress theme
**When** the router decides which skills to activate
**Then** it should route to `wp-block-themes` instead of generic plugin or REST workflows

### Examples

Pass:
```markdown
Detected block theme work (`theme.json`, `templates/`, `styles/`).
Route to:
1. `wordpress-router`
2. `wp-project-triage`
3. `wp-block-themes`
```

Fail:
```markdown
Route to `wp-plugin-development` because the repo contains PHP files.
```
This ignores the stronger theme-specific signals and sends the task to the wrong workflow.
