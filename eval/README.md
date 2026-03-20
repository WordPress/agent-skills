# Eval Harness

Behavioral scenarios that test whether agent output meets skill standards.

## How It Works

Each scenario is a markdown file using **Given/When/Then** format with concrete **pass/fail examples**. Scenarios operationalize a skill's done criteria into verifiable expectations.

### Scenario Format

```markdown
# Scenario Title

Skill: <skill-name>

<Brief explanation of why this scenario matters>

## <Rule Being Tested>

**Given** <precondition>
**When** <action or trigger>
**Then** <expected outcome>

### Examples

Pass:
```<language>
<concrete example that meets the expectation>
```

Fail:
```<language>
<concrete example that violates the expectation>
```
<Explanation of why it fails>
```

### Key Principles

1. **Concrete, not abstract.** Every scenario has at least one pass and one fail example with real code or content.
2. **One rule per section.** Each Given/When/Then block tests exactly one expectation.
3. **Skill-linked.** Every scenario file states which skill it tests.
4. **Explanatory failures.** Fail examples explain *what's wrong and why it matters*, not just that it's wrong.

## Directory Structure

```
eval/
  harness/
    run-scenarios.sh             # Runner: validates markdown scenario format
    check-scenario-format.sh     # Single-file format checker
  scenarios/
    orchestration/
      <scenario-name>.json       # Routing/orchestration scenarios (skill selection pipeline)
    <skill-name>/
      <scenario-name>.md         # Behavioral scenarios (Given/When/Then with pass/fail examples)
    cross-skill/
      <scenario-name>.md         # Scenarios spanning multiple skills
```

### Two scenario types

**Markdown behavioral scenarios** (per-skill subdirectories) test output quality using Given/When/Then with concrete pass/fail code examples. The shell harness validates their format.

**JSON orchestration scenarios** (`orchestration/`) test the skill selection pipeline: given a user query, which skills activate in what order, and what are the success criteria. These require a separate runner or manual review.

## Running Evaluations

### Manual Review

Read the scenario file, generate output using the skill, compare against pass/fail examples.

### Automated (CI)

```bash
bash eval/harness/run-scenarios.sh eval/scenarios/wp-plugin-development/
```

The harness validates:
1. Scenario files follow the required format (frontmatter, Given/When/Then, examples).
2. Pass examples are present and labeled.
3. Fail examples include explanations.
4. Cross-references to skills resolve to existing SKILL.md files.

## Writing New Scenarios

1. Identify a done criterion from the skill's `SKILL.md`.
2. Create a scenario file in the skill's scenario directory.
3. Write at least one Given/When/Then block with pass and fail examples.
4. Fail examples must explain the violation — a reader should learn from the failure.
5. Link back to the skill in the file header.

## Test Runs

Record test run results in `eval/scenarios/test-runs/`:

```markdown
# Test Run: <date> - <skill> - <context>

## Results

| Scenario | Result | Notes |
|---|---|---|
| security-nonces | PASS | |
| capability-checks | FAIL | Missing check on delete handler |

## Summary
<N>/<M> scenarios pass.
```

## Relationship to Skills

Each skill's `SKILL.md` has a "Done Criteria" section. Scenarios are the testable form of those criteria. A skill is considered well-covered when every done criterion has at least one corresponding scenario.

| Skill | Scenario Directory | Coverage |
|---|---|---|
| `wp-plugin-development` | `eval/scenarios/wp-plugin-development/` | Priority |
| `wp-phpstan` | `eval/scenarios/wp-phpstan/` | Priority |
| `wp-rest-api` | `eval/scenarios/wp-rest-api/` | Priority |
| `wp-performance` | `eval/scenarios/wp-performance/` | Priority |
| `wp-wpcli-and-ops` | `eval/scenarios/wp-wpcli-and-ops/` | Priority |
| Cross-skill | `eval/scenarios/cross-skill/` | As needed |
