#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  node shared/scripts/sync-global-skills.mjs [options]",
      "",
      "Options:",
      "  --targets=<list>       Comma-separated targets. Default: codex-global,claude-global,cursor-global",
      "  --vscode-repos=<list>   Comma-separated repo roots to update with .github/skills for Copilot / VS Code",
      "  --skills=<list>         Comma-separated subset of skills to sync",
      "  --mode=<mode>           'replace' (default) or 'merge'",
      "  --skip-build            Reuse existing dist output instead of rebuilding",
      "  --dry-run               Show planned installs without writing files",
      "",
      "Notes:",
      "  - Codex, Claude Code, and Cursor support user-level installs.",
      "  - GitHub Copilot / VS Code skills remain repo-local; use --vscode-repos to mirror updates into specific repos.",
      "",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = {
    targets: ["codex-global", "claude-global", "cursor-global"],
    vscodeRepos: [],
    skills: [],
    mode: "replace",
    skipBuild: false,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--skip-build") args.skipBuild = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--targets=")) args.targets = arg.slice("--targets=".length).split(",").filter(Boolean);
    else if (arg.startsWith("--vscode-repos=")) args.vscodeRepos = arg.slice("--vscode-repos=".length).split(",").filter(Boolean);
    else if (arg.startsWith("--skills=")) args.skills = arg.slice("--skills=".length).split(",").filter(Boolean);
    else if (arg.startsWith("--mode=")) args.mode = arg.slice("--mode=".length);
    else {
      process.stderr.write(`Unknown arg: ${arg}\n`);
      args.help = true;
    }
  }

  return args;
}

function runNode(args, repoRoot) {
  execFileSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(2);
  }

  if (args.mode !== "replace" && args.mode !== "merge") {
    throw new Error("mode must be 'replace' or 'merge'");
  }

  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
  const distDir = path.join(repoRoot, "dist");
  const buildTargets = new Set(
    args.targets.map((target) => {
      if (target === "codex-global") return "codex";
      if (target === "claude-global") return "claude";
      if (target === "cursor-global") return "cursor";
      return target;
    })
  );

  if (args.vscodeRepos.length > 0) {
    buildTargets.add("vscode");
  }

  if (!args.skipBuild) {
    const buildArgs = [
      path.join("shared", "scripts", "skillpack-build.mjs"),
      "--clean",
      `--out=${distDir}`,
      `--targets=${[...buildTargets].join(",")}`,
    ];
    if (args.skills.length > 0) {
      buildArgs.push(`--skills=${args.skills.join(",")}`);
    }
    runNode(buildArgs, repoRoot);
  }

  const installArgs = [
    path.join("shared", "scripts", "skillpack-install.mjs"),
    `--from=${distDir}`,
    `--targets=${args.targets.join(",")}`,
    `--mode=${args.mode}`,
  ];
  if (args.skills.length > 0) {
    installArgs.push(`--skills=${args.skills.join(",")}`);
  }
  if (args.dryRun) {
    installArgs.push("--dry-run");
  }
  runNode(installArgs, repoRoot);

  for (const repoPath of args.vscodeRepos) {
    const vscodeArgs = [
      path.join("shared", "scripts", "skillpack-install.mjs"),
      `--from=${distDir}`,
      `--dest=${repoPath}`,
      "--targets=vscode",
      `--mode=${args.mode}`,
    ];
    if (args.skills.length > 0) {
      vscodeArgs.push(`--skills=${args.skills.join(",")}`);
    }
    if (args.dryRun) {
      vscodeArgs.push("--dry-run");
    }
    runNode(vscodeArgs, repoRoot);
  }
}

main();
