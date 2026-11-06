#!/usr/bin/env node
// Converts an HTML file to WordPress block markup with rawHandler() and the
// registered core blocks, maps inline design onto block supports, and
// validates the result by serialize -> parse -> compare.
//
// Usage:
//   node html-to-blocks.mjs <input.html|-> [--out <file>] [--json] [--strict]
//
// Output:
//   - block markup on stdout, or in --out <file>
//   - the report on stderr (text), or everything as JSON on stdout with --json
//
// Exit codes:
//   0  every block is valid (core/html fallbacks are allowed unless --strict)
//   1  at least one invalid block, or a fallback with --strict
//   2  usage or missing dependencies
//
// If the input already contains block delimiters (<!-- wp:), it is validated
// as block markup instead of converted.

import fs from "node:fs";
import path from "node:path";

import { loadBlocksEnvironment, quietly } from "./lib/environment.mjs";
import { convertHtml } from "./lib/convert.mjs";
import { validateBlocks } from "./lib/validate.mjs";
import { formatReport } from "./lib/report.mjs";

const TOOL = { name: "html-to-blocks", version: "0.1.0" };

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  node html-to-blocks.mjs <input.html|-> [--out <file>] [--json] [--strict]",
      "",
      "Options:",
      "  --out <file>   Write the block markup to <file> instead of stdout.",
      "  --json         Print a JSON report (with the markup) on stdout.",
      "  --strict       Exit 1 when any core/html or core/freeform fallback remains.",
      "  -              Read the HTML from stdin.",
      "",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = { input: null, out: null, json: false, strict: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--json") args.json = true;
    else if (a === "--strict") args.strict = true;
    else if (a === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (a.startsWith("--out=")) args.out = a.slice("--out=".length);
    else if (a.startsWith("--")) {
      process.stderr.write(`Unknown option: ${a}\n`);
      args.help = true;
    } else if (!args.input) args.input = a;
    else {
      process.stderr.write(`Unexpected argument: ${a}\n`);
      args.help = true;
    }
  }
  return args;
}

function readInput(input) {
  if (input === "-") return fs.readFileSync(0, "utf8");
  return fs.readFileSync(path.resolve(process.cwd(), input), "utf8");
}

/**
 * Runs conversion (or validation) and returns the report object.
 */
export function run(html, { input = "stdin", strict = false } = {}) {
  const env = loadBlocksEnvironment();
  const isBlockMarkup = html.includes("<!-- wp:");

  let blocks;
  let design = { mapped: [], dropped: [] };
  let fallbacks = [];
  let warnings = [];
  let validation;

  if (isBlockMarkup) {
    blocks = quietly(() => env.blocks.parse(html));
    validation = validateBlocks(blocks, env, { markup: html });
  } else {
    const converted = convertHtml(html, env);
    blocks = converted.blocks;
    design = converted.report.design;
    fallbacks = converted.report.fallbacks;
    warnings = converted.report.warnings;
    validation = validateBlocks(blocks, env);
  }

  const invalidCount = validation.invalid.length;
  const fallbackCount = validation.fallbacks.length;
  let ok = invalidCount === 0;
  let okReason = `${validation.total - invalidCount} of ${validation.total} blocks valid`;
  if (fallbackCount) okReason += `, ${fallbackCount} fallback${fallbackCount === 1 ? "" : "s"}`;
  if (strict && fallbackCount) {
    ok = false;
    okReason += "; --strict forbids fallbacks";
  }
  if (!validation.roundTrip.stable && !isBlockMarkup) {
    ok = false;
    okReason += "; round trip is not stable";
  }

  const { reparsed, markup, ...validationSummary } = validation;

  return {
    tool: TOOL,
    packages: env.versions,
    input,
    mode: isBlockMarkup ? "validate" : "convert",
    ok,
    okReason,
    design,
    fallbacks,
    warnings,
    validation: validationSummary,
    markup,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    usage();
    process.exit(2);
  }

  let html;
  try {
    html = readInput(args.input);
  } catch (error) {
    process.stderr.write(`Cannot read ${args.input}: ${error.message}\n`);
    process.exit(2);
  }

  const report = run(html, { input: args.input, strict: args.strict });

  if (args.out) {
    fs.writeFileSync(path.resolve(process.cwd(), args.out), report.markup, "utf8");
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stderr.write(formatReport(report));
    if (args.out) process.stderr.write(`Markup written to ${args.out}\n`);
    else process.stdout.write(report.markup.endsWith("\n") ? report.markup : `${report.markup}\n`);
  }

  process.exit(report.ok ? 0 : 1);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (invokedDirectly) main();
