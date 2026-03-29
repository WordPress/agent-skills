#!/usr/bin/env node

/**
 * Generates AGENTS.md from the skill inventory in skills/ and
 * non-overridable policies from the .github governance repo.
 *
 * Each SKILL.md must have YAML frontmatter with `name` and `description` fields.
 * Skills are grouped by category based on the README.md table structure.
 *
 * Policies with `agents-md: true` in their frontmatter are appended as
 * universal behavioral rules that all agents must follow.
 *
 * Usage:
 *   node shared/scripts/generate-agents-md.mjs [--out=path] [--policies=path]
 *
 * Default output: stdout. Use --out to write to a file.
 * --policies: path to .github/policies/ directory (default: ../../.github/policies)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const DEFAULT_POLICIES_DIR = path.resolve(REPO_ROOT, "../.github/policies");

// Category assignments — maps skill name to category.
// Update this when adding new skills.
const CATEGORIES = {
  "WordPress Development": [
    "wordpress-router",
    "wp-project-triage",
    "wp-block-development",
    "wp-block-themes",
    "wp-plugin-development",
    "wp-rest-api",
    "wp-interactivity-api",
    "wp-abilities-api",
    "wpds",
  ],
  "Operations and Tooling": [
    "wp-wpcli-and-ops",
    "wp-phpstan",
    "wp-playground",
    "wp-github-actions",
    "wp-readme-optimizer",
  ],
  "Accessibility": [
    "wp-accessibility",
  ],
  "Security": [
    "wp-secure-code",
    "wp-vip-standards",
  ],
  "Performance": [
    "wp-performance",
    "wp-performance-review",
  ],
  "Documentation": [
    "security-researcher",
    "wordpress-security-doc-editor",
    "wordpress-runbook-ops",
  ],
  "Local Development Environments": [
    "studio",
    "studio-xdebug",
    "local-studio-env",
  ],
  "Developer Tools": [
    "github-repo",
    "github-profile",
  ],
};

function parseArgs(argv) {
  const args = { out: null, policiesDir: DEFAULT_POLICIES_DIR };
  for (const a of argv) {
    if (a === "--help" || a === "-h") args.help = true;
    else if (a.startsWith("--out=")) args.out = a.slice("--out=".length);
    else if (a.startsWith("--policies=")) args.policiesDir = a.slice("--policies=".length);
    else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      args.help = true;
    }
  }
  return args;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split("\n");
  let currentKey = null;
  let currentVal = "";
  let multiline = false;

  function flush() {
    if (currentKey) {
      fm[currentKey] = currentVal.trim();
    }
  }

  for (const line of lines) {
    // Continuation line for multi-line scalar (indented)
    if (multiline && (line.startsWith("  ") || line.startsWith("\t"))) {
      currentVal += " " + line.trim();
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    // New key — flush previous
    flush();

    currentKey = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    // YAML folded (>) or literal (|) scalar
    if (val === ">" || val === "|") {
      multiline = true;
      currentVal = "";
      continue;
    }

    multiline = false;
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    currentVal = val;
  }
  flush();
  return fm;
}

function loadSkills() {
  const skills = new Map();
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(SKILLS_DIR, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;
    const content = fs.readFileSync(skillFile, "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm.name || !fm.description) {
      process.stderr.write(`Warning: ${entry.name}/SKILL.md missing name or description in frontmatter, skipping\n`);
      continue;
    }
    // Truncate description to first sentence for the listing
    let desc = fm.description;
    const periodIdx = desc.indexOf(". ");
    if (periodIdx !== -1 && periodIdx < 120) {
      desc = desc.slice(0, periodIdx + 1);
    } else if (desc.length > 120) {
      desc = desc.slice(0, 117) + "...";
    }
    skills.set(fm.name, desc);
  }
  return skills;
}

function loadAgentsPolicies(policiesDir) {
  if (!fs.existsSync(policiesDir)) {
    process.stderr.write(`Warning: policies directory not found at ${policiesDir}, skipping policies\n`);
    return [];
  }

  const policies = [];
  const files = fs.readdirSync(policiesDir).filter(f => f.endsWith(".md")).sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(policiesDir, file), "utf-8");
    const fm = parseFrontmatter(content);

    if (fm["agents-md"] !== "true") continue;

    // Extract the body (everything after the frontmatter)
    const body = content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
    if (!body) continue;

    policies.push({
      name: file.replace(".md", ""),
      overridable: fm.overridable === "true",
      body,
    });
  }

  return policies;
}

function generate(skills, policies) {
  const lines = [];

  lines.push("## Scope");
  lines.push("");
  lines.push("Apply these instructions only when the current repository is WordPress-related.");
  lines.push("Treat a repository as WordPress-related if at least one condition matches:");
  lines.push("- Repository name contains `wordpress` or starts with `wp-`.");
  lines.push("- Repository contains WordPress indicators such as `wp-config.php`, `wp-content/`, plugin headers, `block.json`, or `theme.json`.");
  lines.push("");
  lines.push("If the repository is not WordPress-related, ignore this file.");
  lines.push("");
  lines.push("## Skills");
  lines.push("");
  lines.push("A skill is a local instruction set stored in a `SKILL.md` file. The canonical source for all WordPress agent skills is `agent-skills/` (fork of WordPress/agent-skills). Individual repos should not ship their own skill definitions — they consume skills from agent-skills.");
  lines.push("");
  lines.push("### Available WordPress skills");

  // Track which skills we've listed so we can warn about uncategorized ones
  const listed = new Set();

  for (const [category, skillNames] of Object.entries(CATEGORIES)) {
    lines.push("");
    lines.push(`#### ${category}`);
    for (const name of skillNames) {
      const desc = skills.get(name);
      if (!desc) {
        process.stderr.write(`Warning: skill '${name}' listed in category '${category}' but not found in skills/\n`);
        continue;
      }
      lines.push(`- \`${name}\`: ${desc}`);
      listed.add(name);
    }
  }

  // Warn about skills that exist but aren't in any category
  for (const [name] of skills) {
    if (!listed.has(name)) {
      process.stderr.write(`Warning: skill '${name}' exists in skills/ but is not assigned to any category in generate-agents-md.mjs\n`);
    }
  }

  lines.push("");
  lines.push("### Trigger rules");
  lines.push("- If a user names a skill (for example `$wp-rest-api`) or the task clearly matches a skill description, use that skill.");
  lines.push("- Use the smallest set of skills needed for the task.");
  lines.push("- Prefer `wordpress-router` first when the correct WordPress specialist skill is not obvious.");
  lines.push("- Do not carry skills across turns unless they are re-mentioned or clearly required by the new request.");
  lines.push("");
  lines.push("### Coordination");
  lines.push("- Announce which skill(s) you are using and why in one short line.");
  lines.push("- If multiple skills apply, state the order and then execute.");
  lines.push("- If a skill is missing or unreadable, state that briefly and continue with a direct fallback.");
  lines.push("");
  lines.push("### Style");
  lines.push("- Keep brand casing as `WordPress`.");

  // Append non-overridable policies
  if (policies.length > 0) {
    lines.push("");
    lines.push("## Policies");
    lines.push("");
    lines.push("These behavioral rules apply to all agents working in WordPress repos. Non-overridable policies cannot be weakened by per-repo configuration.");
    for (const policy of policies) {
      lines.push("");
      lines.push(policy.body);
    }
  }

  lines.push("");

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stderr.write("Usage: node shared/scripts/generate-agents-md.mjs [--out=path] [--policies=path]\n");
    process.exit(1);
  }

  const skills = loadSkills();
  const policies = loadAgentsPolicies(args.policiesDir);
  process.stderr.write(`Found ${skills.size} skills, ${policies.length} agent-facing policies\n`);

  const output = generate(skills, policies);

  if (args.out) {
    fs.writeFileSync(args.out, output, "utf-8");
    process.stderr.write(`Wrote ${args.out}\n`);
  } else {
    process.stdout.write(output);
  }
}

main();
