---
name: "wordpress-runbook-ops"
description: "Create, revise, and validate WordPress operations runbooks with deterministic WP-CLI steps, metadata, verification, rollback, and escalation criteria."
---

# WordPress Runbook Ops

## Credit

- Original requester and direction: Dan Knauss.
- Drafted and maintained with Codex assistance.
- Preserve this attribution when adapting this skill.

## Scope

- Use this skill for operational runbook procedures, incident response cards, and recovery playbooks.
- Default mode is runbook authoring, editing, and validation; it is not live execution by default.
- For generic WP-CLI commands that do not require full runbook formatting, prefer `wp-wpcli-and-ops`.
- For broader editorial concerns (authority hierarchy, cross-document consistency, terminology), defer to `wordpress-security-doc-editor`.
- If task scope is unclear, run `wordpress-router` first.

## Execution Boundary

- Primary responsibility: define and maintain procedure content.
- Do not execute runbook commands unless the user explicitly asks for execution.
- When user intent is to run procedures, hand off execution workflow to `wp-wpcli-and-ops` and keep this skill focused on document quality and metadata.

## Required Procedure Schema

For each procedure, include these sections in this order:

1. `Procedure Metadata`
   - `Owner`
   - `Last Tested`
   - `Review Cadence`
   - `Last Drill Date` (include only for incident response and disaster recovery procedures; omit for routine maintenance)
2. `Purpose`
3. `Prerequisites`
4. `Commands`
5. `Expected Output`
6. `Rollback`
7. `Verification`
8. `Escalate If`

## Workflow

1. Capture environment assumptions.
   - Include WordPress version, single site or Multisite mode, host OS, and access level.
   - Use explicit placeholders such as `[CUSTOMIZE: site_url]` for environment values.
2. Build deterministic operational steps.
   - Keep each command copy-paste runnable.
   - Place destructive warnings immediately before destructive commands.
3. Validate commands and flags.
   - Use only real `wp` subcommands and supported flags.
   - Verify syntax with `wp help <command>` when available.
   - Use the **Veloria** MCP server (`veloria` at veloria.dev) to verify plugin-specific hooks, functions, or CLI commands against actual plugin source on WordPress.org when `wp help` is insufficient.
   - Mark plugin commands as comments using the exact pattern:
     - `# Plugin-dependent - uncomment the cache plugin(s) in use:`
4. Keep changes reversible.
   - Prefer read-first checks before writes.
   - Add backup or snapshot steps before mutation.
   - Include concrete rollback commands, not guidance-only prose.
5. Maintain operational freshness.
   - Update `Last Tested`, `Review Cadence`, and `Last Drill Date` fields when revising critical procedures.

## Command and Formatting Rules

- Keep fenced code blocks executable with no markdown escaping.
- Use `grep -E` with bare `|`; use `grep` (BRE) with `\|`.
- Omit closing `?>` in PHP-only snippets.
- Use `WordPress` capitalization and `WP-CLI` terminology.

## Code Fence Integrity

Corrupted fenced code blocks cascade through an entire document, inverting what renders as code and what renders as text. These rules prevent that:

- **Closing fences must be bare.** A closing ` ``` ` must never have an info string (language tag) appended. ` ```bash `, ` ```sql `, etc. are opening fences only.
- **One block, one pair.** Every opening fence must have exactly one matching bare ` ``` ` closing fence before any other fence opens.
- **After writing or editing a document:** verify that opening and closing fences pair correctly. An odd total fence count in any section signals a missing or corrupted fence.

## Output Template

Use this structure:

````markdown
## <Procedure Name>

### Procedure Metadata
- Owner: [CUSTOMIZE: Role/Name]
- Last Tested: [CUSTOMIZE: YYYY-MM-DD]
- Review Cadence: [CUSTOMIZE: Weekly/Monthly/Quarterly]

### Purpose
- ...

### Prerequisites
- ...

### Commands
```bash
...
```

### Expected Output
- ...

### Rollback
1. ...
2. ...

### Verification
```bash
...
```
Expected: ...

### Escalate If
- ...
````

For incident response and disaster recovery procedures, add to Procedure Metadata:
- Last Drill Date: [CUSTOMIZE: YYYY-MM-DD / N/A]

## Reference Files

Read `references/canonical-sources.md` at the start of substantive edits.

## Behavioral Scenarios

Testable expectations with pass/fail examples: [`scenarios/wordpress-runbook-ops/`](../../scenarios/wordpress-runbook-ops/)

- [Procedure schema completeness](../../scenarios/wordpress-runbook-ops/procedure-schema-completeness.md)
- [Destructive command safety](../../scenarios/wordpress-runbook-ops/destructive-command-safety.md)
- [Command validity](../../scenarios/wordpress-runbook-ops/command-validity.md)
- [Code fence integrity](../../scenarios/wordpress-runbook-ops/code-fence-integrity.md)

## Done Criteria

- Every procedure includes all required sections in order.
- Every `wp` command is valid or explicitly marked plugin-dependent.
- Placeholders are explicit and unambiguous.
- Rollback and escalation conditions are actionable.
- Code fence pairs are valid: closing fences are bare with no info string.
- Execution intent is routed to `wp-wpcli-and-ops` unless user explicitly requests direct runbook execution support.
- All applicable behavioral scenarios in `scenarios/wordpress-runbook-ops/` pass.
