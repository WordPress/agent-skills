import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  node shared/scripts/skillpack-build.mjs [--out=dist] [--targets=codex,vscode,claude,cursor,junie] [--skills=skill1,skill2] [--clean]",
      "",
      "Outputs:",
      "  - <out>/codex/.codex/skills/<skill>/SKILL.md",
      "  - <out>/vscode/.github/skills/<skill>/SKILL.md",
      "  - <out>/claude/.claude/skills/<skill>/SKILL.md",
      "  - <out>/cursor/.cursor/skills/<skill>/SKILL.md",
      "  - <out>/junie/.junie/skills/<skill>/SKILL.md",
      "  - <out>/junie/.junie/wordpress_guidelines.md",
      "",
      "Options:",
      "  --targets    Comma-separated list of targets (codex, vscode, claude, cursor, junie). Default: codex,vscode,claude,cursor,junie",
      "  --skills     Comma-separated list of skill names to build. Default: all skills",
      "  --clean      Remove target directories before building",
      "",
      "Notes:",
      "- Avoids symlinks (Codex ignores symlinked directories).",
      "","  - junie target also downloads WordPress guidelines into the .junie folder.",
      "",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = { out: "dist", targets: ["codex", "vscode", "claude", "cursor", "junie"], skills: [], clean: false };
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
    junie: path.join(outDir, "junie", ".junie", "skills"),
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

const VALID_TARGETS = ["codex", "vscode", "claude", "cursor", "junie"];

async function downloadGuidelines(destRoot) {
  // Download the WordPress guidelines markdown and save it into destRoot
  const url = "https://github.com/user-attachments/files/25775597/wordpress_guidelines.md";
  const destPath = path.join(destRoot, "wordpress_guidelines.md");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download guidelines: ${res.status} ${res.statusText}`);
  }
  const content = await res.text();
  fs.writeFileSync(destPath, content);
}

async function main() {
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
    if (target === "junie") {
      // ensure guidelines file is present in the root of the .junie folder
      const junieRoot = path.join(outDir, "junie", ".junie");
      try {
        await downloadGuidelines(junieRoot);
        process.stdout.write(`OK: downloaded guidelines to ${path.relative(repoRoot, junieRoot)}\n`);
      } catch (err) {
        process.stderr.write(`Warning: could not download guidelines: ${err.message}\n`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

