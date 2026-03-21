# Plugin CI Minimum

Skill: wp-github-actions

CI setup advice should match the plugin's tooling and include a practical minimum quality gate.

## Workflow recommendations cover relevant checks

**Given** a WordPress plugin repository that uses Composer and JavaScript assets
**When** the skill proposes GitHub Actions workflows
**Then** it should recommend WPCS or PHPCS, tests, and the JS build or lint step that matches the repo

### Examples

Pass:
```markdown
Suggested workflows:
- PHP coding standards with Composer-installed WPCS
- PHPUnit on supported PHP versions
- Node-based asset build or lint step for block/editor code
```

Fail:
```markdown
Add a single workflow that just runs `echo "CI"`.
```
This does not create meaningful quality gates for a WordPress plugin.
