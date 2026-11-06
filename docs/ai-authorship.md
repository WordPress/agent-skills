# AI Authorship Disclosure

This document describes how AI tools were used to create the skills in this repository, in accordance with the [WordPress AI Guidelines](https://make.wordpress.org/ai/handbook/ai-guidelines/).

## Summary

| Aspect | Details |
|--------|---------|
| **AI Tool** | GPT-5.2 Codex (High Reasoning) |
| **Source Material** | Official Gutenberg trunk documentation, WordPress developer docs |
| **Human Review** | All skills reviewed and edited by WordPress contributors |
| **Testing** | Skills tested with AI assistants (Claude, Copilot, Codex) |
| **License** | GPL-2.0-or-later (compatible with WordPress) |

## Process

1. **Source Collection**: Up-to-date documentation was gathered from Gutenberg trunk and official WordPress developer resources.

2. **AI Generation**: GPT-5.2 Codex (High Reasoning) processed the documentation to create semantically dense skill files, distilling large doc sets into actionable instructions AI assistants can follow.

3. **Contributor Review**: WordPress contributors reviewed each skill for accuracy, alignment with current best practices, and completeness.

4. **AI-Assisted Testing**: Skills were tested by using them with AI coding assistants (Codex and Claude Code) on real WordPress development tasks, sourced from [WP Bench](https://make.wordpress.org/ai/2026/01/14/introducing-wp-bench-a-wordpress-ai-benchmark/) to verify they produce correct guidance. That said, skills have not (yet) been run across a formal evaluation system, *as one does not exist*.

5. **Iteration**: Based on testing results, skills were refined before the v1 release.

## Per-Skill Breakdown

All v1 skills followed the same process described above. As skills diverge in their development history, this table will be updated.

| Skill | AI Generated | Human Reviewed | Tested |
|-------|--------------|----------------|--------|
| [wordpress-router](../skills/wordpress-router/SKILL.md) | Yes | Yes | Yes |
| [wp-project-triage](../skills/wp-project-triage/SKILL.md) | Yes | Yes | Yes |
| [wp-block-development](../skills/wp-block-development/SKILL.md) | Yes | Yes | Yes |
| [wp-block-themes](../skills/wp-block-themes/SKILL.md) | Yes | Yes | Yes |
| [wp-plugin-development](../skills/wp-plugin-development/SKILL.md) | Yes | Yes | Yes |
| [wp-abuse-and-compromise-response](../skills/wp-abuse-and-compromise-response/SKILL.md) | Yes (Claude Opus 4.7) | Yes (community contributor with hosting-provider abuse-response background) | Pending |
| [wp-rest-api](../skills/wp-rest-api/SKILL.md) | Yes | Yes | Yes |
| [wp-interactivity-api](../skills/wp-interactivity-api/SKILL.md) | Yes | Yes | Yes |
| [wp-abilities-api](../skills/wp-abilities-api/SKILL.md) | Yes | Yes | Yes |
| [wp-wpcli-and-ops](../skills/wp-wpcli-and-ops/SKILL.md) | Yes | Yes | Yes |
| [wp-performance](../skills/wp-performance/SKILL.md) | Yes | Yes | Yes |
| [wp-phpstan](../skills/wp-phpstan/SKILL.md) | Yes | Yes | Yes |
| [wp-playground](../skills/wp-playground/SKILL.md) | Yes | Yes | Yes |
| [wpds](../skills/wpds/SKILL.md) | Yes | Yes | Yes |

## Quality Commitment

These skills are curated distillations of official documentation, reviewed by people who understand WordPress development. That said:

- Skills will contain errors. Please [report issues](https://github.com/WordPress/agent-skills/issues).
- Skills will improve over time as the community uses them and contributes fixes.
- We welcome PRs that improve accuracy, fix outdated patterns, or add missing guidance.

## Evolution

This disclosure will be updated as:
- Individual skills receive significant human rewrites
- New skills are added with different authorship processes
- Community feedback identifies areas needing clarification
