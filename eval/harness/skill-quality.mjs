import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrows(callback, expectedMessage, message) {
  try {
    callback();
  } catch (error) {
    assert(expectedMessage.test(error.message), `Unexpected regression failure: ${error.message}`);
    return;
  }
  throw new Error(message);
}

export function validateSkillBounds(description, markdown, skillPath, repoRoot) {
  assert(
    description.length < 1024,
    `Description must be below 1,024 characters in ${path.relative(repoRoot, skillPath)} (${description.length} chars)`
  );
  const lineCount = markdown.split(/\r?\n/).length;
  assert(
    lineCount < 500,
    `SKILL.md must be below 500 lines in ${path.relative(repoRoot, skillPath)} (${lineCount} lines)`
  );
}

function runSkillBoundaryContract() {
  const fixturePath = path.join("skills", "boundary-fixture", "SKILL.md");
  assertThrows(
    () => validateSkillBounds("x".repeat(1024), "---\n---", fixturePath, process.cwd()),
    /Description must be below 1,024 characters/,
    "Description bound must reject exactly 1,024 characters"
  );
  assertThrows(
    () => validateSkillBounds("Use when testing exact bounds.", Array(500).fill("line").join("\n"), fixturePath, process.cwd()),
    /SKILL\.md must be below 500 lines/,
    "SKILL.md bound must reject exactly 500 lines"
  );
}

function runScenarioKindContract() {
  const skillNames = new Set(["example-skill"]);
  const baseScenario = {
    name: "Repository infrastructure fixture",
    query: "Run the repository maintenance workflow.",
    expected_behavior: ["Run the repository-owned maintenance command"],
    success_criteria: ["The maintenance command succeeds"],
  };
  validateScenario(
    { ...baseScenario, kind: "repository-infrastructure", skills: [] },
    "repository-infrastructure-fixture.json",
    skillNames
  );
  assertThrows(
    () => validateScenario({ ...baseScenario, skills: [] }, "skill-fixture.json", skillNames),
    /non-empty string array skills/,
    "Skill scenarios must not allow an empty skills list"
  );
  assertThrows(
    () => validateScenario({ ...baseScenario, kind: "unknown", skills: [] }, "unknown-kind-fixture.json", skillNames),
    /unsupported kind/,
    "Unknown scenario kinds must be rejected"
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

const DESCRIPTION_SPLITS = {
  "train_queries.json": { count: 12, shouldTrigger: 6 },
  "validation_queries.json": { count: 8, shouldTrigger: 4 },
  "holdout_queries.json": { count: 6, shouldTrigger: 3 },
};

function validateDescriptionCorpus(corpus, corpusPath, split, allQueries) {
  assert(Array.isArray(corpus), `Description corpus must be a JSON array: ${corpusPath}`);
  assert(corpus.length === split.count, `Description corpus requires ${split.count} entries: ${corpusPath}`);
  let positives = 0;
  const splitQueries = new Set();
  for (const entry of corpus) {
    assert(entry && typeof entry === "object" && !Array.isArray(entry), `Description corpus entry must be an object: ${corpusPath}`);
    const keys = Object.keys(entry).sort();
    assert(keys.length === 2 && keys[0] === "query" && keys[1] === "should_trigger", `Description corpus entry must contain exactly query and should_trigger: ${corpusPath}`);
    assert(isNonEmptyString(entry.query), `Description corpus query must be a non-empty string: ${corpusPath}`);
    assert(typeof entry.should_trigger === "boolean", `Description corpus should_trigger must be boolean: ${corpusPath}`);
    assert(!/\b(todo|placeholder)\b/i.test(entry.query), `Description corpus query contains placeholder text: ${corpusPath}`);
    assert(!/^use this skill[.!]?$/i.test(entry.query.trim()), `Description corpus query is not a realistic example: ${corpusPath}`);
    assert(!splitQueries.has(entry.query), `Duplicate query within corpus: ${corpusPath}`);
    assert(!allQueries.has(entry.query), `Duplicate query across description corpora: ${corpusPath}`);
    splitQueries.add(entry.query);
    allQueries.add(entry.query);
    if (entry.should_trigger) positives += 1;
  }
  assert(positives === split.shouldTrigger, `Description corpus requires ${split.shouldTrigger} positive queries: ${corpusPath}`);
}

function runBehavioralEvidenceContract(repoRoot) {
  const evidencePath = path.join(repoRoot, "eval", "results", "2026-07-17-release-refresh-behavioral.json");
  assert(fs.existsSync(evidencePath), `Missing retained behavioral evaluation evidence: ${path.relative(repoRoot, evidencePath)}`);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  assert(evidence.schemaVersion === 1, "Behavioral evidence must use schemaVersion 1");
  assert(isNonEmptyString(evidence.representativeSetRationale), "Behavioral evidence requires a representative-set rationale");
  assert(evidence.limitations?.descriptionTriggerTelemetry === "not measured", "Behavioral evidence must not imply unmeasured description trigger telemetry");
  assert(isNonEmptyString(evidence.limitations?.reason), "Behavioral evidence must explain the trigger-telemetry limitation");
  assert(Array.isArray(evidence.comparisons) && evidence.comparisons.length === 3, "Behavioral evidence requires exactly three risk-based comparisons");

  const expectedSkills = new Set(["blueprint", "wp-abilities-api", "wp-interactivity-api"]);
  for (const comparison of evidence.comparisons) {
    assert(expectedSkills.delete(comparison.skill), `Unexpected or duplicate behavioral comparison: ${comparison.skill}`);
    assert(isNonEmptyString(comparison.prompt), `Behavioral comparison requires a prompt: ${comparison.skill}`);
    assert(comparison.baseline?.source === "1b47140e16bbb54cadfb3de54c7fadcfafb99c76", `Behavioral baseline must identify the pre-refresh commit: ${comparison.skill}`);
    assert(comparison.current?.source === "working-tree based on 04bb308b35f7a12871251f6b5787c6514910d920", `Behavioral current source must identify its candidate base: ${comparison.skill}`);
    assert(comparison.baseline.effort === comparison.current.effort, `Behavioral comparison effort must match within the pair: ${comparison.skill}`);
    for (const [variant, run] of [["baseline", comparison.baseline], ["current", comparison.current]]) {
      assert(run.completedScenarios === 1 && run.failedScenarios === 0 && run.exitCode === 0, `${variant} behavioral run did not complete cleanly: ${comparison.skill}`);
      assert(Number.isFinite(run.durationMs) && run.durationMs > 0, `${variant} behavioral run requires duration telemetry: ${comparison.skill}`);
      assert(Number.isFinite(run.totalTokens) && run.totalTokens > 0, `${variant} behavioral run requires nonzero token telemetry: ${comparison.skill}`);
      assert(isNonEmptyString(run.workspaceReadEvidence), `${variant} behavioral run requires evidence that the intended workspace skill was read: ${comparison.skill}`);
    }
    assert(Array.isArray(comparison.assertions) && comparison.assertions.length > 0, `Behavioral comparison requires assertions: ${comparison.skill}`);
    for (const assertion of comparison.assertions) {
      assert(isNonEmptyString(assertion.criterion), `Behavioral assertion requires a criterion: ${comparison.skill}`);
      for (const variant of ["baseline", "current"]) {
        assert(["pass", "partial", "fail"].includes(assertion[variant]?.grade), `Behavioral assertion has an invalid ${variant} grade: ${comparison.skill}`);
        assert(isNonEmptyString(assertion[variant]?.evidence), `Behavioral assertion requires ${variant} evidence: ${comparison.skill}`);
      }
      assert(assertion.current.grade !== "fail", `Current behavioral assertion failed: ${comparison.skill} — ${assertion.criterion}`);
    }
    assert(comparison.humanDisposition?.status === "approved", `Behavioral comparison lacks human approval: ${comparison.skill}`);
    assert(isNonEmptyString(comparison.humanDisposition?.rationale), `Behavioral comparison requires human rationale: ${comparison.skill}`);
  }
  assert(expectedSkills.size === 0, `Missing behavioral comparisons: ${[...expectedSkills].join(", ")}`);
}

export function validateScenario(scenario, scenarioPath, skillNames) {
  assert(scenario && typeof scenario === "object" && !Array.isArray(scenario), `Scenario must be a JSON object: ${scenarioPath}`);
  assert(isNonEmptyString(scenario.name), `Scenario requires a non-empty string name: ${scenarioPath}`);
  assert(isNonEmptyString(scenario.query), `Scenario requires a non-empty string query: ${scenarioPath}`);
  const kind = scenario.kind ?? "skill";
  assert(["skill", "repository-infrastructure"].includes(kind), `Scenario has unsupported kind '${kind}': ${scenarioPath}`);
  if (kind === "repository-infrastructure") {
    assert(Array.isArray(scenario.skills) && scenario.skills.length === 0, `Repository infrastructure scenario requires an empty skills array: ${scenarioPath}`);
  } else {
    assert(isNonEmptyStringArray(scenario.skills), `Scenario requires a non-empty string array skills: ${scenarioPath}`);
  }
  for (const field of ["expected_behavior", "success_criteria"]) {
    assert(isNonEmptyStringArray(scenario[field]), `Scenario requires a non-empty string array ${field}: ${scenarioPath}`);
  }
  for (const skillName of scenario.skills) {
    assert(skillNames.has(skillName), `Scenario references unknown skill '${skillName}': ${scenarioPath}`);
  }
}

export function runSkillQuality(repoRoot) {
  runSkillBoundaryContract();
  runScenarioKindContract();
  runBehavioralEvidenceContract(repoRoot);
  const scenariosRoot = path.join(repoRoot, "eval", "scenarios");
  const skillsRoot = path.join(repoRoot, "skills");
  const skillNames = new Set(
    fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  );
  const coveredSkills = new Set();
  const scenarioNames = new Set();

  for (const entry of fs.readdirSync(scenariosRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const scenarioPath = path.join(scenariosRoot, entry.name);
    if (entry.name.endsWith(".md")) {
      assert(entry.name === "README.md", `Markdown scenarios are not allowed: ${path.relative(repoRoot, scenarioPath)}`);
      continue;
    }
    if (!entry.name.endsWith(".json")) continue;
    let scenario;
    try {
      scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
    } catch (error) {
      throw new Error(`Invalid scenario JSON: ${path.relative(repoRoot, scenarioPath)}\n${error.message}`);
    }
    validateScenario(scenario, path.relative(repoRoot, scenarioPath), skillNames);
    assert(!scenarioNames.has(scenario.name), `Duplicate scenario name '${scenario.name}': ${path.relative(repoRoot, scenarioPath)}`);
    scenarioNames.add(scenario.name);
    for (const skillName of scenario.skills) coveredSkills.add(skillName);
  }

  const uncoveredSkills = [...skillNames].filter((skillName) => !coveredSkills.has(skillName));
  assert(uncoveredSkills.length === 0, `Skills without scenario coverage: ${uncoveredSkills.join(", ")}`);

  const allQueries = new Set();
  for (const skillName of ["wp-abilities-audit", "wp-abilities-verify", "wp-playground"]) {
    for (const [fileName, split] of Object.entries(DESCRIPTION_SPLITS)) {
      const corpusPath = path.join(repoRoot, "eval", "descriptions", skillName, fileName);
      assert(fs.existsSync(corpusPath), `Missing description corpus: ${path.relative(repoRoot, corpusPath)}`);
      let corpus;
      try {
        corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
      } catch (error) {
        throw new Error(`Invalid description corpus JSON: ${path.relative(repoRoot, corpusPath)}\n${error.message}`);
      }
      validateDescriptionCorpus(corpus, path.relative(repoRoot, corpusPath), split, allQueries);
    }
  }

  runScaffoldContract(repoRoot);
}

function runScaffoldContract(repoRoot) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wordpress-skill-scaffold-"));
  const scriptPath = path.join(repoRoot, "shared", "scripts", "scaffold-skill.mjs");
  const skillName = "scaffold-contract-skill";
  const description = "Use when checking the non-interactive scaffold contract in an isolated temporary directory.";
  const colonDescription = "Use when preparing a release: inspect the Acme Events plugin before shipping.";
  const multilineDescription = "Use when preparing a release.\nInspect the Acme Events plugin before shipping.";
  const prompt = "Create a safe, repeatable skill scaffold for our Acme Events release checklist.";
  const repoSkillPath = path.join(repoRoot, "skills", skillName);
  const repoScenarioPath = path.join(repoRoot, "eval", "scenarios", `${skillName}.json`);

  try {
    const help = spawnSync(process.execPath, [scriptPath, "--help"], { cwd: tempRoot, encoding: "utf8" });
    assert(help.status === 0, `Scaffold --help must exit 0: ${help.stderr || help.stdout}`);
    assert(/^Usage:/m.test(help.stdout) && help.stdout.trim().length < 1000, "Scaffold --help must print concise usage to stdout");

    const missingPrompt = spawnSync(process.execPath, [scriptPath, skillName, description], { cwd: tempRoot, encoding: "utf8" });
    assert(missingPrompt.status === 2, `Scaffold without --prompt must exit 2: ${missingPrompt.stderr || missingPrompt.stdout}`);
    assert(/--prompt/.test(missingPrompt.stderr), "Scaffold without --prompt must explain the required prompt on stderr");
    assert(!fs.existsSync(path.join(tempRoot, "skills", skillName)), "Scaffold without --prompt must not create a skill");
    assert(!fs.existsSync(path.join(tempRoot, "eval", "scenarios", `${skillName}.json`)), "Scaffold without --prompt must not create a scenario");

    const exactLimitSkillName = "scaffold-exact-description-limit";
    const exactLimitDescription = `Use when ${"x".repeat(1015)}`;
    assert(exactLimitDescription.length === 1024, "Scaffold exact-limit fixture must be 1,024 characters");
    const exactLimit = spawnSync(process.execPath, [scriptPath, exactLimitSkillName, exactLimitDescription, "--prompt", prompt], { cwd: tempRoot, encoding: "utf8" });
    assert(exactLimit.status === 2, `Scaffold must reject a 1,024-character description: ${exactLimit.stderr || exactLimit.stdout}`);
    assert(/1-1023/.test(exactLimit.stderr), "Scaffold must explain the strict 1-1023 description bound");
    assert(!fs.existsSync(path.join(tempRoot, "skills", exactLimitSkillName)), "Scaffold must not create a skill at the exact description limit");
    assert(!fs.existsSync(path.join(tempRoot, "eval", "scenarios", `${exactLimitSkillName}.json`)), "Scaffold must not create a scenario at the exact description limit");

    const valid = spawnSync(process.execPath, [scriptPath, skillName, description, "--prompt", prompt], { cwd: tempRoot, encoding: "utf8" });
    assert(valid.status === 0, `Valid scaffold invocation failed: ${valid.stderr || valid.stdout}`);
    assert(valid.stdout.trim().split(/\r?\n/).length === 1, "Valid scaffold invocation must emit one concise success line");

    const skillPath = path.join(tempRoot, "skills", skillName, "SKILL.md");
    const scenarioPath = path.join(tempRoot, "eval", "scenarios", `${skillName}.json`);
    assert(fs.existsSync(skillPath), "Valid scaffold invocation must create SKILL.md");
    assert(fs.existsSync(scenarioPath), "Valid scaffold invocation must create a JSON scenario");
    const generatedSkill = fs.readFileSync(skillPath, "utf8");
    const generatedDescriptionLine = generatedSkill.split(/\r?\n/).find((line) => line.startsWith("description: "));
    assert(generatedDescriptionLine, "Generated skill must contain a description line");
    assert(JSON.parse(generatedDescriptionLine.slice("description: ".length)) === description, "Generated description must be a safely quoted YAML scalar");
    const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
    validateScenario(scenario, scenarioPath, new Set([skillName]));
    assert(scenario.query === prompt, "Generated scenario must contain the supplied realistic prompt");

    const colonSkillName = "scaffold-colon-description";
    const colon = spawnSync(process.execPath, [scriptPath, colonSkillName, colonDescription, "--prompt", prompt], { cwd: tempRoot, encoding: "utf8" });
    assert(colon.status === 0, `Scaffold must accept a colon-bearing description: ${colon.stderr || colon.stdout}`);
    const colonSkill = fs.readFileSync(path.join(tempRoot, "skills", colonSkillName, "SKILL.md"), "utf8");
    const colonDescriptionLine = colonSkill.split(/\r?\n/).find((line) => line.startsWith("description: "));
    assert(colonDescriptionLine, "Colon-bearing scaffold output must contain a description line");
    assert(colonDescriptionLine === `description: ${JSON.stringify(colonDescription)}`, "Scaffold must quote a colon-bearing YAML description safely");
    assert(JSON.parse(colonDescriptionLine.slice("description: ".length)) === colonDescription, "Scaffold must preserve the colon-bearing description");

    const multilineSkillName = "scaffold-multiline-description";
    const multiline = spawnSync(process.execPath, [scriptPath, multilineSkillName, multilineDescription, "--prompt", prompt], { cwd: tempRoot, encoding: "utf8" });
    assert(multiline.status === 2, `Scaffold must reject multiline descriptions with exit 2: ${multiline.stderr || multiline.stdout}`);
    assert(/one line/i.test(multiline.stderr), "Scaffold must explain that descriptions must be one line");
    assert(!fs.existsSync(path.join(tempRoot, "skills", multilineSkillName)), "Scaffold must not create a skill for a multiline description");
    assert(!fs.existsSync(path.join(tempRoot, "eval", "scenarios", `${multilineSkillName}.json`)), "Scaffold must not create a scenario for a multiline description");
    assert(!fs.existsSync(repoSkillPath) && !fs.existsSync(repoScenarioPath), "Scaffold contract must not touch repository files");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
