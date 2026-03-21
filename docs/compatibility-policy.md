# Compatibility policy

This repo is an authoring workspace for WordPress-focused Agent Skills plus a small number of supporting cross-platform skills.

## Compatibility contract (v1)

WordPress-targeted skills in this repo target:

- WordPress core **6.9+**
- PHP **7.2.24+** (minimum supported by WordPress 6.9)

Platform-agnostic skills may instead declare that they are cross-platform and have no WordPress runtime assumptions. These skills should only be used for domains that genuinely do not depend on WordPress or PHP runtime behavior, such as GitHub profile or repository optimization.

## Authoring rules

Skills should:

- Prefer stable WordPress APIs and best practices.
- Prefer detection + guardrails (triage) over hard-coded assumptions.
- If a task requires behavior that differs across core versions, ask for a target version (but default guidance should assume WP 6.9+).
- Use one of these compatibility patterns:
  - `Targets WordPress 6.9+ (PHP 7.2.24+)...` for WordPress-targeted skills.
  - `Platform-agnostic... No WordPress runtime assumptions.` for cross-platform skills.
