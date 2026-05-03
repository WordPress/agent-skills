#!/usr/bin/env node
/**
 * detect_ai_client.mjs
 *
 * Deterministic detection for the WP 7.0+ AI Client surface in the current repo.
 * Reads only the filesystem; does not call WP-CLI or hit the running site.
 *
 * Outputs JSON to stdout:
 *   {
 *     "wp_floor":              "<earliest 'Requires at least' across plugin/theme headers, or null>",
 *     "supports_ai_client":    <bool — true iff every detected floor is >= 7.0>,
 *     "uses_ai_client":        <bool — true iff `wp_ai_client_prompt(` appears in PHP>,
 *     "uses_legacy_packages":  <bool — true iff composer.json depends on wordpress/php-ai-client or wordpress/wp-ai-client>,
 *     "feature_endpoints":     [<paths where wp_ai_client_prompt is used>],
 *     "notes":                 [<advisory strings>]
 *   }
 *
 * Usage:
 *   node skills/wp-ai-client/scripts/detect_ai_client.mjs
 *   node skills/wp-ai-client/scripts/detect_ai_client.mjs --root <path>
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const IGNORED_DIRS = new Set([
  "node_modules",
  "vendor",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  ".vercel",
]);

function parseArgs(argv) {
  const args = { root: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) {
      args.root = path.resolve(argv[i + 1]);
      i++;
    }
  }
  return args;
}

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function compareVersions(a, b) {
  // Returns -1 if a<b, 0 if a==b, 1 if a>b. Handles "7.0", "7.0.1", "6.9.4".
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

function extractHeaderField(contents, field) {
  // Plugin/theme headers: " * Requires at least: 7.0" or "Requires at least: 7.0"
  const re = new RegExp(`^[\\s*#]*${field}\\s*:\\s*([^\\r\\n]+)`, "im");
  const match = contents.match(re);
  return match ? match[1].trim() : null;
}

async function main() {
  const { root } = parseArgs(process.argv);
  const result = {
    wp_floor: null,
    supports_ai_client: false,
    uses_ai_client: false,
    uses_legacy_packages: false,
    feature_endpoints: [],
    notes: [],
  };

  let lowestFloor = null;
  const floors = [];

  // 1) Composer dependency check.
  const composerPath = path.join(root, "composer.json");
  try {
    const composer = JSON.parse(await fs.readFile(composerPath, "utf8"));
    const deps = { ...(composer.require || {}), ...(composer["require-dev"] || {}) };
    if (deps["wordpress/php-ai-client"] || deps["wordpress/wp-ai-client"]) {
      result.uses_legacy_packages = true;
      result.notes.push(
        "Detected legacy Composer dep on wordpress/php-ai-client or wordpress/wp-ai-client. On WP 7.0+, php-ai-client is in core; conditional autoloading is required to avoid duplicate-class errors. See references/prompt-builder.md#migration."
      );
    }
  } catch {
    // No composer.json; fine.
  }

  // 2) Walk PHP files, gather signals.
  for await (const file of walk(root)) {
    if (!file.endsWith(".php")) continue;
    let contents;
    try {
      contents = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    // Plugin/theme header detection (Requires at least, plus a sanity check for header format).
    if (
      contents.includes("Plugin Name:") ||
      contents.includes("Theme Name:") ||
      contents.includes("Requires at least:")
    ) {
      const floor = extractHeaderField(contents, "Requires at least");
      if (floor) {
        floors.push({ file: path.relative(root, file), floor });
        if (lowestFloor === null || compareVersions(floor, lowestFloor) < 0) {
          lowestFloor = floor;
        }
      }
    }

    // AI Client usage.
    if (contents.includes("wp_ai_client_prompt(")) {
      result.uses_ai_client = true;
      result.feature_endpoints.push(path.relative(root, file));
    }

    // Legacy SDK class reference (works as a hint even without composer.json).
    if (/AI_Client\s*::\s*prompt\s*\(/.test(contents)) {
      result.uses_legacy_packages = true;
    }
  }

  result.wp_floor = lowestFloor;
  result.supports_ai_client =
    lowestFloor !== null && compareVersions(lowestFloor, "7.0") >= 0;

  if (lowestFloor === null) {
    result.notes.push(
      "No 'Requires at least' header found in any PHP file. Cannot determine WP version floor; assume the project may run on < 7.0 unless confirmed otherwise."
    );
  } else if (!result.supports_ai_client) {
    result.notes.push(
      `Lowest 'Requires at least' is ${lowestFloor} (< 7.0). Either bump to 7.0 or use the conditional autoloader pattern.`
    );
  }

  if (result.uses_ai_client && result.uses_legacy_packages) {
    result.notes.push(
      "Both wp_ai_client_prompt() and AI_Client::prompt() / legacy Composer deps were detected. Pick one path; mixing them on WP 7.0+ causes duplicate-class errors."
    );
  }

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(`detect_ai_client error: ${err.message}\n`);
  process.exit(1);
});
