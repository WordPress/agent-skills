# No Runtime File Writes

Skill: wp-vip-standards

VIP guidance should reject runtime filesystem writes and route users to approved alternatives.

## Recommendations avoid disallowed filesystem writes

**Given** code intended for WordPress VIP Go
**When** the skill reviews a feature that writes files at runtime
**Then** it should flag the pattern as incompatible with VIP constraints and recommend a supported approach

### Examples

Pass:
```markdown
Do not write generated files to local disk at runtime on VIP. Store derived data in object cache, the database, or a build artifact instead.
```

Fail:
```markdown
Write the generated sitemap to `/tmp` on every request and serve it from there.
```
This conflicts with VIP filesystem expectations and is not a supported deployment-time pattern.
