#!/usr/bin/env node
// Runs every fixture under ../fixtures through the converter and compares the
// result with the committed expectations:
//
//   fixtures/<name>/input.html      the HTML given to the converter
//   fixtures/<name>/expected.html   the block markup it must produce
//   fixtures/<name>/expected.json   counts, fallbacks, invalid, dropped design
//
// Usage:
//   node run-fixtures.mjs            compare and exit 1 on any difference
//   node run-fixtures.mjs --update   rewrite the expectations from the current output
//   node run-fixtures.mjs <name>     run one fixture

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { run } from "./html-to-blocks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(here, "..", "fixtures");

function summarize(report) {
  return {
    mode: report.mode,
    ok: report.ok,
    blocks: report.validation.counts,
    invalid: report.validation.invalid.map((i) => ({ block: i.block, path: i.path, issues: i.issues })),
    fallbacks: report.validation.fallbacks.map((f) => ({ block: f.block, path: f.path })),
    roundTripStable: report.validation.roundTrip.stable,
    designMapped: report.design.mapped.length,
    designDropped: report.design.dropped.map((d) => ({ element: d.element, property: d.property, reason: d.reason })),
    warnings: report.warnings,
  };
}

function main() {
  const args = process.argv.slice(2);
  const update = args.includes("--update");
  const only = args.filter((a) => !a.startsWith("--"));

  let names = fs
    .readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (only.length) names = names.filter((n) => only.includes(n));
  if (names.length === 0) {
    process.stderr.write("No fixtures found.\n");
    process.exit(2);
  }

  let failures = 0;
  for (const name of names) {
    const dir = path.join(fixturesDir, name);
    const inputPath = path.join(dir, "input.html");
    const expectedHtmlPath = path.join(dir, "expected.html");
    const expectedJsonPath = path.join(dir, "expected.json");

    const html = fs.readFileSync(inputPath, "utf8");
    const report = run(html, { input: path.relative(process.cwd(), inputPath) });
    const summary = summarize(report);
    const markup = report.markup.endsWith("\n") ? report.markup : `${report.markup}\n`;

    if (update) {
      fs.writeFileSync(expectedHtmlPath, markup, "utf8");
      fs.writeFileSync(expectedJsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
      process.stdout.write(`updated  ${name}  (${report.validation.total} blocks, ${report.validation.invalid.length} invalid, ${report.validation.fallbacks.length} fallbacks)\n`);
      continue;
    }

    const problems = [];
    if (!fs.existsSync(expectedHtmlPath)) problems.push("expected.html is missing (run with --update)");
    else if (fs.readFileSync(expectedHtmlPath, "utf8") !== markup) problems.push("block markup differs from expected.html");
    if (!fs.existsSync(expectedJsonPath)) problems.push("expected.json is missing (run with --update)");
    else {
      const expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8"));
      if (JSON.stringify(expected) !== JSON.stringify(summary)) problems.push("report summary differs from expected.json");
    }
    if (report.validation.invalid.length) problems.push(`${report.validation.invalid.length} invalid block(s)`);

    if (problems.length) {
      failures += 1;
      process.stdout.write(`FAIL     ${name}\n`);
      for (const p of problems) process.stdout.write(`         ${p}\n`);
      if (problems.some((p) => p.includes("differs"))) {
        process.stdout.write(`         current summary: ${JSON.stringify(summary)}\n`);
      }
    } else {
      process.stdout.write(`ok       ${name}  (${report.validation.total} blocks, ${report.validation.fallbacks.length} fallbacks, ${report.design.mapped.length} design mapped, ${report.design.dropped.length} dropped)\n`);
    }
  }

  if (!update) process.stdout.write(`${names.length - failures} of ${names.length} fixtures pass\n`);
  process.exit(failures ? 1 : 0);
}

main();
