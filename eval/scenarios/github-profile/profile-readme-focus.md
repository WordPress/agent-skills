# Profile README Focus

Skill: github-profile

A strong GitHub profile should present a clear narrative instead of a generic wall of badges and buzzwords.

## README leads with identity and evidence

**Given** a request to improve a GitHub profile
**When** the skill proposes a profile README structure
**Then** it should start with a clear identity statement, target audience, and evidence-backed highlights rather than generic filler

### Examples

Pass:
```markdown
# Dan Knauss

WordPress security engineer focused on practical hardening, runbooks, and AI-assisted developer workflows.

## What I build
- Security documentation systems for WordPress teams
- Agent skills for WordPress development and operations
- Tooling for repeatable incident response and review
```

Fail:
```markdown
# Hi there 👋

Welcome to my profile!!!

![Visitors](https://example.com/badge)
![Stars](https://example.com/badge)
![Followers](https://example.com/badge)

I am passionate, motivated, results-driven, and love all technologies.
```
Generic language and vanity badges crowd out the actual value proposition.
