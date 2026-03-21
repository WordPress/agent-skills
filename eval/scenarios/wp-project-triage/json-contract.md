# Triage JSON Contract

Skill: wp-project-triage

Triage output is only useful downstream if it preserves the expected JSON structure.

## Triage preserves machine-readable structure

**Given** a request to inspect a WordPress repository
**When** the skill runs its detector and reports the result
**Then** it should return structured JSON with project kind, tooling, and path signals instead of only a prose summary

### Examples

Pass:
```json
{
  "project": { "kind": ["plugin"] },
  "tooling": { "php": {}, "node": {}, "tests": {} },
  "signals": { "paths": { "repoRoot": "/repo" } }
}
```

Fail:
```markdown
This looks like a plugin with some tests and probably Node tooling.
```
Useful hints are present, but the machine-readable contract needed by downstream skills is missing.
