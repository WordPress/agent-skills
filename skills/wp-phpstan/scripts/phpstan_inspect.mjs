import fs from "node:fs";
import path from "node:path";

const TOOL_VERSION = "0.1.0";

/**
 * Reads and parses JSON from a file path.
 *
 * Returns null when parsing fails so the caller can provide user-facing
 * guidance without crashing.
 *
 * @param {string} filePath Absolute path to a JSON file.
 * @returns {any|null} Parsed JSON object.
 */
function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Reads a UTF-8 text file.
 *
 * Returns null when reading fails so callers can surface missing configs
 * without crashing.
 *
 * @param {string} filePath Absolute path to a text file.
 * @returns {string|null} File contents.
 */
function readTextSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Checks whether a path exists and is a regular file.
 *
 * @param {string} filePath Absolute or relative file path.
 * @returns {boolean} True when the path exists and is a file.
 */
function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Normalizes Composer script entries into a flat list of commands.
 *
 * Composer allows scripts to be strings or arrays. This helper provides a
 * consistent format for analysis.
 *
 * @param {unknown} value Composer script value.
 * @returns {string[]} Command list.
 */
function normalizeComposerScript(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((x) => typeof x === "string");
  return [];
}

/**
 * Detects which Composer scripts invoke PHPStan.
 *
 * This helps the agent prefer the repo's own invocation (memory limits,
 * config, bootstrap files) instead of guessing.
 *
 * @param {Record<string, unknown>} scripts Composer scripts block.
 * @returns {Array<{name: string, commands: string[]}>} Matching script entries.
 */
function findPhpstanScripts(scripts) {
  if (!scripts || typeof scripts !== "object") return [];

  const matches = [];

  for (const [name, raw] of Object.entries(scripts)) {
    const commands = normalizeComposerScript(raw);

    const invokesPhpstan = commands.some((cmd) => {
      if (typeof cmd !== "string") return false;
      return cmd.includes("phpstan") || cmd.includes("vendor/bin/phpstan");
    });

    if (!invokesPhpstan) continue;

    matches.push({ name, commands });
  }

  return matches;
}

/**
 * Chooses a recommended command for running PHPStan in the current repo.
 *
 * The intent is to prefer an existing Composer script (often has correct
 * config, bootstrap, and memory limits), falling back to vendor binaries.
 *
 * @param {Array<{name: string, commands: string[]}>} phpstanScripts Matching Composer scripts.
 * @param {{binaryRelPath: string|null, configRelPath: string|null}} fallbackInfo Fallback discovery.
 * @returns {{command: string|null, rationale: string}} Suggested command and why.
 */
function suggestCommand(phpstanScripts, fallbackInfo) {
  const preferred = phpstanScripts.find((s) => s.name === "phpstan");
  if (preferred) {
    return {
      command: `composer run ${preferred.name}`,
      rationale: "Uses the repo's Composer script (preferred for consistent config).",
    };
  }

  if (phpstanScripts.length > 0) {
    return {
      command: `composer run ${phpstanScripts[0].name}`,
      rationale: "Uses the repo's Composer script that invokes PHPStan.",
    };
  }

  if (!fallbackInfo.binaryRelPath) {
    return {
      command: null,
      rationale: "No PHPStan binary detected under vendor/bin and no Composer script found.",
    };
  }

  const configArg = fallbackInfo.configRelPath ? ` -c ${fallbackInfo.configRelPath}` : "";

  return {
    command: `${fallbackInfo.binaryRelPath} analyse${configArg}`,
    rationale: "Falls back to vendor/bin/phpstan with an explicit config when needed.",
  };
}

/**
 * Extracts lightweight hints from a phpstan.neon config.
 *
 * This does not parse NEON. It only checks for common directive tokens so the
 * agent can quickly see whether scan directives are in use.
 *
 * @param {string} configText Raw phpstan config contents.
 * @returns {{mentionsScanDirectories: boolean, mentionsScanFiles: boolean}} Hints.
 */
function buildConfigHints(configText) {
  const t = configText.toLowerCase();

  return {
    mentionsScanDirectories: t.includes("scandirectories"),
    mentionsScanFiles: t.includes("scanfiles"),
  };
}

/**
 * Extracts stub-like package references from a PHPStan config.
 *
 * The PHPStan config usually references stubs via vendor paths (for example,
 * "vendor/php-stubs/wordpress-stubs"), so this helper focuses on composer-style
 * "vendor/package" tokens containing "stubs".
 *
 * @param {string} configText Raw phpstan config contents.
 * @returns {string[]} Unique, lowercased composer-style package references.
 */
function extractStubPackageReferences(configText) {
  const matches = configText
    .toLowerCase()
    .match(/\b[a-z0-9_.-]+\/[a-z0-9_.-]*stubs[a-z0-9_.-]*\b/g);

  if (!matches) return [];

  return [...new Set(matches)].sort();
}

/**
 * Builds a JSON report describing the current repository's PHPStan setup.
 *
 * @returns {object} A stable, machine-readable inspection report.
 */
function buildReport() {
  const repoRoot = process.cwd();

  const composerPath = path.join(repoRoot, "composer.json");
  const composer = isFile(composerPath) ? readJsonSafe(composerPath) : null;

  const phpstanConfigFiles = ["phpstan.neon", "phpstan.neon.dist"].filter((f) =>
    isFile(path.join(repoRoot, f))
  );
  const phpstanBaselineFiles = ["phpstan-baseline.neon", "phpstan-baseline.neon.dist"].filter((f) =>
    isFile(path.join(repoRoot, f))
  );

  let configRelPath = null;
  if (phpstanConfigFiles.includes("phpstan.neon")) configRelPath = "phpstan.neon";
  else if (phpstanConfigFiles.includes("phpstan.neon.dist")) configRelPath = "phpstan.neon.dist";

  const configAbsPath = configRelPath ? path.join(repoRoot, configRelPath) : null;
  const configText = configAbsPath ? readTextSafe(configAbsPath) : null;

  const binaryRelPath = isFile(path.join(repoRoot, "vendor", "bin", "phpstan")) ? "vendor/bin/phpstan" : null;

  const composerScripts = composer?.scripts && typeof composer.scripts === "object" ? composer.scripts : null;
  const phpstanScripts = composerScripts ? findPhpstanScripts(composerScripts) : [];

  const composerDependencies = [
    ...Object.keys(composer?.require ?? {}),
    ...Object.keys(composer?.["require-dev"] ?? {}),
  ].sort();
  const referencedDependencies = configText ? extractStubPackageReferences(configText) : [];

  const configHints = configText ? buildConfigHints(configText) : null;

  const suggested = suggestCommand(phpstanScripts, {
    binaryRelPath,
    configRelPath: configRelPath === "phpstan.neon" ? null : configRelPath,
  });

  const notes = [];

  if (!composer) notes.push("No composer.json found; PHPStan is usually installed via Composer.");
  if (phpstanConfigFiles.length === 0) notes.push("No phpstan.neon or phpstan.neon.dist found at repo root.");
  if (!binaryRelPath && phpstanScripts.length === 0) notes.push("No PHPStan entrypoint detected (Composer script or vendor/bin/phpstan).");



  return {
    tool: { name: "phpstan_inspect", version: TOOL_VERSION },
    repoRoot,
    composer: {
      exists: Boolean(composer),
      path: isFile(composerPath) ? "composer.json" : null,
      phpstanScripts,
      dependencies: composerDependencies,
    },
    phpstan: {
      configFiles: phpstanConfigFiles,
      baselineFiles: phpstanBaselineFiles,
      config: {
        primary: configRelPath,
        hints: configHints,
        referencedDependencies,
      },
      binary: {
        vendorBin: binaryRelPath,
      },
    },
    suggested,
    notes,
  };
}

/**
 * CLI entrypoint for printing the inspection report.
 */
function usage() {
  process.stdout.write(
    [
      "phpstan_inspect — inspect the current working directory (repo root) for PHPStan setup.",
      "",
      "Usage:",
      "  node scripts/phpstan_inspect.mjs [--help]",
      "",
      "Behavior:",
      "  - Reads composer.json and phpstan config/baseline files to report PHPStan wiring.",
      "  - Prints a structured JSON report to stdout; diagnostics (if any) go to stderr.",
      "  - Read-only and non-interactive. Exit code 0 on success.",
      "",
      "Options:",
      "  -h, --help   Show this help and exit.",
      "",
    ].join("\n")
  );
}

function main() {
  if (process.argv.slice(2).some((a) => a === "--help" || a === "-h")) {
    usage();
    return;
  }
  const report = buildReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
