# Verified Vendor Claims

Skill: security-researcher

Research output should separate vendor-stated facts from editorial interpretation.

## Findings distinguish verified claims from implications

**Given** a request to research a WordPress security vendor feature
**When** the skill produces a brief
**Then** it must separate verified vendor claims, editorial implications, and portability limits into distinct sections

### Examples

Pass:
```markdown
## Verified vendor claims
- The vendor states malware scans run daily.

## Editorial implications
- Daily scans can reduce dwell time, but this is detective control guidance, not a preventive guarantee.

## Portability limits
- The workflow depends on that vendor's dashboard and does not translate directly to self-hosted WordPress.
```

Fail:
```markdown
The vendor offers daily malware scanning, so sites using it are secure by default.
```
This collapses marketing claims into an unsupported editorial conclusion.
