#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  node shared/scripts/install-auto-sync-hooks.mjs [options]",
      "",
      "Options:",
      "  --vscode-repos=<list>   Comma-separated repo roots to mirror .github/skills into",
      "  --disable               Remove auto-sync hook configuration from this repo",
      "",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = { vscodeRepos: [], disable: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--disable") args.disable = true;
    else if (arg.startsWith("--vscode-repos=")) args.vscodeRepos = arg.slice("--vscode-repos=".length).split(",").filter(Boolean);
    else {
      process.stderr.write(`Unknown arg: ${arg}\n`);
      args.help = true;
    }
  }
  return args;
}

function git(repoRoot, args, ignoreFailure = false) {
  try {
    execFileSync("git", args, { cwd: repoRoot, stdio: "inherit" });
  } catch (error) {
    if (!ignoreFailure) {
      throw error;
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(2);
  }

  const repoRoot = path.resolve(import.meta.dirname, "..", "..");

  if (args.disable) {
    git(repoRoot, ["config", "--unset", "core.hooksPath"], true);
    git(repoRoot, ["config", "--unset-all", "agent-skills.vscodeRepo"], true);
    process.stdout.write("OK: disabled automatic skill sync hooks for this repo.\n");
    process.exit(0);
  }

  git(repoRoot, ["config", "core.hooksPath", ".githooks"]);
  git(repoRoot, ["config", "--unset-all", "agent-skills.vscodeRepo"], true);
  for (const repoPath of args.vscodeRepos) {
    git(repoRoot, ["config", "--add", "agent-skills.vscodeRepo", repoPath]);
  }

  process.stdout.write("OK: enabled automatic skill sync hooks for this repo.\n");
  process.stdout.write("Hooks run after commits, merges, and branch checkouts when skill sources change.\n");
}

main();
