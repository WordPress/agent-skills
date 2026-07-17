# WordPress Skills Release Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct every release-audit finding in the WordPress agent skills, apply the current Agent Skills quality guidance, and add deterministic plus behavioral regression coverage for the corrected behavior.

**Architecture:** Keep the existing source-first skill layout, add offline skill-quality and release-conformance modules to the existing harness, and extract the brittle upstream mapping parser into a testable library. Update affected skills in domain-sized red-green cycles so each group has failing assertions or baseline evaluations before its prose or examples change.

**Tech Stack:** Markdown Agent Skills, Node.js ES modules, built-in `fs`/`path`/`os`/`child_process` assertions, canonical WordPress APIs and release sources, JSON output scenarios, fixed description trigger-eval corpora.

## Global Constraints

- Preserve the default WordPress 6.9+/PHP 7.2.24+ floor.
- Use WordPress 7.0+/PHP 7.4+ only for skills whose APIs require WordPress 7.0.
- Stable release snapshot: WordPress 7.0.2, maintained WordPress 6.9.5, Gutenberg 23.5.3, Playground CLI 3.1.45, MCP Adapter 0.5.0, AI plugin 1.2.0, PHP AI Client 1.4.0 standalone/1.3.1 bundled, WP AI Client 0.4.0, Plugin Check 2.0.0.
- Treat canonical WordPress documentation, tagged source, schemas, and package registries as authoritative.
- Keep `SKILL.md` procedural; place version-specific depth in one-hop `references/` files.
- Keep each `SKILL.md` below 500 lines. Descriptions must begin with `Use when`, stay below 1,024 characters, and describe activation intent rather than the skill's internal workflow.
- Follow the official Agent Skills quality loop: realistic pre-change evals, clean-context current/no-skill or old-skill baselines, observable assertions with evidence, fixed 60/40 train/validation splits for changed descriptions, and fresh holdouts after selection.
- Modified command-line scripts must be non-interactive, support successful concise `--help`, reject ambiguous input with actionable errors and meaningful exits, keep output predictable, and avoid partial writes. Add `--check`/dry-run behavior when stateful work makes it applicable.
- Do not edit external installed/cache copies of the plugin.
- Add a failing deterministic check before each skill-content correction.
- Preserve unrelated workspace state and stage only files belonging to the current task.

---

## File Structure

**New files**

- `eval/harness/release-conformance.mjs` — offline assertions for release-sensitive skill contracts and parser fixtures.
- `eval/harness/skill-quality.mjs` — offline assertions for skill size, JSON scenario schema/coverage, trigger-eval corpus structure, and scaffold CLI behavior.
- `shared/scripts/upstream-index-lib.mjs` — exported WordPress/Gutenberg mapping parser.
- `skills/blueprint/references/v1-compatibility.md` — accurate legacy Blueprint V1 field and step reference.
- `eval/scenarios/blueprint-v2-environment.json` — V2-first Blueprint application scenario.
- `eval/scenarios/playground-cli-3-1-local-debug.json` — current CLI command-selection scenario.
- `eval/scenarios/interactivity-watch-router-state.json` — WordPress 7.0 watcher/router scenario.
- `eval/scenarios/theme-json-7-dimensions.json` — WordPress 7.0 dimensions/pseudo-state scenario.
- `eval/scenarios/wpds-without-mcp.json` — canonical-source fallback scenario.
- `eval/descriptions/wp-abilities-audit/{train,validation,holdout}_queries.json` — fixed activation corpus for the corrected audit description.
- `eval/descriptions/wp-abilities-verify/{train,validation,holdout}_queries.json` — fixed activation corpus for the corrected verification description.
- `eval/descriptions/wp-playground/{train,validation,holdout}_queries.json` — fixed activation corpus for the corrected Playground description.

**Modified infrastructure**

- `eval/harness/run.mjs`
- `docs/authoring-guide.md`
- `eval/scenarios/README.md`
- `shared/scripts/scaffold-skill.mjs`
- `shared/scripts/update-upstream-indices.mjs`
- `shared/references/wordpress-core-versions.json`
- `shared/references/gutenberg-releases.json`
- `shared/references/wp-gutenberg-version-map.json`
- `docs/upstream-sync.md`
- `eval/scenarios/upstream-sync-indices.json`

**Modified skills and references**

- `skills/blueprint/SKILL.md`
- `skills/wp-abilities-audit/SKILL.md` (description only)
- `skills/wp-abilities-verify/SKILL.md` (description only)
- `skills/wp-playground/SKILL.md`
- `skills/wp-playground/references/blueprints.md`
- `skills/wp-playground/references/cli-commands.md`
- `skills/wp-playground/references/debugging.md`
- `skills/wp-abilities-api/SKILL.md`
- `skills/wp-abilities-api/references/client-side.md`
- `skills/wp-abilities-api/references/mcp-exposure.md`
- `skills/wp-ai-client/SKILL.md`
- `skills/wp-ai-client/references/error-handling.md`
- `skills/wp-ai-client/references/prompt-builder.md`
- `skills/wp-ai-plugin/SKILL.md`
- `skills/wp-ai-plugin/references/dashboard-widgets.md`
- `skills/wp-ai-plugin/references/experiments-framework.md`
- `skills/wp-ai-plugin/references/hooks-and-filters.md`
- `skills/wp-block-development/SKILL.md`
- `skills/wp-block-development/references/block-json.md`
- `skills/wp-block-development/references/debugging.md`
- `skills/wp-block-themes/references/theme-json.md`
- `skills/wp-interactivity-api/SKILL.md`
- `skills/wp-interactivity-api/references/debugging.md`
- `skills/wp-plugin-directory-guidelines/SKILL.md`
- `skills/wp-plugin-directory-guidelines/references/gpl-compliance.md`
- `skills/wp-plugin-directory-guidelines/references/guideline-review-checklist.md`
- `skills/wpds/SKILL.md`

**Modified scenarios**

- `eval/scenarios/abilities-mcp-expose.json`
- `eval/scenarios/ai-client-add-feature-endpoint.json`
- `eval/scenarios/ai-plugin-register-experiment.json`
- `eval/scenarios/plugin-directory-license-review.json`

---

### Task 0: Agent Skills Quality Baseline, Description Evals, and Scaffold

**Files:**

- Create: `eval/harness/skill-quality.mjs`
- Create: `eval/descriptions/README.md`
- Create: `eval/descriptions/wp-abilities-audit/train_queries.json`
- Create: `eval/descriptions/wp-abilities-audit/validation_queries.json`
- Create: `eval/descriptions/wp-abilities-audit/holdout_queries.json`
- Create: `eval/descriptions/wp-abilities-verify/train_queries.json`
- Create: `eval/descriptions/wp-abilities-verify/validation_queries.json`
- Create: `eval/descriptions/wp-abilities-verify/holdout_queries.json`
- Create: `eval/descriptions/wp-playground/train_queries.json`
- Create: `eval/descriptions/wp-playground/validation_queries.json`
- Create: `eval/descriptions/wp-playground/holdout_queries.json`
- Create: `eval/scenarios/blueprint-v2-environment.json`
- Create: `eval/scenarios/playground-cli-3-1-local-debug.json`
- Create: `eval/scenarios/wpds-without-mcp.json`
- Modify: `.gitignore`
- Modify: `docs/authoring-guide.md`
- Modify: `eval/harness/run.mjs`
- Modify: `eval/scenarios/README.md`
- Modify: `shared/scripts/scaffold-skill.mjs`
- Modify: `skills/wp-abilities-audit/SKILL.md` (frontmatter description only)
- Modify: `skills/wp-abilities-verify/SKILL.md` (frontmatter description only)
- Modify: `skills/wp-playground/SKILL.md` (frontmatter description only)

**Interfaces:**

- Produces: `runSkillQuality(repoRoot): void`, called by `eval/harness/run.mjs`.
- Produces: scenario validation for `{ name, skills, query, expected_behavior, success_criteria }` and complete skill coverage.
- Produces: fixed description corpora with `{ query, should_trigger }` entries: twelve train (six positive/six negative), eight validation (four/four), and six holdout (three/three) per changed description.
- Changes scaffold CLI to `node shared/scripts/scaffold-skill.mjs <skill-name> "<description>" --prompt "<realistic user request>"` and creates `eval/scenarios/<skill-name>.json` transactionally.

- [ ] **Step 1: Add failing description and size checks**

In `eval/harness/run.mjs`, after the existing description-length assertion, add:

```js
assert(
  fm.description.startsWith("Use when"),
  `Description must begin with 'Use when' in ${path.relative(repoRoot, skillPath)}`
);
const lineCount = md.split(/\r?\n/).length;
assert(
  lineCount <= 500,
  `SKILL.md exceeds the 500-line progressive-disclosure budget in ${path.relative(repoRoot, skillPath)} (${lineCount} lines)`
);
```

- [ ] **Step 2: Verify RED, then correct only the three failing descriptions**

Run: `node eval/harness/run.mjs`

Expected: exit 1 on `skills/wp-abilities-audit/SKILL.md` because the description starts with `Audit`, not `Use when`.

Use these activation-only descriptions:

```yaml
# wp-abilities-audit
description: Use when auditing a WordPress plugin's REST API surface for Abilities API candidates, planning registrations, or producing an abilities migration audit before implementation.

# wp-abilities-verify
description: Use when verifying a WordPress plugin's Abilities API registrations, callback behavior, permissions, schemas, annotations, or an audit produced by wp-abilities-audit.

# wp-playground
description: Use when creating or debugging disposable WordPress environments with WordPress Playground, @wp-playground/cli, Blueprints, snapshots, mounts, version switching, or Xdebug.
```

Run: `node eval/harness/run.mjs`

Expected: the existing harness passes. Do not rewrite the other seventeen descriptions without a measured trigger failure.

- [ ] **Step 3: Add scenario schema and complete-coverage checks**

Create `eval/harness/skill-quality.mjs` and export `runSkillQuality(repoRoot)`. It must:

1. Reject any `eval/scenarios/*.md` file except `README.md`.
2. Parse every `eval/scenarios/*.json` file and require a non-empty string `name`, non-empty string `query`, non-empty string arrays `skills`, `expected_behavior`, and `success_criteria`.
3. Reject unknown skill names and duplicate scenario names.
4. Require every directory under `skills/` to appear in at least one scenario.

Import and call it from `eval/harness/run.mjs`.

Run: `node eval/harness/run.mjs`

Expected: exit 1 because `blueprint`, `wp-playground`, and `wpds` have no scenario coverage.

- [ ] **Step 4: Add pre-change output scenarios for the uncovered skills**

Create the three scenario files before editing their skill bodies. The Blueprint scenario must request a new V2 environment with PHP 8.5, networking, constants, and a login step. The Playground scenario must request CLI 3.1.45 local debugging and require `start`, `--xdebug`, `--workers`, and `--wordpress-install-mode` while rejecting removed flags. The WPDS scenario must request current components/tokens while MCP is unavailable and require official-source fallback without invented APIs. These are RED behavioral evals: their target expectations intentionally fail against the current skill instructions even though their JSON schema now passes. Tasks 2 and 6 replace them with their exact final contracts.

Run: `node eval/harness/run.mjs`

Expected: schema and complete-coverage checks pass.

- [ ] **Step 5: Add fixed description-corpus validation, then verify RED**

Extend `runSkillQuality()` to require `train_queries.json`, `validation_queries.json`, and `holdout_queries.json` for each of `wp-abilities-audit`, `wp-abilities-verify`, and `wp-playground`. Each file is a top-level JSON array of objects with exactly a non-empty `query` string and boolean `should_trigger`. Enforce:

- train: twelve unique queries, six `true` and six `false`;
- validation: eight unique queries, four `true` and four `false`;
- holdout: six unique queries, three `true` and three `false`;
- no query duplicated across any split or skill;
- no `TODO`, placeholder, or generic one-line non-example such as `Use this skill`.

Run: `node eval/harness/run.mjs`

Expected: exit 1 because the first train corpus is missing.

- [ ] **Step 6: Author realistic train, validation, and untouched holdout corpora**

Create all nine files with the required counts. Positive queries must vary phrasing, explicitness, detail, and complexity. Negative queries must be hard near-misses that share WordPress/domain vocabulary but belong to adjacent skills. Include paths, plugin names, casual language, and concrete context where natural.

Use only train failures to justify wording changes. The descriptions in Step 2 are the selected candidate; do not inspect validation or holdout results to add query-specific keywords. Record client-specific trigger runs under ignored `.superpowers/evals/` when observable skill-load telemetry exists. If it does not, record that limitation explicitly and do not claim a measured trigger rate from static corpus validation.

- [ ] **Step 7: Add failing scaffold CLI contract checks**

Extend `runSkillQuality()` to use a task-specific `fs.mkdtempSync(path.join(os.tmpdir(), "wordpress-skill-scaffold-"))` directory and `spawnSync(process.execPath, ...)` to prove:

1. `--help` exits 0 and prints concise usage to stdout.
2. Missing `--prompt` exits 2, explains the required prompt on stderr, and creates no skill/scenario output.
3. A valid invocation creates `skills/<name>/SKILL.md` and `eval/scenarios/<name>.json`.
4. The generated description begins with `Use when`; the JSON scenario passes the same schema validator and contains the supplied realistic prompt.
5. The temporary directory is removed in `finally`; no repository file is touched.

Run: `node eval/harness/run.mjs`

Expected: failure because the current scaffold treats `--help` as an error and creates a Markdown scenario.

- [ ] **Step 8: Repair the scaffold transactionally**

Update `shared/scripts/scaffold-skill.mjs` to:

- support `-h`/`--help` with exit 0;
- require a description beginning with `Use when` and a `--prompt` value;
- validate every argument before creating directories;
- create the skill and JSON scenario only after validation;
- emit a single concise success line on stdout;
- emit actionable invocation errors on stderr with exit 2 and no stack trace;
- remove any partially created output if an unexpected write fails.

Use this generated scenario shape:

```json
{
  "name": "Apply <skill-name> to a realistic request",
  "skills": ["<skill-name>"],
  "query": "<the supplied --prompt value>",
  "expected_behavior": [
    "Load <skill-name> because the request matches its activation description",
    "Follow the skill procedure and verify the result"
  ],
  "success_criteria": [
    "Uses <skill-name> for the matching request",
    "Reports verification evidence"
  ]
}
```

Run: `node eval/harness/run.mjs`

Expected: all scaffold and corpus checks pass.

- [ ] **Step 9: Update the authoring contract**

Update `docs/authoring-guide.md`, `eval/scenarios/README.md`, and create `eval/descriptions/README.md` with direct links to:

```text
https://agentskills.io/skill-creation/best-practices
https://agentskills.io/skill-creation/optimizing-descriptions
https://agentskills.io/skill-creation/evaluating-skills
https://agentskills.io/skill-creation/using-scripts
```

Document the 500-line/5,000-token recommendation, progressive disclosure with explicit reference load conditions, activation-only descriptions, fixed train/validation/holdout discipline, with-vs-baseline output evals, evidence-bearing assertions, human review, and the non-interactive script contract. Correct the scaffold command and JSON extension everywhere.

Add `.superpowers/` and `**/.plugin-eval/` to `.gitignore` for volatile execution/evaluation artifacts.

- [ ] **Step 10: Verify and commit Task 0**

Run:

```powershell
node eval/harness/run.mjs
node shared/scripts/scaffold-skill.mjs --help
rg -n 'eval/scenarios/<skill-name>\.md|StartsUseWhen=False' docs eval shared skills
git diff --check
```

Expected: harness and help exit 0; stale Markdown-scenario search is empty; diff check passes.

Commit:

```powershell
git add -- .gitignore docs/authoring-guide.md eval/harness/run.mjs eval/harness/skill-quality.mjs eval/scenarios eval/descriptions shared/scripts/scaffold-skill.mjs skills/wp-abilities-audit/SKILL.md skills/wp-abilities-verify/SKILL.md skills/wp-playground/SKILL.md
git commit -m "test: enforce Agent Skills quality contracts"
```

---

### Task 1: Release-Conformance Harness and Upstream Index Parser

**Files:**

- Create: `eval/harness/release-conformance.mjs`
- Create: `shared/scripts/upstream-index-lib.mjs`
- Modify: `eval/harness/run.mjs`
- Modify: `shared/scripts/update-upstream-indices.mjs`
- Modify: `shared/references/wordpress-core-versions.json`
- Modify: `shared/references/gutenberg-releases.json`
- Modify: `shared/references/wp-gutenberg-version-map.json`
- Modify: `docs/upstream-sync.md`
- Modify: `eval/scenarios/upstream-sync-indices.json`

**Interfaces:**

- Produces: `parseWpGutenbergMapFromHtml(html): { note: null, rows: Array<{ wordpress: string, gutenberg: string }> }`; throws when no valid mapping rows exist.
- Produces: `runReleaseConformance(repoRoot): void`, called by `eval/harness/run.mjs`.
- Consumes: official WordPress version-check JSON, Gutenberg releases JSON, and the developer.wordpress.org version-map HTML.

- [ ] **Step 1: Add the first failing existence assertion**

In `eval/harness/run.mjs`, after `const repoRoot = process.cwd();`, add:

```js
const upstreamIndexLib = path.join(
  repoRoot,
  "shared",
  "scripts",
  "upstream-index-lib.mjs"
);
assert(
  fs.existsSync(upstreamIndexLib),
  "Missing shared/scripts/upstream-index-lib.mjs"
);
```

- [ ] **Step 2: Run the harness and verify RED**

Run: `node eval/harness/run.mjs`

Expected: exit 1 with `Missing shared/scripts/upstream-index-lib.mjs`.

- [ ] **Step 3: Add the parser stub and the behavioral checks**

Create `shared/scripts/upstream-index-lib.mjs` with the smallest implementation that passes only the existence check:

```js
export function parseWpGutenbergMapFromHtml() {
  return { note: null, rows: [] };
}
```

Create `eval/harness/release-conformance.mjs` with reusable helpers and parser/index assertions:

```js
import fs from "node:fs";
import path from "node:path";
import { parseWpGutenbergMapFromHtml } from "../../shared/scripts/upstream-index-lib.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(repoRoot, relativePath) {
  return JSON.parse(read(repoRoot, relativePath));
}

export function requireIncludes(repoRoot, relativePath, expected) {
  const content = read(repoRoot, relativePath);
  for (const value of expected) {
    assert(content.includes(value), `${relativePath} must include: ${value}`);
  }
}

export function requireExcludes(repoRoot, relativePath, forbidden) {
  const content = read(repoRoot, relativePath);
  for (const value of forbidden) {
    assert(!content.includes(value), `${relativePath} must not include: ${value}`);
  }
}

export function runReleaseConformance(repoRoot) {
  const reversedHeaderFixture = `
    <table>
      <tr><th>Gutenberg Version</th><th>WordPress Version</th></tr>
      <tr><td>22.6</td><td>7.0.X</td></tr>
      <tr><td>21.9</td><td>6.9.X</td></tr>
    </table>`;
  const parsed = parseWpGutenbergMapFromHtml(reversedHeaderFixture);
  assert(parsed.rows.length === 2, "Version-map parser must return both rows");
  assert(
    parsed.rows[0].wordpress === "7.0.X" && parsed.rows[0].gutenberg === "22.6",
    "Version-map parser must map columns by header, not position"
  );
  assert(parsed.note === null, "A successful map parse must have note: null");

  let missingTableError = null;
  try {
    parseWpGutenbergMapFromHtml("<p>No mapping table</p>");
  } catch (error) {
    missingTableError = error;
  }
  assert(missingTableError, "Missing mapping data must throw");

  const core = readJson(repoRoot, "shared/references/wordpress-core-versions.json");
  const gutenberg = readJson(repoRoot, "shared/references/gutenberg-releases.json");
  const map = readJson(repoRoot, "shared/references/wp-gutenberg-version-map.json");
  assert(core.latest === "7.0.2", "WordPress latest must be 7.0.2");
  assert(gutenberg.latest?.tag === "v23.5.3", "Gutenberg latest must be v23.5.3");
  assert(map.note === null && map.rows.length > 0, "WP/Gutenberg map must be non-empty");
  assert(
    map.rows.some((row) => row.wordpress === "7.0.X" && row.gutenberg === "22.6"),
    "WP/Gutenberg map must include WordPress 7.0.X → Gutenberg 22.6"
  );
}
```

Import and call it from `eval/harness/run.mjs`:

```js
import { runReleaseConformance } from "./release-conformance.mjs";
```

```js
runReleaseConformance(repoRoot);
```

- [ ] **Step 4: Run the harness and verify the parser fixture is RED**

Run: `node eval/harness/run.mjs`

Expected: exit 1 with `Version-map parser must return both rows`.

- [ ] **Step 5: Implement the header-aware parser**

Replace the stub in `shared/scripts/upstream-index-lib.mjs` with:

```js
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cellsFromRow(rowHtml) {
  return [...rowHtml.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) =>
    decodeHtml(stripTags(match[2]))
  );
}

export function parseWpGutenbergMapFromHtml(html) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((match) => match[0]);

  for (const table of tables) {
    const rowHtml = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
    const rows = rowHtml.map(cellsFromRow).filter((cells) => cells.length >= 2);
    const header = rows.find(
      (cells) =>
        cells.some((cell) => /WordPress\s+Version/i.test(cell)) &&
        cells.some((cell) => /Gutenberg\s+Versions?/i.test(cell))
    );
    if (!header) continue;

    const wordpressIndex = header.findIndex((cell) => /WordPress\s+Version/i.test(cell));
    const gutenbergIndex = header.findIndex((cell) => /Gutenberg\s+Versions?/i.test(cell));
    const mapped = rows
      .filter((cells) => cells !== header)
      .map((cells) => ({
        wordpress: cells[wordpressIndex]?.trim(),
        gutenberg: cells[gutenbergIndex]?.trim(),
      }))
      .filter(
        (row) => /^\d+\.\d+/.test(row.wordpress ?? "") && /^\d+\.\d+/.test(row.gutenberg ?? "")
      );

    if (mapped.length > 0) return { note: null, rows: mapped };
  }

  throw new Error(
    "Unable to parse a non-empty WordPress/Gutenberg version mapping from the canonical document"
  );
}
```

- [ ] **Step 6: Verify parser GREEN and stale indexes RED**

Run: `node eval/harness/run.mjs`

Expected: parser assertions pass; next failure is `WordPress latest must be 7.0.2`.

- [ ] **Step 7: Use the library in the updater and refresh live data**

In `shared/scripts/update-upstream-indices.mjs`, import the parser:

```js
import { parseWpGutenbergMapFromHtml } from "./upstream-index-lib.mjs";
```

Delete the local `stripTags`, `decodeHtml`, and `parseWpGutenbergMapFromHtml` implementations. Keep all three fetches before writes so a parsing exception leaves existing JSON untouched.

Run: `node shared/scripts/update-upstream-indices.mjs`

Expected: `OK: updated shared/references/* upstream indices`; generated files report WordPress 7.0.2, Gutenberg v23.5.3, and a non-empty map whose first row is `{"wordpress":"7.0.X","gutenberg":"22.6"}`.

- [ ] **Step 8: Update sync documentation and scenario**

Add this failure contract to `docs/upstream-sync.md`:

```markdown
The updater is transactional with respect to parsing: it fetches and normalizes all three sources before writing any index. If the canonical WordPress/Gutenberg mapping cannot be parsed into at least one row, the command exits non-zero and preserves the checked-in indexes. Never accept `table-not-found` or an empty `rows` array as a successful refresh.
```

Append these exact entries to `eval/scenarios/upstream-sync-indices.json`:

```json
"Step 8: Parse the mapping by the WordPress Version and Gutenberg Version header labels even when Gutenberg is the first column",
"Step 9: If no valid mapping rows can be parsed, exit non-zero before writing any of the three checked-in JSON files"
```

```json
"Mapping output contains at least one row and includes WordPress 7.0.X mapped to Gutenberg 22.6",
"A missing or changed mapping table fails without replacing good indexes with table-not-found or an empty rows array"
```

- [ ] **Step 9: Verify and commit Task 1**

Run:

```powershell
node eval/harness/run.mjs
git diff --check
```

Expected: harness exits 0 with `OK: skills frontmatter and triage report sanity checks passed.`; `git diff --check` exits 0.

Commit:

```powershell
git add -- eval/harness shared/scripts shared/references docs/upstream-sync.md eval/scenarios/upstream-sync-indices.json
git commit -m "test: enforce current WordPress release references"
```

---

### Task 2: Blueprint V2 and Playground CLI 3.1.45

**Files:**

- Modify: `eval/harness/release-conformance.mjs`
- Modify: `skills/blueprint/SKILL.md`
- Create: `skills/blueprint/references/v1-compatibility.md`
- Modify: `skills/wp-playground/SKILL.md`
- Modify: `skills/wp-playground/references/blueprints.md`
- Modify: `skills/wp-playground/references/cli-commands.md`
- Modify: `skills/wp-playground/references/debugging.md`
- Modify: `eval/scenarios/blueprint-v2-environment.json`
- Modify: `eval/scenarios/playground-cli-3-1-local-debug.json`

**Interfaces:**

- Produces: V2-first Blueprint guidance with an explicit V1 compatibility reference.
- Produces: current CLI commands that select `start` for normal use and `server` for advanced worker/install-mode control.

- [ ] **Step 1: Add failing Blueprint and CLI assertions**

Append to `runReleaseConformance()`:

```js
requireIncludes(repoRoot, "skills/blueprint/SKILL.md", [
  '"version": 2',
  '"blueprintMeta"',
  '"applicationOptions"',
  '"additionalStepsAfterExecution"',
  "references/v1-compatibility.md",
]);
requireExcludes(repoRoot, "skills/blueprint/SKILL.md", [
  'Object = `{ username?, password? }`',
]);

for (const file of [
  "skills/wp-playground/SKILL.md",
  "skills/wp-playground/references/cli-commands.md",
  "skills/wp-playground/references/debugging.md",
]) {
  requireExcludes(repoRoot, file, [
    "--enable-xdebug",
    "--experimental-multi-worker",
    "--skip-wordpress-setup",
  ]);
}
requireIncludes(repoRoot, "skills/wp-playground/references/cli-commands.md", [
  "3.1.45",
  "@wp-playground/cli@3.1.45 start",
  "--xdebug",
  "--workers=auto",
  "--wordpress-install-mode=install-from-existing-files-if-needed",
  '"8.5"',
]);
```

- [ ] **Step 2: Run the harness and verify RED**

Run: `node eval/harness/run.mjs`

Expected: first failure reports that `skills/blueprint/SKILL.md` must include `"version": 2`.

- [ ] **Step 3: Rewrite the Blueprint entry point as V2-first**

Keep the procedural sections but make this the primary minimal example in `skills/blueprint/SKILL.md`:

```json
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "version": 2,
  "blueprintMeta": {
    "name": "Plugin test site",
    "description": "A reproducible local site for plugin development"
  },
  "applicationOptions": {
    "wordpress-playground": {
      "login": true,
      "networkAccess": false
    }
  },
  "wordpressVersion": "latest",
  "phpVersion": "8.3",
  "plugins": ["query-monitor"],
  "siteOptions": {
    "blogname": "Plugin test site"
  },
  "additionalStepsAfterExecution": []
}
```

Document that V2 requires `version: 2`, `applicationOptions.wordpress-playground.networkAccess` defaults to `false`, and object-form login requires both `username` and `password`. Move the existing V1 field/step catalog into `references/v1-compatibility.md`; state that V1 omits `version`, uses `preferredVersions`, `features.networking`, top-level `login`, and `steps`.

Use these exact V1 login examples:

```json
{ "login": true }
```

```json
{ "login": { "username": "admin", "password": "password" } }
```

State that boolean `true` selects Playground's default admin login, while both credentials are required in object form.

- [ ] **Step 4: Update Playground guidance and references**

Use these commands as the canonical examples:

```powershell
npx @wp-playground/cli@3.1.45 start --path=. --wp=latest --php=8.3
npx @wp-playground/cli@3.1.45 start --path=. --xdebug
npx @wp-playground/cli@3.1.45 server --auto-mount=. --workers=auto
npx @wp-playground/cli@3.1.45 server --auto-mount=. --wordpress-install-mode=install-from-existing-files-if-needed
npx @wp-playground/cli@3.1.45 run-blueprint --blueprint=./blueprint.json --blueprint-may-read-adjacent-files
npx @wp-playground/cli@3.1.45 build-snapshot --blueprint=./blueprint.json --outfile=./site.zip
```

Document `start` as the default auto-detecting/browser/persistence flow, `server` as the advanced low-level flow, PHP choices `5.2`, `7.4`, and `8.0` through `8.5` with 8.3 default, and `--workers=4` or `--workers=auto` as server-only controls. Update `references/blueprints.md` to use V2 syntax and link to the Blueprint skill's V1 compatibility reference.

- [ ] **Step 5: Add the application scenarios**

Replace `eval/scenarios/blueprint-v2-environment.json` with the exact final contract:

```json
{
  "name": "Create a Blueprint V2 plugin test environment",
  "skills": ["blueprint", "wp-playground"],
  "query": "Create a new Playground Blueprint for a plugin test site on stable WordPress, PHP 8.3, Query Monitor, automatic admin login, and no outbound network access.",
  "expected_behavior": [
    "Use Blueprint V2 for new work and set version to 2",
    "Use blueprintMeta and applicationOptions.wordpress-playground",
    "Set applicationOptions.wordpress-playground.login to true",
    "Leave networkAccess false or omit it because V2 defaults it to false",
    "Declare wordpressVersion, phpVersion, plugins, and siteOptions declaratively",
    "Use additionalStepsAfterExecution only for work without a V2 declarative field",
    "Route to references/v1-compatibility.md only when maintaining a V1 file without version"
  ],
  "success_criteria": [
    "Outputs schema-valid V2 structure",
    "Does not use V1 preferredVersions, features, or top-level login",
    "Does not claim object login credentials are optional",
    "Keeps network access disabled"
  ]
}
```

Replace `eval/scenarios/playground-cli-3-1-local-debug.json` with the exact final contract:

```json
{
  "name": "Run and debug a local plugin with Playground CLI 3.1",
  "skills": ["wp-playground"],
  "query": "Run the plugin in my current directory on Playground CLI 3.1.45 with PHP 8.3 and Xdebug. Also show the advanced command for an existing WordPress tree with automatic workers.",
  "expected_behavior": [
    "Use npx @wp-playground/cli@3.1.45 start --path=. --php=8.3 --xdebug for the normal workflow",
    "Explain that start auto-detects the project and opens the browser",
    "Use server --auto-mount=. --workers=auto for advanced worker control",
    "Use --wordpress-install-mode=install-from-existing-files-if-needed for an existing WordPress tree",
    "Do not emit removed or ignored legacy flags"
  ],
  "success_criteria": [
    "Selects start for normal local work",
    "Uses only --xdebug",
    "Uses --workers=auto",
    "Uses the current WordPress install-mode option",
    "Pins the audited CLI version"
  ]
}
```

- [ ] **Step 6: Verify and commit Task 2**

Run:

```powershell
node eval/harness/run.mjs
rg -n -- "--enable-xdebug|--experimental-multi-worker|--skip-wordpress-setup" skills/blueprint skills/wp-playground
git diff --check
```

Expected: harness exits 0; `rg` returns no matches; diff check exits 0.

Commit:

```powershell
git add -- eval/harness/release-conformance.mjs skills/blueprint skills/wp-playground eval/scenarios/blueprint-v2-environment.json eval/scenarios/playground-cli-3-1-local-debug.json
git commit -m "docs: update Blueprint and Playground guidance"
```

---

### Task 3: Abilities API and MCP Adapter 0.5.0

**Files:**

- Modify: `eval/harness/release-conformance.mjs`
- Modify: `skills/wp-abilities-api/SKILL.md`
- Modify: `skills/wp-abilities-api/references/client-side.md`
- Modify: `skills/wp-abilities-api/references/mcp-exposure.md`
- Modify: `eval/scenarios/abilities-mcp-expose.json`

**Interfaces:**

- Consumes: MCP Adapter 0.5.0 default-server public metadata and custom-server class names.
- Produces: runnable client permission example and explicit script-module enqueue contract.

- [ ] **Step 1: Add failing Abilities assertions**

Insert the following assertions before the closing brace of `runReleaseConformance()`:

```js
requireIncludes(repoRoot, "skills/wp-abilities-api/references/mcp-exposure.md", [
  "meta.mcp.public",
  "WP\\MCP\\Transport\\HttpTransport",
  "WP\\MCP\\Infrastructure\\ErrorHandling\\ErrorLogMcpErrorHandler",
  "WP\\MCP\\Infrastructure\\Observability\\NullMcpObservabilityHandler",
]);
requireExcludes(repoRoot, "skills/wp-abilities-api/references/mcp-exposure.md", [
  "discover and call every server-registered ability",
  "WP\\MCP\\Transport\\Http\\HttpTransport",
  "ErrorHandling\\Implementations",
  "Observability\\Implementations",
]);
requireExcludes(repoRoot, "skills/wp-abilities-api/references/client-side.md", [
  "currentUserCan(",
  "core enqueues `@wordpress/core-abilities` on all admin pages",
]);
requireIncludes(repoRoot, "skills/wp-abilities-api/references/client-side.md", [
  "wp_enqueue_script_module( '@wordpress/core-abilities' )",
  "data-can-manage-options",
]);
```

- [ ] **Step 2: Verify RED**

Run: `node eval/harness/run.mjs`

Expected: failure requiring `meta.mcp.public`.

- [ ] **Step 3: Correct default and custom MCP exposure**

Add this public metadata to the default-server example:

```php
'meta' => array(
    'mcp' => array(
        'public' => true,
    ),
    'annotations' => array(
        'readonly' => true,
    ),
),
```

State that the default server's discover/get/execute abilities only surface registered abilities whose `meta.mcp.public` value is strictly `true`; permission callbacks still run at execution. Custom servers may explicitly list selected ability IDs.

Use these imports in the custom-server example:

```php
use WP\MCP\Core\McpAdapter;
use WP\MCP\Transport\HttpTransport;
use WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler;
use WP\MCP\Infrastructure\Observability\NullMcpObservabilityHandler;
```

Update the summary paragraph in `skills/wp-abilities-api/SKILL.md` to match.

- [ ] **Step 4: Make client enqueue and permission guidance runnable**

Keep explicit page-scoped enqueueing as the required pattern. Replace the undefined helper example with server-rendered permission state:

```php
<div
    id="my-plugin-root"
    data-can-manage-options="<?php echo current_user_can( 'manage_options' ) ? '1' : '0'; ?>"
></div>
```

```js
const root = document.getElementById( 'my-plugin-root' );
const canManageOptions = root?.dataset.canManageOptions === '1';

registerAbility( {
    name: 'my-plugin/admin-action',
    label: 'Admin Action',
    description: 'Runs an administrator-only client action',
    category: 'my-plugin-actions',
    permissionCallback: () => canManageOptions,
    callback: async () => ( { success: true } ),
} );
```

Explain that this client check controls discoverability/execution in the UI; server-backed work still needs a server-side `permission_callback`.

- [ ] **Step 5: Update the MCP evaluation scenario**

In `eval/scenarios/abilities-mcp-expose.json`, replace current Step 5 with:

```json
"Step 5: Mark only intentionally exposed abilities with meta.mcp.public set to true; the default server filters discovery to that public set, while permission_callback still controls execution"
```

Append:

```json
"Step 10: Use a custom server only when the integration needs an explicit ability allow-list or a tools/resources/prompts split"
```

Add these success criteria:

```json
"Requires meta.mcp.public true for default-server discovery",
"Does not claim the default server exposes every registered ability",
"Keeps permission_callback enforcement separate from public discovery metadata"
```

- [ ] **Step 6: Verify and commit Task 3**

Run:

```powershell
node eval/harness/run.mjs
rg -n "currentUserCan|Transport\\Http\\HttpTransport|ErrorHandling\\Implementations|Observability\\Implementations|exposes everything" skills/wp-abilities-api eval/scenarios/abilities-mcp-expose.json
git diff --check
```

Expected: harness passes; `rg` has no matches; diff check passes.

Commit:

```powershell
git add -- eval/harness/release-conformance.mjs skills/wp-abilities-api eval/scenarios/abilities-mcp-expose.json
git commit -m "docs: correct Abilities and MCP Adapter guidance"
```

---

### Task 4: AI Client Error Handling and AI Plugin 1.2.0

**Files:**

- Modify: `eval/harness/release-conformance.mjs`
- Modify: `skills/wp-ai-client/SKILL.md`
- Modify: `skills/wp-ai-client/references/error-handling.md`
- Modify: `skills/wp-ai-client/references/prompt-builder.md`
- Modify: `skills/wp-ai-plugin/SKILL.md`
- Modify: `skills/wp-ai-plugin/references/dashboard-widgets.md`
- Modify: `skills/wp-ai-plugin/references/experiments-framework.md`
- Modify: `skills/wp-ai-plugin/references/hooks-and-filters.md`
- Modify: `eval/scenarios/ai-client-add-feature-endpoint.json`
- Modify: `eval/scenarios/ai-plugin-register-experiment.json`

**Interfaces:**

- Produces: error/result split for `generate_*_result()` calls.
- Produces: AI plugin 1.2.0 feature, ability, setting, and filter inventory.

- [ ] **Step 1: Add failing AI assertions**

Insert the following assertions before the closing brace of `runReleaseConformance()`:

```js
requireIncludes(repoRoot, "skills/wp-ai-client/SKILL.md", [
  "is_wp_error( $result )",
  "get_error_message()",
  "PHP AI Client 1.3.1",
  "PHP AI Client 1.4.0",
]);
requireExcludes(repoRoot, "skills/wp-ai-client/SKILL.md", [
  "Pull `getProviderMetadata()` off the result",
]);

for (const file of [
  "skills/wp-ai-plugin/SKILL.md",
  "skills/wp-ai-plugin/references/dashboard-widgets.md",
  "skills/wp-ai-plugin/references/experiments-framework.md",
  "skills/wp-ai-plugin/references/hooks-and-filters.md",
]) {
  requireExcludes(repoRoot, file, ["v1.0.2", "'1.0.2'"]);
}
requireIncludes(repoRoot, "skills/wp-ai-plugin/references/experiments-framework.md", [
  "v1.2.0",
  "Type_Ahead",
  "Key_Encryption",
  "Suggest_Reply",
  "core/read-content",
  "core/read-users",
]);
requireIncludes(repoRoot, "skills/wp-ai-plugin/references/hooks-and-filters.md", [
  "wpai_default_request_timeout",
  "wpai_settings_feature_groups",
  "wpai_settings_feature_metadata",
]);
```

- [ ] **Step 2: Verify RED**

Run: `node eval/harness/run.mjs`

Expected: failure requiring `is_wp_error( $result )` in the AI Client skill.

- [ ] **Step 3: Correct AI Client result handling and version distinction**

Use this complete diagnostic pattern in `SKILL.md` and align `references/error-handling.md`:

```php
$result = wp_ai_client_prompt( 'Summarize this text.' )
    ->with_text( $text )
    ->generate_text_result();

if ( is_wp_error( $result ) ) {
    error_log(
        sprintf(
            'AI request failed [%s]: %s',
            $result->get_error_code(),
            $result->get_error_message()
        )
    );
    $upstream_data = $result->get_error_data();
    return $result;
}

$provider_metadata = $result->getProviderMetadata();
$model_metadata    = $result->getModelMetadata();
```

State that WordPress 7.0.2 bundles PHP AI Client 1.3.1; Composer's standalone latest is 1.4.0, so standalone additions cannot be assumed in core until WordPress updates its bundled dependency.

- [ ] **Step 4: Refresh AI plugin references to 1.2.0**

Set `WPAI_VERSION` examples to `1.2.0`. Keep the twelve-method `Feature` contract and two dashboard widgets, but change “as of” language to 1.2.0.

Use this 16-experiment inventory:

```text
Abilities_Explorer, Connector_Approval, AI_Request_Logging,
Content_Classification, Content_Resizing, Excerpt_Generation,
Alt_Text_Generation, Meta_Description, Editorial_Notes, Editorial_Updates,
Summarization, Title_Generation, Type_Ahead, Comment_Moderation,
Key_Encryption, Suggest_Reply
```

Add a 1.2.0 abilities section describing read-only `core/read-content` and `core/read-users`, including that exposed post types/settings depend on `show_in_abilities`. Add these filters to the hooks table:

```text
wpai_default_request_timeout
wpai_settings_feature_groups
wpai_settings_feature_metadata
wpai_feature_{$id}_settings
```

Document advanced settings as feature-provided metadata, not a separate public registry invented by the skill.

- [ ] **Step 5: Update AI scenarios**

In `ai-client-add-feature-endpoint.json`, append these exact entries:

```json
"Step 11: Branch on is_wp_error($result); use get_error_code/get_error_message/get_error_data on errors and provider/model metadata methods only on successful results"
```

```json
"Never calls getProviderMetadata or getModelMetadata on WP_Error"
```

In `ai-plugin-register-experiment.json`, change the query's target to version 1.2.0 and append:

```json
"Step 14: Check current 1.2.0 capabilities before adding duplicates: sixteen built-in Experiments, core/read-content, core/read-users, advanced feature settings, and wpai_default_request_timeout"
```

```json
"Recognizes Type_Ahead, Key_Encryption, and Suggest_Reply as current built-in Experiments",
"Recognizes core/read-content and core/read-users and does not re-register them blindly",
"Uses wpai_default_request_timeout and documented settings filters rather than inventing extension hooks"
```

- [ ] **Step 6: Verify and commit Task 4**

Run:

```powershell
node eval/harness/run.mjs
rg -n 'v1\.0\.2|''1\.0\.2''|Pull `getProviderMetadata\(\)`' skills/wp-ai-client skills/wp-ai-plugin
git diff --check
```

Expected: harness passes; search returns no matches; diff check passes.

Commit:

```powershell
git add -- eval/harness/release-conformance.mjs skills/wp-ai-client skills/wp-ai-plugin eval/scenarios/ai-client-add-feature-endpoint.json eval/scenarios/ai-plugin-register-experiment.json
git commit -m "docs: refresh WordPress AI skills for current releases"
```

---

### Task 5: WordPress 7.0 Block, Theme, and Interactivity Behavior

**Files:**

- Modify: `eval/harness/release-conformance.mjs`
- Modify: `skills/wp-block-development/SKILL.md`
- Modify: `skills/wp-block-development/references/block-json.md`
- Modify: `skills/wp-block-development/references/debugging.md`
- Modify: `skills/wp-block-themes/references/theme-json.md`
- Modify: `skills/wp-interactivity-api/SKILL.md`
- Modify: `skills/wp-interactivity-api/references/debugging.md`
- Create: `eval/scenarios/interactivity-watch-router-state.json`
- Create: `eval/scenarios/theme-json-7-dimensions.json`

**Interfaces:**

- Produces: conditional editor-iframe guidance, theme.json 7.0 additions, and watcher lifecycle/router-state guidance.

- [ ] **Step 1: Add failing editor assertions**

Insert the following assertions before the closing brace of `runReleaseConformance()`:

```js
for (const file of [
  "skills/wp-block-development/SKILL.md",
  "skills/wp-block-development/references/block-json.md",
]) {
  requireIncludes(repoRoot, file, ["every block inserted", "API version 3"]);
  requireExcludes(repoRoot, file, ["regardless of block apiVersion", "always use the iframe"]);
}
requireIncludes(repoRoot, "skills/wp-block-themes/references/theme-json.md", [
  "## WordPress 7.0 additions",
  "settings.dimensions",
  "width",
  "height",
  "min-height",
  ":focus-visible",
]);
requireIncludes(repoRoot, "skills/wp-interactivity-api/SKILL.md", [
  "watch()",
  "unwatch()",
  "state.url",
  "state.navigation.hasStarted",
  "state.navigation.hasFinished",
]);
```

- [ ] **Step 2: Verify RED**

Run: `node eval/harness/run.mjs`

Expected: block guidance fails the required conditional wording or forbidden unconditional wording.

- [ ] **Step 3: Correct the iframe rule**

Use this contract in all three block-development locations:

```markdown
WordPress 7.0 enforces the iframed post editor only while every block inserted in the post uses Block API version 3 or later. If an inserted block uses API version 1 or 2, WordPress removes the iframe for backward compatibility. New and maintained blocks should still declare `apiVersion: 3` and load editor styles through `block.json`.
```

Keep the `SCRIPT_DEBUG` warning guidance and migration checklist.

- [ ] **Step 4: Add theme.json 7.0 coverage**

Add a version-labeled section explaining width, height, and min-height dimension presets under `settings.dimensions`, and core/button state styling for `:hover`, `:focus`, `:focus-visible`, and `:active`. Include this version 3 example and retain the existing 6.9 form/radius material as a separate section:

```json
{
  "version": 3,
  "settings": {
    "dimensions": {
      "dimensionSizes": [
        { "name": "Content", "slug": "content", "size": "40rem" },
        { "name": "Wide", "slug": "wide", "size": "72rem" }
      ]
    }
  },
  "styles": {
    "blocks": {
      "core/button": {
        ":hover": { "color": { "background": "#1e1e1e" } },
        ":focus-visible": { "outline": { "color": "#3858e9", "style": "solid", "width": "2px" } },
        ":active": { "color": { "background": "#000000" } }
      }
    }
  }
}
```

- [ ] **Step 5: Add Interactivity API watcher lifecycle and router state**

Add this complete watcher example:

```js
import { store, watch } from '@wordpress/interactivity';

const { state } = store( 'core/router' );
const unwatch = watch( () => {
    const controller = new AbortController();
    fetch( '/wp-json/my-plugin/v1/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( { url: state.url } ),
        signal: controller.signal,
    } );

    return () => controller.abort();
} );

// Dispose when the owning integration is torn down.
unwatch();
```

State that `watch()` runs immediately, tracks reactive reads, returns `unwatch`, and invokes callback cleanup before reruns and on disposal. Warn that direct reads of `state.navigation.hasStarted` and `hasFinished` are deprecated in 7.0 and emit development warnings; do not suggest unreleased 7.1 replacements. Explain that `core/router`'s `state.url` is populated during server directive processing and remains stable until the first client navigation.

- [ ] **Step 6: Add scenarios**

Create `eval/scenarios/interactivity-watch-router-state.json` with:

```json
{
  "name": "Track client navigations with Interactivity API watch",
  "skills": ["wp-interactivity-api"],
  "query": "On WordPress 7.0, send analytics when core/router changes URL and stop any pending request before the watcher reruns or is disposed.",
  "expected_behavior": [
    "Import store and watch from @wordpress/interactivity",
    "Read state.url from the core/router store inside watch",
    "Return a cleanup callback that aborts the pending request",
    "Keep and call the unwatch callback during teardown",
    "Do not read state.navigation.hasStarted or state.navigation.hasFinished"
  ],
  "success_criteria": [
    "Uses watch and its reactive state read",
    "Implements rerun and disposal cleanup",
    "Uses server-populated state.url",
    "Avoids deprecated navigation internals"
  ]
}
```

Create `eval/scenarios/theme-json-7-dimensions.json` with:

```json
{
  "name": "Add WordPress 7.0 dimension presets and Button states",
  "skills": ["wordpress-router", "wp-project-triage", "wp-block-themes"],
  "query": "Update this WordPress 7.0 block theme so editors can reuse width and height presets and core Buttons have hover, focus-visible, and active states without custom CSS.",
  "expected_behavior": [
    "Keep theme.json at version 3",
    "Define reusable values under settings.dimensions",
    "Apply width, height, or min-height presets only where supported",
    "Style core/button pseudo states in theme.json",
    "Preserve existing WordPress 6.9 form and radius guidance"
  ],
  "success_criteria": [
    "Uses theme.json version 3",
    "Uses dimension presets",
    "Includes :hover, :focus-visible, and :active Button states",
    "Does not fall back to custom CSS for supported states"
  ]
}
```

- [ ] **Step 7: Verify and commit Task 5**

Run:

```powershell
node eval/harness/run.mjs
rg -n "regardless of block apiVersion|always use the iframe" skills/wp-block-development
git diff --check
```

Expected: harness passes; stale iframe search is empty; diff check passes.

Commit:

```powershell
git add -- eval/harness/release-conformance.mjs skills/wp-block-development skills/wp-block-themes skills/wp-interactivity-api eval/scenarios/interactivity-watch-router-state.json eval/scenarios/theme-json-7-dimensions.json
git commit -m "docs: cover WordPress 7 editor API changes"
```

---

### Task 6: Plugin Directory License Rules and WPDS Fallback

**Files:**

- Modify: `eval/harness/release-conformance.mjs`
- Modify: `skills/wp-plugin-directory-guidelines/SKILL.md`
- Modify: `skills/wp-plugin-directory-guidelines/references/gpl-compliance.md`
- Modify: `skills/wp-plugin-directory-guidelines/references/guideline-review-checklist.md`
- Modify: `eval/scenarios/plugin-directory-license-review.json`
- Modify: `skills/wpds/SKILL.md`
- Modify: `eval/scenarios/wpds-without-mcp.json`

**Interfaces:**

- Produces: required-license/optional-URI distinction and a bounded official-source WPDS fallback.

- [ ] **Step 1: Add failing directory and WPDS assertions**

Insert the following assertions before the closing brace of `runReleaseConformance()`:

```js
for (const file of [
  "skills/wp-plugin-directory-guidelines/SKILL.md",
  "skills/wp-plugin-directory-guidelines/references/gpl-compliance.md",
  "skills/wp-plugin-directory-guidelines/references/guideline-review-checklist.md",
]) {
  requireIncludes(repoRoot, file, ["License URI", "optional"]);
  requireExcludes(repoRoot, file, [
    "Missing `License:` or `License URI:`",
    "has a `License URI:` header",
  ]);
}
requireIncludes(repoRoot, "skills/wpds/SKILL.md", [
  "If the WPDS MCP server is unavailable",
  "developer.wordpress.org/block-editor/reference-guides/components",
  "@wordpress/components",
  "@wordpress/ui",
]);
requireExcludes(repoRoot, "skills/wpds/SKILL.md", [
  "Requires WPDS MCP server configured and running",
  "DO NOT search the web",
]);
```

- [ ] **Step 2: Verify RED**

Run: `node eval/harness/run.mjs`

Expected: license files fail because they do not call `License URI` optional.

- [ ] **Step 3: Correct license acceptance criteria**

Use this distinction in the main skill and both references:

```markdown
- A GPL-compatible `License` declaration is required for WordPress.org acceptance.
- `License URI` is optional metadata. When present, it must match the declared license; its absence alone is not a failure.
```

Keep examples that include a URI, but label the URI line “optional, recommended for clarity.” In `eval/scenarios/plugin-directory-license-review.json`, replace current Steps 5-7 with these four entries:

```json
"Step 5: Recommend replacing the License header with GPL-2.0-or-later; explain that a matching License URI may be added for clarity but is optional",
"Step 6: Explicitly state that omission of License URI alone is not a submission failure",
"Step 7: Recommend replacing the font with one under OFL, GPL-compatible, or an equivalent permissive license",
"Step 8: Remind the author that obfuscated PHP and split licensing would also violate Guideline 1"
```

```json
"Names a concrete valid License header string such as GPL-2.0-or-later",
"Treats License URI as optional and does not fail an otherwise compliant plugin for omitting it"
```

- [ ] **Step 4: Add WPDS capability detection and fallback**

Change compatibility frontmatter to preserve the WordPress 6.9/PHP 7.2.24 floor without requiring MCP:

```yaml
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). WPDS MCP is preferred when available; official WordPress component/package sources are the fallback."
```

Use this decision contract:

```markdown
1. Check whether the WPDS MCP resources (`wpds://pages`, `wpds://components`, `wpds://design-tokens`) are available.
2. If available, use them as the canonical component/token source.
3. If unavailable, state that MCP-only resources could not be queried and use official WordPress sources: the Component Reference, Gutenberg Storybook, `@wordpress/components`, `@wordpress/ui`, and their tagged package source.
4. In fallback mode, verify every component prop and token against a cited official page or installed package type/source. Do not invent undocumented APIs or token names.
```

Link these official entry points:

```text
https://developer.wordpress.org/block-editor/reference-guides/components/
https://developer.wordpress.org/block-editor/reference-guides/packages/packages-components/
https://wordpress.github.io/gutenberg/
https://github.com/WordPress/gutenberg/tree/trunk/packages/ui
```

- [ ] **Step 5: Finalize the no-MCP scenario**

Replace `eval/scenarios/wpds-without-mcp.json` with the exact final contract:

```json
{
  "name": "Use WPDS guidance when its MCP server is unavailable",
  "skills": ["wpds"],
  "query": "Build a WordPress admin settings form with current WordPress components and tokens, but the WPDS MCP server is not installed in this session.",
  "expected_behavior": [
    "Check for WPDS MCP resources before depending on them",
    "State that MCP-only pages, component records, and token lists could not be queried",
    "Continue with official Component Reference, Gutenberg Storybook, @wordpress/components, and @wordpress/ui sources",
    "Verify each used prop or token against an official page or installed package source",
    "Do not invent a component API or token name",
    "Keep the answer focused on the UI layer"
  ],
  "success_criteria": [
    "Does not block solely because MCP is absent",
    "Uses only official fallback sources",
    "Discloses the narrower evidence available without MCP",
    "Produces verifiable UI guidance"
  ]
}
```

- [ ] **Step 6: Verify and commit Task 6**

Run:

```powershell
node eval/harness/run.mjs
rg -n 'Missing `License:` or `License URI:`|Requires WPDS MCP server configured and running|DO NOT search the web' skills/wp-plugin-directory-guidelines skills/wpds
git diff --check
```

Expected: harness passes; stale requirement search is empty; diff check passes.

Commit:

```powershell
git add -- eval/harness/release-conformance.mjs skills/wp-plugin-directory-guidelines skills/wpds eval/scenarios/plugin-directory-license-review.json eval/scenarios/wpds-without-mcp.json
git commit -m "docs: correct directory licensing and WPDS fallback"
```

---

### Task 7: Full Package Verification and Release Readiness

**Files:**

- Review: every file changed by Tasks 0-6.
- Modify only if verification reveals an in-scope defect.

**Interfaces:**

- Consumes: all task commits.
- Produces: verified source package and evidence suitable for review/PR handoff.

- [ ] **Step 1: Re-run the canonical live release refresh**

Run:

```powershell
node shared/scripts/update-upstream-indices.mjs
git diff --exit-code -- shared/references
```

Expected: updater succeeds and the second command exits 0, proving checked-in indexes match the current canonical output.

- [ ] **Step 2: Verify current Playground command shapes**

Run:

```powershell
npx --yes @wp-playground/cli@3.1.45 start --help
npx --yes @wp-playground/cli@3.1.45 server --help
npx --yes @wp-playground/cli@3.1.45 run-blueprint --help
npx --yes @wp-playground/cli@3.1.45 build-snapshot --help
```

Expected: documented commands/options appear; no documented option is absent.

- [ ] **Step 3: Run the complete deterministic suite**

Run:

```powershell
node eval/harness/run.mjs
git diff --check
```

Expected: both exit 0 with no warnings from the harness.

- [ ] **Step 4: Run static skill-quality analysis**

Resolve the installed `plugin-eval` CLI (the plugin's `scripts/plugin-eval.js` may be invoked with `node` when its binary is not on `PATH`) and analyze every directory under `skills/` to JSON files in a task-specific temporary directory. Fail the step if any analysis command exits non-zero. Review `Fix First`, progressive-disclosure budget, broken links, description quality, and helper-script findings for all twenty skills. Correctness, broken-link, unsafe-script, or measured-regression findings return to the owning task's red-green loop.

Static budget bands are comparative review signals, not standalone release failures. Apply the official Agent Skills contract: each `SKILL.md` stays below 500 lines and roughly 5,000 tokens, while detailed references/scripts remain deferred with explicit load or execution conditions. Record static trigger/invoke/deferred overages; do not delete valid domain reference material solely to force it below a generic baseline, especially when the deferred estimate aggregates files that are never loaded together. Require observed usage before promoting a static-only budget signal to a blocking defect. The repository's required `compatibility` key is an accepted generic-analyzer warning.

Also run:

```powershell
node shared/scripts/scaffold-skill.mjs --help
node --check shared/scripts/scaffold-skill.mjs
node --check shared/scripts/update-upstream-indices.mjs
node --check shared/scripts/upstream-index-lib.mjs
node --check eval/harness/skill-quality.mjs
node --check eval/harness/release-conformance.mjs
```

Expected: all commands exit 0; reports have no unresolved correctness, broken-link, unsafe-script, or measured-regression finding. Static-only budget signals and the intentional `compatibility` warning are recorded with their disposition.

- [ ] **Step 5: Build all packaged skill targets outside the repository**

Run:

```powershell
$skillpackOut = Join-Path ([System.IO.Path]::GetTempPath()) 'wordpress-agent-skills-release-refresh'
if (Test-Path -LiteralPath $skillpackOut) {
    Remove-Item -LiteralPath $skillpackOut -Recurse -Force
}
node shared/scripts/skillpack-build.mjs --out=$skillpackOut --targets=codex,vscode,claude,cursor --clean
$builtSkills = Get-ChildItem -LiteralPath (Join-Path $skillpackOut 'codex/.codex/skills') -Directory
if ($builtSkills.Count -ne 20) {
    throw "Expected 20 packaged skills, found $($builtSkills.Count)"
}
```

Expected: build exits 0 and exactly twenty Codex skill directories exist. The deletion target is the explicit task-specific temp directory, never a workspace or home root.

- [ ] **Step 6: Audit all original failure strings**

Run:

```powershell
rg -n --hidden -e '3\.0\.20|--enable-xdebug|--skip-wordpress-setup|currentUserCan|Transport\\Http\\HttpTransport|ErrorHandling\\Implementations|Observability\\Implementations|regardless of block apiVersion|current canonical release: v1\.0\.2|Missing `License:` or `License URI:`|Requires WPDS MCP server configured and running|table-not-found' skills
```

Expected: no matches in shipped skill prose. Regression assertions, scenarios, and synchronization documentation may quote forbidden strings to prove or explain their exclusion. The intentionally documented deprecated `--experimental-multi-worker` spelling is also excluded from skill prose; only tagged upstream CLI help may contain it outside this repository.

- [ ] **Step 7: Review the complete diff against the acceptance criteria**

Run:

```powershell
git status --short
git log --oneline trunk..HEAD
git diff --stat trunk...HEAD
git diff trunk...HEAD -- skills eval shared docs
```

Verify line by line that all nine audit-update skills, WPDS, the three description corrections, authoring/scaffold quality infrastructure, shared indexes, scenarios, and regression checks are present; no unrelated files changed.

- [ ] **Step 8: Commit any verification-only corrections**

If Step 7 finds an in-scope defect, return to the task that owns that file, add a failing assertion, reproduce the failure, apply the correction, rerun that task's explicit verification and staging commands, and use that task's commit message. If no correction is needed, do not create an empty commit.

- [ ] **Step 9: Prepare handoff**

Report:

- the per-skill changes,
- the current release snapshot,
- exact verification commands and outputs,
- commit list,
- any intentionally retained compatibility behavior,
- whether the branch is ready to push and open as a pull request.
