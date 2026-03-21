# Studio Site Diagnostics

Skill: studio

Troubleshooting in WordPress Studio should start with deterministic environment checks, not generic WordPress advice.

## Diagnostics start with Studio-specific checks

**Given** a broken WordPress Studio site
**When** the skill proposes a debugging workflow
**Then** it should inspect the Studio-managed site, bundled tools, and local conflicts before suggesting application-level changes

### Examples

Pass:
```markdown
1. Confirm the Studio site exists and is selected in the app.
2. Check the generated site path and bundled WP-CLI/PHP versions.
3. Inspect logs and local port conflicts.
4. Only after environment checks pass, move to plugin/theme debugging.
```

Fail:
```markdown
Deactivate all plugins and reinstall WordPress.
```
This skips the Studio environment layer and risks destroying useful debugging context.
