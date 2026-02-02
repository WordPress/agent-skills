import fs from "node:fs";
import path from "node:path";

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  node shared/scripts/skillpack-build.mjs [--out=dist] [--targets=codex,vscode,claude,cursor] [--skills=skill1,skill2] [--clean]",
      "",
      "Outputs:",
      "  - <out>/codex/.codex/skills/<skill>/SKILL.md",
      "  - <out>/vscode/.github/skills/<skill>/SKILL.md",
      "  - <out>/claude/.claude/skills/<skill>/SKILL.md",
      "  - <out>/cursor/.cursor/skills/<skill>/SKILL.md",
      "",
      "Options:",
      "  --targets    Comma-separated list of targets (codex, vscode, claude, cursor). Default: codex,vscode,claude,cursor",
      "  --skills     Comma-separated list of skill names to build. Default: all skills",
      "  --clean      Remove target directories before building",
      "",
      "Notes:",
      "- Avoids symlinks (Codex ignores symlinked directories).",
      "",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = { out: "dist", targets: ["codex", "vscode", "claude", "cursor"], skills: [], clean: false };
  for (const a of argv) {
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--clean") args.clean = true;
    else if (a.startsWith("--out=")) args.out = a.slice("--out=".length);
    else if (a.startsWith("--targets=")) args.targets = a.slice("--targets=".length).split(",").filter(Boolean);
    else if (a.startsWith("--skills=")) args.skills = a.slice("--skills=".length).split(",").filter(Boolean);
    else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      args.help = true;
    }
  }
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function copyFileSyncPreserveMode(src, dest) {
  const st = fs.statSync(src);
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, st.mode);
}

function copyDir({ srcDir, destDir }) {
  assert(!isSymlink(srcDir), `Refusing to copy symlink dir: ${srcDir}`);
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === ".DS_Store") continue;
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);

    if (isSymlink(src)) {
      throw new Error(`Refusing to copy symlink: ${src}`);
    }

    if (ent.isDirectory()) {
      copyDir({ srcDir: src, destDir: dest });
      continue;
    }
    if (ent.isFile()) {
      copyFileSyncPreserveMode(src, dest);
      continue;
    }
    // Ignore sockets, devices, etc.
  }
}

function listSkillDirs(skillsRoot) {
  if (!fs.existsSync(skillsRoot)) return [];
  const dirs = fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(skillsRoot, d.name));

  return dirs.filter((d) => fs.existsSync(path.join(d, "SKILL.md")));
}

function buildTarget({ repoRoot, outDir, target, skillDirs }) {
  const rootByTarget = {
    codex: path.join(outDir, "codex", ".codex", "skills"),
    vscode: path.join(outDir, "vscode", ".github", "skills"),
    claude: path.join(outDir, "claude", ".claude", "skills"),
    cursor: path.join(outDir, "cursor", ".cursor", "skills"),
  };
  const destSkillsRoot = rootByTarget[target];
  assert(destSkillsRoot, `Unknown target: ${target}`);

  fs.mkdirSync(destSkillsRoot, { recursive: true });

  for (const srcSkillDir of skillDirs) {
    const name = path.basename(srcSkillDir);
    const destSkillDir = path.join(destSkillsRoot, name);
    copyDir({ srcDir: srcSkillDir, destDir: destSkillDir });
  }

  const rel = path.relative(repoRoot, destSkillsRoot);
  process.stdout.write(`OK: built ${target} skillpack at ${rel}\n`);
}

const VALID_TARGETS = ["codex", "vscode", "claude", "cursor"];

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const skillsRoot = path.join(repoRoot, "skills");
  const outDir = path.isAbsolute(args.out) ? args.out : path.join(repoRoot, args.out);

  let skillDirs = listSkillDirs(skillsRoot);
  assert(skillDirs.length > 0, "No skills found under ./skills");

  // Filter skills if --skills was specified
  if (args.skills.length > 0) {
    const requestedSkills = new Set(args.skills);
    const availableSkills = skillDirs.map((d) => path.basename(d));

    // Validate requested skills exist
    for (const s of requestedSkills) {
      assert(availableSkills.includes(s), `Unknown skill: ${s}. Available: ${availableSkills.join(", ")}`);
    }

    skillDirs = skillDirs.filter((d) => requestedSkills.has(path.basename(d)));
  }

  const targets = [...new Set(args.targets)];
  for (const t of targets) {
    assert(VALID_TARGETS.includes(t), `Invalid target: ${t}. Valid targets: ${VALID_TARGETS.join(", ")}`);
  }

  if (args.clean) {
    for (const t of targets) {
      const targetDir = path.join(outDir, t);
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  for (const target of targets) {
    buildTarget({ repoRoot, outDir, target, skillDirs });
  }
}

main();

