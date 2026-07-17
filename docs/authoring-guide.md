# Authoring guide (AI-assisted)

This repo is built for **AI-assisted authoring** with **deterministic guardrails**.

## Golden rules

- Keep `SKILL.md` below 500 lines and roughly 5,000 tokens; push depth into `references/` and scripts.
- Use progressive disclosure: every reference link must state the condition that requires loading it.
- Make frontmatter descriptions activation-only. Start them with `Use when`, describe the user's intent and boundary, and do not summarize the procedure.
- Prefer deterministic scripts for anything the agent would otherwise “guess” (repo detection, version checks, lint/test command discovery).
- Don’t add a new skill without at least one scenario in `eval/scenarios/`.
- Keep file references 1 hop from `SKILL.md` (avoid deep chains).
- Include a `compatibility:` frontmatter line matching `docs/compatibility-policy.md`.

## Workflow: draft → harden → ship

1. **Route first**
   - Start from `skills/wordpress-router/SKILL.md` to classify the repo and pick the domain.
2. **Collect inputs**
   - What repo type(s) does triage detect?
   - What WP/PHP/Node versions are targeted (if known)?
   - What tooling exists (Composer, @wordpress/scripts, PHPUnit, Playwright, wp-env)?
3. **Draft the skill (AI-assisted)**
   - Write `SKILL.md` as a checklist/procedure with explicit “Verification” and “Failure modes”.
   - Keep examples short; link to topic references when needed.
4. **Add deterministic helpers**
   - If the skill depends on detection (versions, project layout, build system), add a script under `scripts/`.
5. **Add evaluation scenario(s)**
   - Add at least 1 JSON prompt-style scenario under `eval/scenarios/` describing expected behavior and evidence-bearing success criteria.
   - Compare output with the skill loaded against a baseline without it; retain the result and have a human review the behavior before shipping.
   - For changed descriptions, maintain fixed train, validation, and holdout query splits. Use train evidence for wording changes; reserve validation and holdout for final confirmation.
6. **Validate**
   - Run `node eval/harness/run.mjs`.
   - Optionally validate frontmatter using `skills-ref validate` (see `docs/upstream-sync.md` for CI guidance).

## Scaffolding a new skill

Use the non-interactive scaffold script to create a minimal, spec-compliant starting point. It validates all arguments before writing, returns actionable invocation errors with exit code 2, and creates the skill and JSON scenario transactionally:

- `node shared/scripts/scaffold-skill.mjs <skill-name> "<description>" --prompt "<realistic user request>"`

## “Skill generation” prompt template (recommended)

When using an LLM to draft a skill, provide:

- The repo triage JSON output
- The user’s task statement(s)
- Any version constraints and non-goals
- The required sections: When to use, Inputs required, Procedure, Verification, Failure modes, Escalation

Then ask the model to output:

1. `skills/<skill-name>/SKILL.md`
2. Any `references/*.md` files it mentions
3. Any `scripts/*` stubs needed for deterministic checks
4. One JSON scenario file under `eval/scenarios/`

## Agent Skills guidance

- [Best practices](https://agentskills.io/skill-creation/best-practices)
- [Optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
- [Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)
- [Using scripts](https://agentskills.io/skill-creation/using-scripts)

## Suggested initial domain skills (v1)

See `docs/skill-set-v1.md`.
