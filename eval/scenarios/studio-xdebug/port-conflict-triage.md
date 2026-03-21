# Xdebug Port Conflict Triage

Skill: studio-xdebug

Most Studio Xdebug failures come from environment conflicts, especially port 9003 contention.

## Setup guidance checks debugger transport first

**Given** a report that Xdebug will not connect from WordPress Studio
**When** the skill outlines next steps
**Then** it should check whether port 9003 is already in use and verify the active PHP/Xdebug configuration before suggesting IDE changes

### Examples

Pass:
```markdown
1. Check whether another process is already listening on port 9003.
2. Confirm Studio's PHP binary is the one loading Xdebug.
3. Verify VS Code is listening with the expected host and port.
4. Review the error log for connection attempts before changing breakpoints.
```

Fail:
```markdown
Install the PHP Debug extension again.
```
Reinstalling the editor extension does not address the common root cause: a transport or binary mismatch.
