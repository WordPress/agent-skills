# Use Design Tokens

Skill: wpds

WPDS guidance should prefer system tokens and components over ad hoc styling.

## Recommendations use WPDS primitives

**Given** a request to build an interface with the WordPress Design System
**When** the skill proposes implementation details
**Then** it should prefer WPDS components and tokens instead of bespoke colors and spacing values

### Examples

Pass:
```markdown
Use the WPDS button component and spacing/color tokens exposed by the WPDS MCP server so the UI stays consistent with the design system.
```

Fail:
```markdown
Hard-code `#7f54b3`, `12px`, and `18px` values everywhere and create a custom button from scratch.
```
This ignores the design-system primitives the skill is supposed to enforce.
