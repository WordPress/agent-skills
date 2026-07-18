# Description evaluations

Description corpora test activation, not procedural quality. Each changed description has fixed `train_queries.json`, `validation_queries.json`, and `holdout_queries.json` files with realistic positive and hard negative requests. Do not duplicate queries across splits or skills.

Use train results to justify a wording change. Keep validation and holdout untouched until final confirmation, compare skill-loaded behavior with a baseline, and retain only evidence-bearing results for human review. Client skill-load telemetry is optional: record a measured trigger result only when the client exposes it; static corpus validation is not a trigger-rate measurement.

Descriptions begin with `Use when`, state user intent and activation boundaries, and do not recite a skill procedure. Keep `SKILL.md` under the 500-line / approximately 5,000-token progressive-disclosure recommendation, placing deeper material in references with explicit load conditions.

- [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices)
- [Optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
- [Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)
- [Using scripts](https://agentskills.io/skill-creation/using-scripts)
