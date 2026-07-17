import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

export function validateScenario(scenario, scenarioPath, skillNames) {
  assert(scenario && typeof scenario === "object" && !Array.isArray(scenario), `Scenario must be a JSON object: ${scenarioPath}`);
  assert(isNonEmptyString(scenario.name), `Scenario requires a non-empty string name: ${scenarioPath}`);
  assert(isNonEmptyString(scenario.query), `Scenario requires a non-empty string query: ${scenarioPath}`);
  for (const field of ["skills", "expected_behavior", "success_criteria"]) {
    assert(isNonEmptyStringArray(scenario[field]), `Scenario requires a non-empty string array ${field}: ${scenarioPath}`);
  }
  for (const skillName of scenario.skills) {
    assert(skillNames.has(skillName), `Scenario references unknown skill '${skillName}': ${scenarioPath}`);
  }
}

export function runSkillQuality(repoRoot) {
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

    const valid = spawnSync(process.execPath, [scriptPath, skillName, description, "--prompt", prompt], { cwd: tempRoot, encoding: "utf8" });
    assert(valid.status === 0, `Valid scaffold invocation failed: ${valid.stderr || valid.stdout}`);
    assert(valid.stdout.trim().split(/\r?\n/).length === 1, "Valid scaffold invocation must emit one concise success line");

    const skillPath = path.join(tempRoot, "skills", skillName, "SKILL.md");
    const scenarioPath = path.join(tempRoot, "eval", "scenarios", `${skillName}.json`);
    assert(fs.existsSync(skillPath), "Valid scaffold invocation must create SKILL.md");
    assert(fs.existsSync(scenarioPath), "Valid scaffold invocation must create a JSON scenario");
    assert(/description:\s*Use when/.test(fs.readFileSync(skillPath, "utf8")), "Generated description must begin with Use when");
    const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
    validateScenario(scenario, scenarioPath, new Set([skillName]));
    assert(scenario.query === prompt, "Generated scenario must contain the supplied realistic prompt");
    assert(!fs.existsSync(repoSkillPath) && !fs.existsSync(repoScenarioPath), "Scaffold contract must not touch repository files");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
