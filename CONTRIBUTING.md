# Contributing to Agent Skills

We welcome contributions! This project is a great opportunity to share your WordPress expertise with the community in a unique way.

## Why Contribute Here?

**You don't need to be a coding wizard.** Unlike typical open source projects, Agent Skills is primarily about capturing *knowledge* and *best practices* in a structured format. If you understand WordPress deeply—whether that's block development, performance optimization, plugin security, or any other domain—you can make a meaningful contribution.

Most of our skills are written in Markdown. The "code" is mostly procedural checklists, decision trees, and reference documentation. If you can explain a WordPress concept clearly, you can contribute here.

## Ways to Contribute

### 1. Improve Existing Skills

The easiest way to start:

- **Fix outdated information** — WordPress evolves quickly. If you spot something that's changed, open a PR.
- **Add missing edge cases** — Did you hit a gotcha that isn't documented? Add it to the "Failure modes" section.
- **Clarify procedures** — If a step confused you, it'll confuse others. Make it clearer.
- **Expand references** — Add deeper documentation on specific topics.

### 2. Create New Skills

Have expertise in a WordPress area we don't cover yet? Consider adding a new skill.

Before starting:
1. Check [existing skills](skills/) to avoid overlap
2. Review the [Authoring Guide](docs/authoring-guide.md) for structure requirements
3. Open an issue to discuss scope (optional but recommended for larger skills)

Scaffold a new skill:

```bash
node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"
```

### 3. Add Evaluation Scenarios

Every skill needs test scenarios under `eval/scenarios/`. These are simple markdown files describing:
- A realistic prompt/task
- What the AI should do
- How to verify it worked

This is a great low-barrier contribution—you're essentially writing "what should happen when someone asks X?"

### 4. Report Issues

Found a skill giving bad advice? AI following a procedure that doesn't work? Open an issue with:
- Which skill
- What went wrong
- What the correct behavior should be

## Skill Structure

Each skill follows this structure:

```
skills/<skill-name>/
├── SKILL.md              # Main instructions (short, procedural)
├── references/           # Deep-dive docs on specific topics
│   └── *.md
└── scripts/              # Deterministic helpers (optional)
    └── *.mjs
```

### SKILL.md Requirements

Every `SKILL.md` needs:

1. **YAML frontmatter** with `name`, `description`, and `compatibility`
2. **When to use** — Conditions that trigger this skill
3. **Inputs required** — What the AI needs to gather first
4. **Procedure** — Step-by-step checklist
5. **Verification** — How to confirm it worked
6. **Failure modes / debugging** — Common problems and fixes
7. **Escalation** — When to ask for human help

See any existing skill for examples.

## Guidelines

### Keep It Practical

- Focus on what developers actually need to do
- Include concrete examples, not abstract theory
- Link to official docs for deep dives

### Keep It Current

- Target WordPress 7.0+ and PHP 7.4.0+
- Avoid legacy patterns (Classic themes, pre-Gutenberg APIs)
- Update compatibility frontmatter when requirements change

### Keep It Testable

- Add at least one eval scenario for new skills
- Run `node eval/harness/run.mjs` before submitting

### Keep It Small

- Prefer small, focused skills over mega-skills
- Keep `SKILL.md` short—push depth into `references/`
- One skill should do one thing well

## Submitting Changes

1. Fork the repo
2. Create a branch (`git checkout -b improve-block-dev-skill`)
3. Make your changes
4. Run validation: `node eval/harness/run.mjs`
5. Commit with a clear message
6. Open a pull request
7. Request a review from @WordPress/agent-skills-maintainers

For significant changes, consider opening an issue first to discuss the approach.

## Questions?

Open an issue or start a discussion. We're happy to help you get started.

---

*Your WordPress knowledge can help thousands of developers get better AI assistance. Thank you for contributing!*
