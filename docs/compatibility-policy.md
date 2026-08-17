# Compatibility policy

This repo is an authoring workspace for WordPress-focused Agent Skills.

## Compatibility contract (v1)

Skills in this repo target:

- WordPress core **7.0+**
- PHP **7.4.0+** (minimum supported by WordPress 7.0)

Individual skills may declare a stricter contract when the covered API is newer. For example, `wp-knowledge` targets WordPress **7.0+**, PHP **7.4.0+**, and Gutenberg **23.6+** with the Guidelines experiment active until Knowledge ships in Core.

## Authoring rules

Skills should:

- Prefer stable WordPress APIs and best practices.
- Prefer detection + guardrails (triage) over hard-coded assumptions.
- If a task requires behavior that differs across core versions, ask for a target version (but default guidance should assume WP 7.0+).
