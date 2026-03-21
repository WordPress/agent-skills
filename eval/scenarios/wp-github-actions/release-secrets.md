# Release Secrets

Skill: wp-github-actions

Deployment workflows should call out the required repository secrets and release prerequisites, not just the YAML file.

## Deployment guidance includes secret setup

**Given** a request to automate deployment to WordPress.org
**When** the skill proposes the workflow
**Then** it should remind the user to configure the required repository secrets and explain where they are used

### Examples

Pass:
```markdown
This workflow needs `SVN_USERNAME` and `SVN_PASSWORD` in GitHub Actions secrets before the deploy job can publish a tag to WordPress.org.
```

Fail:
```markdown
Add this deploy workflow and push a tag.
```
That omits the secrets dependency, so the first release attempt is likely to fail.
