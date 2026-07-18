# Eval scenarios

- All scenarios are JSON files only (no markdown counterparts).
- Skill scenarios define `name`, a non-empty `skills` list, `query`, `expected_behavior`, and `success_criteria`.
- Repository-maintenance scenarios set `kind` to `repository-infrastructure` and use an empty `skills` list so they do not falsely exercise an unrelated skill.
- Each named skill must exist, every skill needs coverage, behavioral fields are non-empty, and scenario names are unique.
- Add new scenarios as `<slug>.json` in this directory. Make assertions evidence-bearing, and compare with-skill output against a baseline before human review.

Author scenarios with the [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices), [evaluation guidance](https://agentskills.io/skill-creation/evaluating-skills), [description guidance](https://agentskills.io/skill-creation/optimizing-descriptions), and [script guidance](https://agentskills.io/skill-creation/using-scripts).
