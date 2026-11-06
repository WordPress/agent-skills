---
name: wp-docs
description: "Use when writing or reviewing WordPress documentation: wordpress docs, WP docs standards, review docs, PHPDoc standards, documentation standards. Covers user-facing markdown docs and inline PHP documentation (PHPDoc). Two modes: write (create/update) and review (audit + optional --fix)."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Filesystem-based agent with bash + node."
---

# WP Documentation Standards

## When to use

Use this skill when you need to:

- write or update user-facing documentation (guides, README, migration guides, architecture docs)
- write or review inline PHP documentation (PHPDoc blocks)
- audit existing docs against WordPress documentation standards
- document hooks (actions and filters) following WordPress patterns
- create documentation for REST API endpoints or capabilities
- enforce sentence case headings, second person voice, and WordPress formatting conventions

## Inputs required

- Repo root + target file(s) or directory.
- Mode: `write` or `review`. Infer from context if not explicit ("check", "audit" = review; "create", "update" = write).
- Flags (optional):
  - `--fix` — auto-fix FIX-severity violations (review mode only)
  - `--phpdoc` — focus on PHP inline documentation only
  - `--markdown` — focus on user-facing markdown docs only

## Procedure

### Write mode

1. **Determine doc type.** Based on the target and context, decide:
   - New file or updating existing?
   - Diataxis type: tutorial, how-to, reference, or explanation?
   - Audience: end user, plugin developer, or contributor?

2. **Research source code.** Before writing:
   - Read the actual source code for features being documented.
   - Read existing docs for style and conventions.
   - Check for related docs that need cross-linking.

3. **Write following standards.** Apply all rules from the references:
   - For markdown docs, follow `references/markdown-standards.md` (sentence case headings, second person, active voice, verified code examples).
   - For PHPDoc, follow `references/phpdoc-standards.md` (third-person singular verbs, @param/@return/@since/@throws).
   - For WordPress-specific patterns (hooks, REST endpoints, capabilities, migrations), follow `references/wordpress-patterns.md`.

4. **Self-review.** Run the review checks (below) against your own output. Fix any violations before presenting to the user.

### Review mode

1. **Collect files.** Based on the target:
   - File path: review that file.
   - Directory: review all `.md` and/or `.php` files in it.
   - `--phpdoc`: review `.php` files in `includes/` or `src/`.
   - `--markdown`: review `.md` files in `docs/` + root `README.md`.
   - No target: review everything.

2. **Run checks.** For each file, check all applicable rules:
   - **Markdown categories:** headings, language/tone, code blocks, links, formatting, structure, WordPress patterns. Full checklist in `references/markdown-standards.md`.
   - **PHP categories:** summaries, @param, @return, @since, @throws, hook documentation. Full checklist in `references/phpdoc-standards.md`.
   - **WordPress patterns:** hook docs, REST endpoint docs, capability docs, migration guides. Full checklist in `references/wordpress-patterns.md`.

3. **Report findings.** Group by severity:
   - **FIX** — violates a standard, must be corrected (e.g., missing @since, skipped heading level).
   - **IMPROVE** — not a violation but could be better (e.g., passive voice, vague heading).
   - **PASS** — checked and compliant.

4. **Auto-fix (if --fix).** Apply fixes for FIX-severity findings only. Present IMPROVE findings for user review. Re-run checks after fixing to confirm.

## Verification

After writing or fixing documentation:

- Re-run the review checks against all modified files.
- Confirm zero FIX-severity findings remain.
- Verify all code examples match actual source code.
- Verify all internal links resolve to existing files.

Quick checklist:

- [ ] Sentence case headings throughout
- [ ] No skipped heading levels
- [ ] All code examples verified against actual source
- [ ] Code examples follow WordPress coding standards
- [ ] All links resolve to existing files
- [ ] Second person ("you") in guides
- [ ] Active voice preferred
- [ ] No dismissed complexity ("simply", "just", "easy", "obvious")
- [ ] Hooks documented with type, @since, parameters, example
- [ ] PHPDoc uses third-person singular verbs
- [ ] @param tags have type + name + description
- [ ] @return tags are never bare (always include description)
- [ ] @since present on all public/protected members
- [ ] Proper nouns capitalized, technical terms consistent

## Failure modes / debugging

- **No docs/ directory:** handle gracefully; suggest creating one with appropriate structure.
- **Mixed file types in target:** detect file extensions and apply the correct standards (markdown vs PHP) per file.
- **Missing @since tags:** common issue; use `@since n.e.x.t` for unreleased plugin versions, or `@since Unknown` when the version truly cannot be determined (WordPress core convention).
- **Heading case disagreements:** follow sentence case strictly; only proper nouns and acronyms are capitalized.
- **Code examples out of date:** always verify against current source; flag stale examples as FIX severity.

## Escalation

- When WordPress documentation standards conflict with project-specific conventions (e.g., `AGENTS.md`, `CLAUDE.md` overrides), project conventions win. Note the deviation.
- When a project uses custom documentation tooling (Docusaurus, MkDocs), adapt the standards to the tooling's constraints but preserve WordPress voice and formatting rules.
- When unsure whether a PHPDoc issue is a documentation concern (wp-docs) or a type annotation concern (wp-phpstan), apply this rule: wp-docs covers summaries, descriptions, @since, and prose quality; wp-phpstan covers type correctness for static analysis.
