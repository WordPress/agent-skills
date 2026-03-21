# Autoload Options Budget

Skill: wp-performance

Performance guidance should treat autoloaded options as a measurable budget, not a vague optimization target.

## Autoload analysis quantifies payload size

**Given** a slow WordPress site with suspected options bloat
**When** the skill proposes investigation steps
**Then** it should measure autoloaded options size and identify the heaviest offenders before recommending changes

### Examples

Pass:
```markdown
1. Measure total autoloaded options payload size.
2. List the largest autoloaded options.
3. Decide which options can be made non-autoloaded or restructured.
```

Fail:
```markdown
Disable autoload on as many options as possible.
```
This is guesswork. Some options are supposed to autoload, and the skill should start with evidence.
