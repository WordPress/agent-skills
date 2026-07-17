# Eval scenarios

- All scenarios are JSON files only (no markdown counterparts).
- Each file defines: name, skills, query, expected_behavior, and success_criteria.
- Each field is non-empty; each named skill must exist, every skill needs coverage, and scenario names are unique.
- Add new scenarios as `<slug>.json` in this directory. Make assertions evidence-bearing, and compare with-skill output against a baseline before human review.

Author scenarios with the [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices), [evaluation guidance](https://agentskills.io/skill-creation/evaluating-skills), [description guidance](https://agentskills.io/skill-creation/optimizing-descriptions), and [script guidance](https://agentskills.io/skill-creation/using-scripts).
