import fs from "node:fs";
import path from "node:path";

function usage() {
  process.stderr.write(
    [
      "Usage:",
      '  node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"',
      "",
      "Notes:",
      "- <skill-name> must be lowercase unicode letters/digits with hyphens (no leading/trailing hyphen, no --).",
      "- Creates skills/<skill-name>/SKILL.md and eval/scenarios/<skill-name>.md",
      "",
    ].join("\n")
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateSkillName(name) {
  if (!name || typeof name !== "string") return "Missing skill name";
  if (name.length > 64) return `Skill name exceeds 64 chars (${name.length})`;
  if (name !== name.toLowerCase()) return "Skill name must be lowercase";
  if (name.startsWith("-") || name.endsWith("-")) return "Skill name cannot start or end with hyphen";
  if (name.includes("--")) return "Skill name cannot contain consecutive hyphens";
  const ok = /^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u.test(name);
  if (!ok) return "Skill name contains invalid characters";
  return null;
}

function main() {
  const [, , skillName, description] = process.argv;
  if (!skillName || !description) {
    usage();
    process.exit(2);
  }

  const nameError = validateSkillName(skillName);
  assert(!nameError, nameError);
  assert(description.length > 0 && description.length <= 1024, "Description must be 1-1024 characters");

  const repoRoot = process.cwd();
  const skillDir = path.join(repoRoot, "skills", skillName);
  const skillMd = path.join(skillDir, "SKILL.md");
  const scenarioPath = path.join(repoRoot, "eval", "scenarios", `${skillName}.md`);

  assert(!fs.existsSync(skillDir), `Skill directory already exists: ${path.relative(repoRoot, skillDir)}`);
  fs.mkdirSync(skillDir, { recursive: true });

  const skillBody = `---\nname: ${skillName}\ndescription: ${description}\ncompatibility: Targets WordPress 7.0+ (PHP 7.4.0+). Filesystem-based agent with bash + node.\n---\n\n# ${skillName}\n\n## When to use\n\n## Inputs required\n\n## Procedure\n\n## Verification\n\n## Failure modes / debugging\n\n## Escalation\n`;
  fs.writeFileSync(skillMd, skillBody, "utf8");

  fs.mkdirSync(path.dirname(scenarioPath), { recursive: true });
  const scenario = `# Scenario: ${skillName}\n\n## Prompt\n\n## Expected behavior\n\n- Uses \`${skillName}\` when the prompt matches its description.\n- Follows the skill procedure and verifies results.\n`;
  fs.writeFileSync(scenarioPath, scenario, "utf8");

  process.stdout.write(`OK: created ${path.relative(repoRoot, skillMd)} and ${path.relative(repoRoot, scenarioPath)}\n`);
}

main();
