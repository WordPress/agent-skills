# Repo Health Files

Skill: github-repo

Repository quality recommendations should cover the baseline health files and contributor workflows, not just README polish.

## Audit calls out missing governance files

**Given** a repository audit task
**When** the skill finds a public repo missing core community files
**Then** it should explicitly recommend files such as `SECURITY.md`, templates, and `CODEOWNERS`

### Examples

Pass:
```markdown
Missing repo-health basics:
- Add `SECURITY.md` with a private reporting path
- Add issue forms and a pull request template
- Add `CODEOWNERS` so review responsibility is explicit
```

Fail:
```markdown
Recommendations:
- Add more badges
- Rewrite the README intro
- Consider a logo
```
This ignores higher-priority governance gaps that affect contribution quality and project trust.
