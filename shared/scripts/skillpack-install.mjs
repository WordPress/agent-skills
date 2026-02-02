import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  node shared/scripts/skillpack-install.mjs --dest=<repo-root> [options]",
      "",
      "Options:",
      "  --dest=<path>       Destination repo root (required, unless using --global)",
      "  --from=<path>       Source directory (default: dist)",
      "  --targets=<list>    Comma-separated targets: codex, vscode, claude, claude-global, cursor, cursor-global (default: codex,vscode)",
      "  --skills=<list>     Comma-separated skill names to install (default: all)",
      "  --mode=<mode>       'replace' (default) or 'merge'",
      "  --global            Shorthand for --targets=claude-global (installs to ~/.claude/skills)",
      "  --dry-run           Show what would be installed without making changes",
      "  --list              List available skills and exit",
      "",
      "Targets:",
      "  codex               Install to <dest>/.codex/skills/",
      "  vscode              Install to <dest>/.github/skills/",
      "  claude              Install to <dest>/.claude/skills/ (project-level)",
      "  claude-global       Install to ~/.claude/skills/ (user-level, ignores --dest)",
      "  cursor              Install to <dest>/.cursor/skills/",
      "  cursor-global       Install to ~/.cursor/skills/ (user-level, ignores --dest)",
      "",
      "Examples:",
      "  # Build and install to a WordPress project",
      "  node shared/scripts/skillpack-build.mjs --clean",
      "  node shared/scripts/skillpack-install.mjs --dest=../my-wp-repo --targets=codex,vscode,claude,cursor",
      "",
      "  # Install globally for Claude Code (all skills)",
      "  node shared/scripts/skillpack-install.mjs --global",
      "",
      "  # Install globally for Cursor (all skills)",
      "  node shared/scripts/skillpack-install.mjs --targets=cursor-global",
      "",
      "  # Install specific skills globally",
      "  node shared/scripts/skillpack-install.mjs --global --skills=wp-playground,wp-block-development",
      "",
      "  # Install to project with specific skills",
      "  node shared/scripts/skillpack-install.mjs --dest=../my-repo --targets=claude,cursor --skills=wp-wpcli-and-ops",
      "",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = {
    from: "dist",
    dest: null,
    targets: ["codex", "vscode"],
    skills: [],
    mode: "replace",
    dryRun: false,
    global: false,
    list: false,
  };

  for (const a of argv) {
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--global") args.global = true;
    else if (a === "--list") args.list = true;
    else if (a.startsWith("--from=")) args.from = a.slice("--from=".length);
    else if (a.startsWith("--dest=")) args.dest = a.slice("--dest=".length);
    else if (a.startsWith("--targets=")) args.targets = a.slice("--targets=".length).split(",").filter(Boolean);
    else if (a.startsWith("--skills=")) args.skills = a.slice("--skills=".length).split(",").filter(Boolean);
    else if (a.startsWith("--mode=")) args.mode = a.slice("--mode=".length);
    else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      args.help = true;
    }
  }

  // --global is shorthand for --targets=claude-global
  if (args.global) {
    args.targets = ["claude-global"];
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
  if (isSymlink(srcDir)) throw new Error(`Refusing to copy symlink dir: ${srcDir}`);
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === ".DS_Store") continue;
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);

    if (isSymlink(src)) throw new Error(`Refusing to copy symlink: ${src}`);

    if (ent.isDirectory()) {
      copyDir({ srcDir: src, destDir: dest });
      continue;
    }
    if (ent.isFile()) {
      copyFileSyncPreserveMode(src, dest);
      continue;
    }
  }
}

function listSkillDirs(skillsRoot) {
  if (!fs.existsSync(skillsRoot)) return [];
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(skillsRoot, d.name))
    .filter((d) => fs.existsSync(path.join(d, "SKILL.md")));
}

const VALID_TARGETS = ["codex", "vscode", "claude", "claude-global", "cursor", "cursor-global"];

// Map target to source subdirectory in dist
function getSourceDir(fromDir, target) {
  // claude-global uses the same source as claude; cursor-global uses the same as cursor
  const sourceTarget =
    target === "claude-global" ? "claude" : target === "cursor-global" ? "cursor" : target;
  const targetDirMap = {
    codex: path.join(fromDir, "codex", ".codex", "skills"),
    vscode: path.join(fromDir, "vscode", ".github", "skills"),
    claude: path.join(fromDir, "claude", ".claude", "skills"),
    cursor: path.join(fromDir, "cursor", ".cursor", "skills"),
  };
  return targetDirMap[sourceTarget];
}

// Map target to destination directory
function getDestDir(destRepoRoot, target) {
  // claude-global and cursor-global don't need destRepoRoot
  if (target === "claude-global") {
    return path.join(os.homedir(), ".claude", "skills");
  }
  if (target === "cursor-global") {
    return path.join(os.homedir(), ".cursor", "skills");
  }

  // Other targets require destRepoRoot
  const destDirMap = {
    codex: path.join(destRepoRoot, ".codex", "skills"),
    vscode: path.join(destRepoRoot, ".github", "skills"),
    claude: path.join(destRepoRoot, ".claude", "skills"),
    cursor: path.join(destRepoRoot, ".cursor", "skills"),
  };
  return destDirMap[target];
}

function installTarget({ fromDir, destRepoRoot, target, skillsFilter, mode, dryRun }) {
  const srcSkillsRoot = getSourceDir(fromDir, target);
  const destSkillsRoot = getDestDir(destRepoRoot, target);

  assert(srcSkillsRoot, `Unknown target: ${target}`);
  assert(fs.existsSync(srcSkillsRoot), `Missing source skillpack dir: ${srcSkillsRoot}. Did you run skillpack-build.mjs first?`);

  let skillDirs = listSkillDirs(srcSkillsRoot);
  assert(skillDirs.length > 0, `No skills found in: ${srcSkillsRoot}`);

  // Filter skills if requested
  if (skillsFilter.length > 0) {
    const requested = new Set(skillsFilter);
    const available = skillDirs.map((d) => path.basename(d));

    // Validate requested skills exist
    for (const s of requested) {
      assert(available.includes(s), `Unknown skill: ${s}. Available: ${available.join(", ")}`);
    }

    skillDirs = skillDirs.filter((d) => requested.has(path.basename(d)));
  }

  if (dryRun) {
    process.stdout.write(`[DRY-RUN] Would install ${skillDirs.length} skill(s) to ${destSkillsRoot}:\n`);
    for (const d of skillDirs) {
      process.stdout.write(`  - ${path.basename(d)}\n`);
    }
    return;
  }

  fs.mkdirSync(destSkillsRoot, { recursive: true });

  for (const srcSkillDir of skillDirs) {
    const name = path.basename(srcSkillDir);
    const destSkillDir = path.join(destSkillsRoot, name);

    if (mode === "replace") {
      fs.rmSync(destSkillDir, { recursive: true, force: true });
    }

    copyDir({ srcDir: srcSkillDir, destDir: destSkillDir });
  }

  const isGlobal = target === "claude-global" || target === "cursor-global";
  const location = isGlobal ? destSkillsRoot : path.relative(destRepoRoot, destSkillsRoot) || ".";
  process.stdout.write(`OK: installed ${skillDirs.length} skill(s) to ${location}\n`);
}

function listAvailableSkills(fromDir) {
  // Check all possible target sources
  const sources = ["codex", "vscode", "claude", "cursor"]
    .map((t) => getSourceDir(fromDir, t))
    .filter((p) => fs.existsSync(p));

  if (sources.length === 0) {
    process.stderr.write("No built skills found. Run skillpack-build.mjs first.\n");
    process.exit(1);
  }

  const skillDirs = listSkillDirs(sources[0]);
  process.stdout.write("Available skills:\n");
  for (const d of skillDirs) {
    process.stdout.write(`  - ${path.basename(d)}\n`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const fromDir = path.isAbsolute(args.from) ? args.from : path.join(repoRoot, args.from);

  // Handle --list
  if (args.list) {
    listAvailableSkills(fromDir);
    process.exit(0);
  }

  // Validate targets
  const targets = [...new Set(args.targets)];
  for (const t of targets) {
    assert(VALID_TARGETS.includes(t), `Invalid target: ${t}. Valid targets: ${VALID_TARGETS.join(", ")}`);
  }

  // --dest is required unless only using global targets (claude-global, cursor-global)
  const needsDest = targets.some((t) => t !== "claude-global" && t !== "cursor-global");
  if (needsDest && !args.dest) {
    process.stderr.write("Error: --dest is required for non-global targets.\n\n");
    usage();
    process.exit(1);
  }

  const destRepoRoot = args.dest
    ? path.isAbsolute(args.dest)
      ? args.dest
      : path.join(repoRoot, args.dest)
    : null;

  assert(args.mode === "replace" || args.mode === "merge", "mode must be 'replace' or 'merge'");

  for (const target of targets) {
    installTarget({
      fromDir,
      destRepoRoot,
      target,
      skillsFilter: args.skills,
      mode: args.mode,
      dryRun: args.dryRun,
    });
  }
}

main();
