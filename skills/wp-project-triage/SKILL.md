---
name: wp-project-triage
description: "Use when you need a deterministic inspection of a WordPress repository (plugin/theme/block theme/WP core/Gutenberg/full site) including tooling/tests/version hints, and a structured JSON report to guide workflows and guardrails."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WP Project Triage

## When to use

Use this skill to quickly understand what kind of WordPress repo you’re in and what commands/conventions to follow before making changes.

## Inputs required

- Repo root (current working directory).

## Procedure

Replace `<wp-project-triage-dir>` below with the absolute directory containing that skill’s
`SKILL.md` file (load that skill if needed). Keep the target project’s root as the working directory
and retain the quotes around script paths. `references/` paths are relative to this skill’s
directory.

1. Run the detector (prints JSON to stdout):
   - `node "<wp-project-triage-dir>/scripts/detect_wp_project.mjs"`
2. If you need the exact output contract, read:
   - `references/triage.schema.json`
3. Use the report to select workflow guardrails:
   - project kind(s)
   - PHP/Node tooling present
   - tests present
   - version hints and sources
4. If the report is missing signals you need, update the detector rather than guessing.

## Verification

- The JSON should parse and include: `project.kind`, `signals`, and `tooling`.
- Re-run after changes that affect structure/tooling (adding `theme.json`, `block.json`, build config).

## Failure modes / debugging

- If it reports `unknown`, check whether the repo root is correct.
- If scanning is slow, add/extend ignore directories in the script.
