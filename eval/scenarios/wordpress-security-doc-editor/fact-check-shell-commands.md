# Fact-Check Shell Commands

Skill: wordpress-security-doc-editor

Security docs should validate embedded commands and avoid editorial claims that are not grounded in sources.

## Edits preserve technical correctness

**Given** a WordPress security documentation edit
**When** the skill rewrites or polishes the document
**Then** it should preserve command correctness and explicitly flag claims that need source validation

### Examples

Pass:
```markdown
Verified command:
`wp plugin list --status=active`

Note:
The draft claims this plugin is "secure by default"; that statement needs a source or should be softened.
```

Fail:
```markdown
Rewritten command:
`wp plugins active`

This setting is completely secure.
```
The command is invalid and the claim is overstated without evidence.
