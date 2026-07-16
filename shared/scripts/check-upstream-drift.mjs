import fs from "node:fs";
import path from "node:path";

/**
 * Compares committed upstream release indices against the versions skills
 * declare as canonical, so CI turns red when a skill lags upstream.
 *
 * Deterministic and offline: this reads only committed files. The indices
 * are refreshed by `shared/scripts/update-upstream-indices.mjs` (the
 * Upstream Sync workflow opens a PR with the refreshed index); once a newer
 * release lands in the index, this check fails until the skill is re-synced
 * and its declared canonical release is bumped.
 */

const CHECKS = [
  {
    name: "wp-ai-plugin vs WordPress/ai releases",
    indexFile: "shared/references/ai-plugin-releases.json",
    skillFile: "skills/wp-ai-plugin/SKILL.md",
    // Matches the frontmatter compatibility line, e.g.
    // "(current canonical release: v1.2.0)".
    skillPattern: /current canonical release:\s*v?(\d+(?:\.\d+)+)/,
    hint: "Re-sync skills/wp-ai-plugin to the newer release (verify against the tagged source per docs/upstream-sync.md), then bump the 'current canonical release' marker in its SKILL.md compatibility line.",
  },
];

function parseVersion(value) {
  return String(value)
    .replace(/^v/, "")
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function main() {
  const repoRoot = process.cwd();
  const failures = [];

  for (const check of CHECKS) {
    const indexPath = path.join(repoRoot, check.indexFile);
    const skillPath = path.join(repoRoot, check.skillFile);

    if (!fs.existsSync(indexPath)) {
      failures.push(
        `[${check.name}] Missing index ${check.indexFile} — run \`node shared/scripts/update-upstream-indices.mjs\`.`
      );
      continue;
    }
    if (!fs.existsSync(skillPath)) {
      failures.push(`[${check.name}] Missing skill file ${check.skillFile}.`);
      continue;
    }

    let latestTag = null;
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      latestTag = index?.latest?.tag ?? null;
    } catch {
      failures.push(`[${check.name}] Could not parse ${check.indexFile} as JSON.`);
      continue;
    }
    if (!latestTag) {
      failures.push(`[${check.name}] ${check.indexFile} has no latest.tag.`);
      continue;
    }

    const skillText = fs.readFileSync(skillPath, "utf8");
    const match = skillText.match(check.skillPattern);
    if (!match) {
      failures.push(
        `[${check.name}] ${check.skillFile} does not declare a canonical release matching ${check.skillPattern}.`
      );
      continue;
    }

    const declared = match[1];
    if (compareVersions(latestTag, declared) > 0) {
      failures.push(
        `[${check.name}] Upstream latest is ${latestTag} but the skill declares v${declared}. ${check.hint}`
      );
    }
  }

  if (failures.length > 0) {
    for (const f of failures) {
      process.stderr.write(`DRIFT: ${f}\n`);
    }
    process.exit(1);
  }

  process.stdout.write("OK: upstream drift checks passed.\n");
}

main();
