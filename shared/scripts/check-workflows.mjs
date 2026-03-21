#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");

const minimumMajorByAction = new Map([
  ["actions/checkout", 5],
  ["actions/setup-node", 6],
  ["actions/setup-python", 6],
  ["actions/upload-artifact", 4],
  ["actions/download-artifact", 4],
  ["peter-evans/create-pull-request", 6],
]);

const forbiddenRefs = [
  { pattern: /softprops\/action-gh-release@/i, reason: "Use gh CLI in release.yml instead of softprops/action-gh-release." },
  { pattern: /actions\/checkout@v4\b/i, reason: "Upgrade to actions/checkout@v5." },
  { pattern: /actions\/setup-node@v[1-5]\b/i, reason: "Upgrade to actions/setup-node@v6." },
  { pattern: /actions\/setup-python@v[1-5]\b/i, reason: "Upgrade to actions/setup-python@v6." },
];

const workflowFiles = fs
  .readdirSync(workflowsDir)
  .filter((entry) => entry.endsWith(".yml") || entry.endsWith(".yaml"))
  .sort();

const failures = [];

for (const fileName of workflowFiles) {
  const filePath = path.join(workflowsDir, fileName);
  const content = fs.readFileSync(filePath, "utf8");

  if (!content.includes('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"')) {
    failures.push(`${fileName}: missing FORCE_JAVASCRIPT_ACTIONS_TO_NODE24 test env.`);
  }

  for (const { pattern, reason } of forbiddenRefs) {
    if (pattern.test(content)) {
      failures.push(`${fileName}: ${reason}`);
    }
  }

  const usesMatches = content.matchAll(/uses:\s*([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)@([^\s#]+)/g);
  for (const [, action, ref] of usesMatches) {
    const requiredMajor = minimumMajorByAction.get(action);
    if (!requiredMajor) {
      continue;
    }

    const versionMatch = ref.match(/^v(\d+)$/i);
    if (!versionMatch) {
      continue;
    }

    const major = Number(versionMatch[1]);
    if (major < requiredMajor) {
      failures.push(`${fileName}: ${action}@${ref} is below required major v${requiredMajor}.`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write("Workflow policy check failed:\n");
  for (const failure of failures) {
    process.stderr.write(`- ${failure}\n`);
  }
  process.exit(1);
}

process.stdout.write(`OK: workflow policy checks passed for ${workflowFiles.length} workflow file(s).\n`);
