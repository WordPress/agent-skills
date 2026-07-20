import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function listSkillDirs(repoRoot) {
  const skillsRoot = path.join(repoRoot, "skills");
  if (!fs.existsSync(skillsRoot)) return [];
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(skillsRoot, d.name));
}

function parseFrontmatter(markdown) {
  const lines = markdown.split("\n");
  if (lines[0]?.trim() !== "---") return null;

  let endIndex = -1;
  for (let i = 1; i < Math.min(lines.length, 500); i += 1) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return null;

  const fmLines = lines.slice(1, endIndex);
  const metadata = {};

  // Minimal YAML mapping parser (supports only "key: value" one-liners).
  for (const line of fmLines) {
    if (!line.trim()) continue;
    const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const raw = m[2];
    const value = raw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
    metadata[key] = value;
  }

  return {
    name: typeof metadata.name === "string" && metadata.name ? metadata.name : null,
    description: typeof metadata.description === "string" && metadata.description ? metadata.description : null,
    _raw: metadata,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateSkillName(name) {
  // Mirrors skills-ref validator intent (unicode letters/digits + hyphens, lowercase).
  if (name.length > 64) return `Skill name exceeds 64 chars (${name.length})`;
  if (name !== name.toLowerCase()) return "Skill name must be lowercase";
  if (name.startsWith("-") || name.endsWith("-")) return "Skill name cannot start or end with hyphen";
  if (name.includes("--")) return "Skill name cannot contain consecutive hyphens";
  const ok = /^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u.test(name);
  if (!ok) return "Skill name contains invalid characters";
  return null;
}

function runJsonCommand(command, args, cwd) {
  const out = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (out.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${out.stderr || out.stdout}`);
  }
  const text = out.stdout.trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON output from: ${command} ${args.join(" ")}\nGot:\n${text.slice(0, 1000)}`);
  }
}

function main() {
  const repoRoot = process.cwd();

  const skillDirs = listSkillDirs(repoRoot);
  assert(skillDirs.length > 0, "No skills found under ./skills");

  for (const dir of skillDirs) {
    const skillPath = path.join(dir, "SKILL.md");
    assert(fs.existsSync(skillPath), `Missing SKILL.md: ${path.relative(repoRoot, skillPath)}`);
    const md = readUtf8(skillPath);
    const fm = parseFrontmatter(md);
    assert(fm, `Missing YAML frontmatter in: ${path.relative(repoRoot, skillPath)}`);
    assert(fm.name, `Missing frontmatter 'name' in: ${path.relative(repoRoot, skillPath)}`);
    assert(fm.description, `Missing frontmatter 'description' in: ${path.relative(repoRoot, skillPath)}`);

    const expectedName = path.basename(dir);
    assert(
      fm.name === expectedName,
      `Frontmatter name mismatch in ${path.relative(repoRoot, skillPath)}: expected '${expectedName}', got '${fm.name}'`
    );

    const nameError = validateSkillName(fm.name);
    assert(!nameError, `Invalid skill name in ${path.relative(repoRoot, skillPath)}: ${nameError}`);
    assert(
      fm.description.length <= 1024,
      `Description too long in ${path.relative(repoRoot, skillPath)} (${fm.description.length} chars)`
    );

    const compatibility = fm._raw.compatibility;
    assert(compatibility, `Missing frontmatter 'compatibility' in: ${path.relative(repoRoot, skillPath)}`);
    assert(
      compatibility.length <= 500,
      `Compatibility too long in ${path.relative(repoRoot, skillPath)} (${compatibility.length} chars)`
    );
    assert(
      compatibility.includes("WordPress 7.0") && compatibility.includes("PHP 7.4.0"),
      `Compatibility contract mismatch in ${path.relative(repoRoot, skillPath)} (expected WP 7.0 + PHP 7.4.0+)`
    );
  }

  const triageScript = path.join(repoRoot, "skills", "wp-project-triage", "scripts", "detect_wp_project.mjs");
  assert(fs.existsSync(triageScript), "Missing triage detector script");

  const report = runJsonCommand("node", [triageScript], repoRoot);
  assert(report?.tool?.name === "detect_wp_project", "Triage report missing tool.name");
  assert(Array.isArray(report?.project?.kind), "Triage report missing project.kind[]");
  assert(report?.signals?.paths?.repoRoot, "Triage report missing signals.paths.repoRoot");
  assert(report?.tooling?.php && report?.tooling?.node && report?.tooling?.tests, "Triage report missing tooling blocks");

  process.stdout.write("OK: skills frontmatter and triage report sanity checks passed.\n");
}

main();
