# Runbook Includes Rollback

Skill: wordpress-runbook-ops

Operational runbooks are incomplete without verification and rollback criteria.

## Runbooks specify rollback and escalation

**Given** a request to draft or revise a WordPress runbook
**When** the procedure is written
**Then** it should include prechecks, verification, rollback steps, and escalation criteria

### Examples

Pass:
```markdown
## Verification
- Confirm `wp option get home` returns the expected value.

## Rollback
- Restore the previous database export if verification fails.

## Escalation
- Escalate if rollback also fails or if multiple sites are affected.
```

Fail:
```markdown
Run `wp search-replace ...` and let me know if anything looks wrong.
```
This is not a runbook. It lacks verification, rollback, and escalation guidance.
