#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";

const RELEVANT_PREFIXES = [
  "skills/",
  "shared/scripts/skillpack-build.mjs",
  "shared/scripts/skillpack-install.mjs",
  "shared/scripts/sync-global-skills.mjs",
];

function readLines(commandArgs, repoRoot, allowFailure = false) {
  const result = spawnSync("git", commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    if (allowFailure) {
      return [];
    }
    throw new Error(result.stderr || `git ${commandArgs.join(" ")} failed`);
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getConfiguredVsCodeRepos(repoRoot) {
  return readLines(["config", "--get-all", "agent-skills.vscodeRepo"], repoRoot, true);
}

function getChangedFiles(eventName, eventArgs, repoRoot) {
  if (eventName === "post-commit") {
    return readLines(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], repoRoot, true);
  }

  if (eventName === "post-merge") {
    return readLines(["diff", "--name-only", "ORIG_HEAD", "HEAD"], repoRoot, true);
  }

  if (eventName === "post-checkout") {
    const [oldRef, newRef, branchFlag] = eventArgs;
    if (branchFlag !== "1" || !oldRef || !newRef) {
      return [];
    }
    return readLines(["diff", "--name-only", oldRef, newRef], repoRoot, true);
  }

  return [];
}

function hasRelevantChanges(files) {
  return files.some((file) => RELEVANT_PREFIXES.some((prefix) => file === prefix || file.startsWith(prefix)));
}

function main() {
  const [eventName = "", ...eventArgs] = process.argv.slice(2);
  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
  const changedFiles = getChangedFiles(eventName, eventArgs, repoRoot);

  if (!hasRelevantChanges(changedFiles)) {
    process.exit(0);
  }

  const vscodeRepos = getConfiguredVsCodeRepos(repoRoot);
  const syncArgs = [path.join("shared", "scripts", "sync-global-skills.mjs")];
  if (vscodeRepos.length > 0) {
    syncArgs.push(`--vscode-repos=${vscodeRepos.join(",")}`);
  }

  const result = spawnSync(process.execPath, syncArgs, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.stderr.write("WARNING: automatic skill sync failed. Run `node shared/scripts/sync-global-skills.mjs` manually.\n");
  }
}

main();
