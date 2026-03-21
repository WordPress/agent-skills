# Findings Include Evidence

Skill: wp-performance-review

A performance review should produce concrete findings tied to code, not vague optimization advice.

## Review output cites code paths and impact

**Given** a performance code review request
**When** the skill reports issues
**Then** it should identify specific hotspots with file references, cause, and expected impact

### Examples

Pass:
```markdown
P1: Unbounded `WP_Query` on every request in `includes/feed.php:87`
Impact: high query volume and memory growth on busy sites
Suggested fix: constrain fields, pagination, and cache strategy
```

Fail:
```markdown
The code could be faster. Consider caching.
```
This is too vague to be actionable or reviewable.
