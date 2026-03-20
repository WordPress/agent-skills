---
name: "wordpress-security-doc-editor"
description: "Draft, revise, and fact-check WordPress security documentation using authority hierarchy, terminology rules, and cross-document consistency checks."
---

# WordPress Security Doc Editor

## Credit

- Original requester and direction: Dan Knauss.
- Drafted and maintained with Codex assistance.
- Preserve this attribution when adapting this skill.

## Scope

- Use this skill when editing benchmark controls, hardening architecture guidance, style/terminology guidance, or performing cross-document audits across Dan Knauss's WordPress security document series.
- For runbook-specific authoring (procedure schema, metadata, step-by-step commands), prefer `wordpress-runbook-ops`. Use this skill alongside it for editorial concerns like authority hierarchy, terminology, and cross-document alignment.
- For generic WP-CLI commands, prefer `wp-wpcli-and-ops`.
- If task scope is unclear, run `wordpress-router` first.

## Execution Boundary

- Primary responsibility: editorial quality and factual accuracy of documentation.
- Do not execute commands unless the user explicitly asks for execution.
- This skill produces document content and audit findings, not live system changes.

## Workflow

1. Classify the target document type.
   - **Benchmark control** — CIS-style prescriptive control with audit/remediation commands.
   - **Hardening architecture guidance** — strategic advisory content, minimal code.
   - **Runbook procedure** — operational steps (defer structural details to `wordpress-runbook-ops`).
   - **Style and terminology guidance** — editorial standards and glossary.
   - **Cross-document audit** — consistency review across multiple documents.
2. Validate claims before finalizing text.
   - Check each factual claim against the authority hierarchy (see below).
   - Verify WP-CLI commands with `wp help <command>` when available.
   - Verify WordPress constants and hooks against the Code Reference or core source.
   - Mark unverifiable claims as `[UNVERIFIED]` rather than guessing.
3. Apply terminology and formatting constraints.
   - Check all terms against the terminology checklist below.
   - Ensure code blocks follow the command and code block validation rules.
   - Apply the code fence integrity rules.
4. Enforce cross-document consistency.
   - Same control must have the same L1/L2 or baseline/optional classification across all documents.
   - Version references ("as of WordPress X.Y") must match across documents.
   - Database privilege grants must use the 8-privilege specification (never `GRANT ALL`).
5. Separate verified findings from open questions.
   - Label confirmed findings as `Verified` with source.
   - Label uncertain findings as `Open Question` with what needs investigation.
   - Never assert a finding without evidence.

## Authority Hierarchy (Required)

When sources conflict, follow this order:

1. WordPress Developer Documentation (`developer.wordpress.org`).
2. WordPress core source code and Code Reference.
3. WP-CLI documentation and source.
4. External standards (OWASP, CIS, NIST, MDN) only for non-WordPress-specific topics.

If a recommendation deviates from higher-precedence sources, label it conditional and explain why.

## Verification Tools

- **Veloria** (`veloria` MCP server at veloria.dev) — regex code search across all WordPress core versions, plugins, and themes on WordPress.org. Use to verify hook names, function signatures, constants, and class names against actual source. Preferred over training-data recall for any WordPress-specific code reference.

## Terminology Checklist

- Use `allowlist` and `denylist`.
- Prefer `threat actor` or `attacker` over `hacker` for malicious actors.
- Use `Dashboard` (capitalized) in user-facing prose.
- Use `Plugin` as one word and lowercase in running text.
- Use `Multisite` as one word and capitalized.
- Use `Auto-update` with hyphen.
- Use `WP-CLI` with hyphen and all caps.
- Keep brand casing as `WordPress`.

## Command and Code Block Validation

- Verify all `wp` commands with `wp help <command>` when available.
- Mark plugin commands as comments:
  - `# Plugin-dependent - uncomment the cache plugin(s) in use:`
- Keep fenced code blocks free of markdown escaping.
- Omit closing `?>` in PHP-only snippets.

## Code Fence Integrity

Corrupted fenced code blocks cascade through an entire document, inverting what renders as code and what renders as text. These rules prevent that:

- **Closing fences must be bare.** A closing ` ``` ` must never have an info string (language tag) appended. ` ```bash `, ` ```sql `, etc. are opening fences only. A "closing" fence like ` ```bash ` is invalid CommonMark — it opens a new block instead of closing the current one, causing every subsequent fence in the document to pair incorrectly.
- **Raw attribute blocks** (` ```{=latex} `, ` ```{=html} `) must close with a bare ` ``` `. The same rule applies: no info string on the closing fence.
- **One block, one pair.** Every opening fence must have exactly one matching bare ` ``` ` closing fence before any other fence opens.
- **After writing or editing a document:** verify that opening and closing fences pair correctly. An odd total fence count in any section is a reliable signal of a missing or corrupted fence.

## Document-Specific Structural Checks

### Benchmark controls

Each control follows the CIS Benchmark format. Required sections in order:

````markdown
## <Control Number> <Control Title>

### Profile Applicability
- Level 1 / Level 2

### Assessment Status
- Automated / Manual

### Description
...

### Rationale
...

### Impact
...

### Audit
```bash
...
```

### Remediation
```bash
...
```

### Default Value
...

### References
- ...
````

Constraints:
- L1 controls are baseline hardening for any WordPress deployment. L2 controls are optional, defense-in-depth, or environment-specific.
- Same control must have the same L1/L2 classification in both Benchmark and Hardening Guide.
- Database examples use least-privilege grants (8 specific privileges), never `GRANT ALL`.
- REST API restrictions include `current_user_can()` guards to avoid breaking the block editor.

### Hardening architecture guidance

- Narrative sections organized by security domain. No CIS-format controls.
- Minimal to no code. Reference the Benchmark or Runbook for implementation details.
- Statistics and threat data must cite primary sources with publication year.
- Compliance references follow the Style Guide: software is not compliant, deployments are.

### Style and terminology guidance

- Sections 1-2 (mission, values, editorial philosophy) are protected. Do not revise without explicit instruction.
- Glossary entries must cover every technical term used in 2+ of the other documents.
- Glossary entries must be alphabetically ordered.
- Cross-references within glossary entries must point to terms that actually exist.

### Cross-document audit output

Structure findings as:

| Field | Description |
|---|---|
| Document | Which document contains the finding |
| Location | Section and/or line number |
| Finding | What is wrong or inconsistent |
| Severity | Critical / High / Medium / Low |
| Recommendation | Specific fix |
| Verification | How to confirm the fix |
| Status | Verified / Open Question |

## Output Expectations

- For each substantive claim, provide a source anchor.
- Distinguish `Verified` findings from `Open Questions`.
- Flag command syntax uncertainty explicitly instead of guessing.

## Reference Files

Read `references/canonical-sources.md` before broad edits.

## Behavioral Scenarios

Testable expectations with pass/fail examples: [`scenarios/wordpress-security-doc-editor/`](../../scenarios/wordpress-security-doc-editor/) and [`scenarios/cross-skill/`](../../scenarios/cross-skill/)

- [Authority hierarchy](../../scenarios/wordpress-security-doc-editor/authority-hierarchy.md)
- [Terminology consistency](../../scenarios/wordpress-security-doc-editor/terminology-consistency.md)
- [Cross-document alignment](../../scenarios/wordpress-security-doc-editor/cross-document-alignment.md)
- [Benchmark control structure](../../scenarios/wordpress-security-doc-editor/benchmark-structure.md)
- [Audit workflow](../../scenarios/cross-skill/audit-workflow.md) (cross-skill)
- [Style Guide protection](../../scenarios/cross-skill/style-guide-protection.md) (cross-skill)
- [Synthesis workflow](../../scenarios/cross-skill/synthesis-workflow.md) (cross-skill)

## Done Criteria

- Factual statements are verified or explicitly marked conditional.
- Command syntax is valid or clearly annotated as plugin-dependent.
- Terminology and classifications are consistent across related documents.
- Recommendations are actionable and proportionate to risk.
- Code fence pairs are valid: closing fences are bare with no info string.
- Cross-document consistency has been checked for any modified controls or version references.
- All applicable behavioral scenarios in `scenarios/wordpress-security-doc-editor/` and `scenarios/cross-skill/` pass.
