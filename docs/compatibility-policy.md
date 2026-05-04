# Compatibility policy

This repo is an authoring workspace for WordPress-focused Agent Skills.

## Compatibility contract (v1)

Skills in this repo target one of two floors:

- **Default floor** — WordPress core **6.9+** with PHP **7.2.24+** (minimum supported by WordPress 6.9). Use this for skills covering APIs available on 6.9.
- **WP 7.0+ floor** — WordPress core **7.0+** with PHP **7.4+**. Use this only for skills covering features unavailable on 6.9 (e.g., the AI Client, the Connectors API, the client-side Abilities API).

## Authoring rules

Skills should:

- Prefer stable WordPress APIs and best practices.
- Prefer detection + guardrails (triage) over hard-coded assumptions.
- If a task requires behavior that differs across core versions, ask for a target version (but default guidance should assume WP 6.9+ unless the skill is on the 7.0+ floor).
- Skills targeting 7.0-only features should explicitly say so in the SKILL.md description and use the 7.0+ compatibility line.
