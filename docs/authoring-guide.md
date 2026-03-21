# Authoring guide (AI-assisted)

This repo is built for **AI-assisted authoring** with **deterministic guardrails**.

## Golden rules

- Keep `SKILL.md` short and procedural; push depth into `references/` and scripts.
- Prefer deterministic scripts for anything the agent would otherwise “guess” (repo detection, version checks, lint/test command discovery).
- Don’t add a new skill without at least one scenario in `eval/scenarios/`.
- Keep file references 1 hop from `SKILL.md` (avoid deep chains).
- Include a `compatibility:` frontmatter line matching one of the approved patterns in `docs/compatibility-policy.md`.

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
   - Add at least 1 prompt-style scenario under `eval/scenarios/` describing expected behavior.
6. **Validate**
   - Run `node eval/harness/run.mjs`.
   - Run `bash eval/harness/run-scenarios.sh eval/scenarios/`.
   - Optionally validate frontmatter using `skills-ref validate` (see `docs/upstream-sync.md` for CI guidance).

## Scaffolding a new skill

Use the scaffold script to create a minimal, spec-compliant starting point:

- `node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"`

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
4. One scenario markdown file under `eval/scenarios/`

## Suggested initial domain skills (v1)

See `docs/skill-set-v1.md`.
