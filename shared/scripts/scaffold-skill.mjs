import fs from "node:fs";
import path from "node:path";

function usage(stream = process.stdout) {
  stream.write('Usage: node shared/scripts/scaffold-skill.mjs <skill-name> "<description>" --prompt "<realistic user request>"\n');
}

function validateSkillName(name) {
  if (!name || typeof name !== "string") return "Missing skill name";
  if (name.length > 64) return `Skill name exceeds 64 chars (${name.length})`;
  if (name !== name.toLowerCase()) return "Skill name must be lowercase";
  if (name.startsWith("-") || name.endsWith("-")) return "Skill name cannot start or end with hyphen";
  if (name.includes("--")) return "Skill name cannot contain consecutive hyphens";
  if (!/^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u.test(name)) return "Skill name contains invalid characters";
  return null;
}

function invocationError(message) {
  process.stderr.write(`Error: ${message}\n`);
  usage(process.stderr);
  process.exitCode = 2;
}

function parseArguments(args) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) return { help: true };
  if (args.length !== 4 || args[2] !== "--prompt") {
    return { error: "Expected <skill-name> <description> --prompt <realistic user request>" };
  }
  const [skillName, description, , prompt] = args;
  const nameError = validateSkillName(skillName);
  if (nameError) return { error: nameError };
  if (!description || description.length > 1024) return { error: "Description must be 1-1024 characters" };
  if (!description.startsWith("Use when")) return { error: "Description must begin with 'Use when'" };
  if (!prompt || !prompt.trim()) return { error: "--prompt requires a realistic user request" };
  return { skillName, description, prompt };
}

function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    usage();
    return;
  }
  if (parsed.error) {
    invocationError(parsed.error);
    return;
  }

  const repoRoot = process.cwd();
  const skillDir = path.join(repoRoot, "skills", parsed.skillName);
  const skillPath = path.join(skillDir, "SKILL.md");
  const scenarioPath = path.join(repoRoot, "eval", "scenarios", `${parsed.skillName}.json`);
  if (fs.existsSync(skillDir) || fs.existsSync(scenarioPath)) {
    invocationError(`Output already exists for '${parsed.skillName}'`);
    return;
  }

  const skillBody = `---\nname: ${parsed.skillName}\ndescription: ${parsed.description}\ncompatibility: Targets WordPress 6.9+ (PHP 7.2.24+). Filesystem-based agent with bash + node.\n---\n\n# ${parsed.skillName}\n\n## When to use\n\n## Inputs required\n\n## Procedure\n\n## Verification\n\n## Failure modes / debugging\n\n## Escalation\n`;
  const scenario = {
    name: `Apply ${parsed.skillName} to a realistic request`,
    skills: [parsed.skillName],
    query: parsed.prompt,
    expected_behavior: [
      `Load ${parsed.skillName} because the request matches its activation description`,
      "Follow the skill procedure and verify the result",
    ],
    success_criteria: [
      `Uses ${parsed.skillName} for the matching request`,
      "Reports verification evidence",
    ],
  };

  try {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillPath, skillBody, "utf8");
    fs.mkdirSync(path.dirname(scenarioPath), { recursive: true });
    fs.writeFileSync(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
  } catch (error) {
    fs.rmSync(skillDir, { recursive: true, force: true });
    fs.rmSync(scenarioPath, { force: true });
    process.stderr.write(`Error: unable to create scaffold: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`OK: created ${path.relative(repoRoot, skillPath)} and ${path.relative(repoRoot, scenarioPath)}\n`);
}

main();
