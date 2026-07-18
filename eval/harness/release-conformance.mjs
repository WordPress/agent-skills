import fs from "node:fs";
import path from "node:path";
import { parseWpGutenbergMapFromHtml } from "../../shared/scripts/upstream-index-lib.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(repoRoot, relativePath) {
  return JSON.parse(read(repoRoot, relativePath));
}

const IMMEDIATE_UNWATCH_PATTERN = /\}\s*\);\s*(?:\/\/[^\r\n]*\r?\n)?\s*unwatch\(\);/;

export function requireIncludes(repoRoot, relativePath, expected) {
  const content = read(repoRoot, relativePath);
  for (const value of expected) {
    assert(content.includes(value), `${relativePath} must include: ${value}`);
  }
}

export function requireExcludes(repoRoot, relativePath, forbidden) {
  const content = read(repoRoot, relativePath);
  for (const value of forbidden) {
    assert(!content.includes(value), `${relativePath} must not include: ${value}`);
  }
}

export function requireNoMatch(repoRoot, relativePath, pattern, message) {
  const content = read(repoRoot, relativePath);
  assert(!pattern.test(content), `${relativePath} ${message}`);
}

export function runReleaseConformance(repoRoot) {
  assert(
    IMMEDIATE_UNWATCH_PATTERN.test("const unwatch = watch( () => { return cleanup; } );\n// Dispose later.\nunwatch();"),
    "Immediate-unwatch regression fixture must exercise the structural check"
  );
  const reversedHeaderFixture = `
    <table>
      <tr><th>Gutenberg Version</th><th>WordPress Version</th></tr>
      <tr><td>22.6</td><td>7.0.X</td></tr>
      <tr><td>21.9</td><td>6.9.X</td></tr>
    </table>`;
  const parsed = parseWpGutenbergMapFromHtml(reversedHeaderFixture);
  assert(parsed.rows.length === 2, "Version-map parser must return both rows");
  assert(
    parsed.rows[0].wordpress === "7.0.X" && parsed.rows[0].gutenberg === "22.6",
    "Version-map parser must map columns by header, not position"
  );
  assert(parsed.note === null, "A successful map parse must have note: null");

  let missingTableError = null;
  try {
    parseWpGutenbergMapFromHtml("<p>No mapping table</p>");
  } catch (error) {
    missingTableError = error;
  }
  assert(missingTableError, "Missing mapping data must throw");

  const core = readJson(repoRoot, "shared/references/wordpress-core-versions.json");
  const gutenberg = readJson(repoRoot, "shared/references/gutenberg-releases.json");
  const map = readJson(repoRoot, "shared/references/wp-gutenberg-version-map.json");
  assert(core.latest === "7.0.2", "WordPress latest must be 7.0.2");
  assert(
    core.recent.includes("6.9.5"),
    "WordPress recent must include maintained release 6.9.5"
  );
  assert(gutenberg.latest?.tag === "v23.5.3", "Gutenberg latest must be v23.5.3");
  assert(map.note === null && map.rows.length > 0, "WP/Gutenberg map must be non-empty");
  assert(
    map.rows.some((row) => row.wordpress === "7.0.X" && row.gutenberg === "22.6"),
    "WP/Gutenberg map must include WordPress 7.0.X → Gutenberg 22.6"
  );

  requireIncludes(repoRoot, "skills/blueprint/SKILL.md", [
    '"version": 2',
    '"blueprintMeta"',
    '"applicationOptions"',
    '"additionalStepsAfterExecution"',
    "references/v1-compatibility.md",
  ]);
  requireExcludes(repoRoot, "skills/blueprint/SKILL.md", [
    'Object = `{ username?, password? }`',
  ]);
  requireIncludes(repoRoot, "skills/blueprint/references/v1-compatibility.md", [
    '"resource": "git:directory"',
    '"resource": "literal:directory"',
    '"resource": "bundled"',
    '"step": "installPlugin"',
    '"pluginData"',
    '"step": "writeFiles"',
    '"filesTree"',
    '"step": "runPHP"',
    "require '/wordpress/wp-load.php';",
    '"step": "runSql"',
    '"step": "importWordPressFiles"',
    '"wordPressFilesZip"',
    '"step": "request"',
    '"userId"',
  ]);

  for (const file of [
    "skills/wp-playground/SKILL.md",
    "skills/wp-playground/references/cli-commands.md",
    "skills/wp-playground/references/debugging.md",
  ]) {
    requireExcludes(repoRoot, file, [
      "--enable-xdebug",
      "--experimental-multi-worker",
      "--skip-wordpress-setup",
    ]);
  }
  requireIncludes(repoRoot, "skills/wp-playground/references/cli-commands.md", [
    "3.1.45",
    "@wp-playground/cli@3.1.45 start",
    "--xdebug",
    "--workers=auto",
    "--wordpress-install-mode=install-from-existing-files-if-needed",
    '"8.5"',
  ]);

  requireIncludes(repoRoot, "skills/wp-abilities-api/references/mcp-exposure.md", [
    "meta.mcp.public",
    "composer require automattic/jetpack-autoloader",
    "vendor/autoload_packages.php",
    "^7.4 || ^8.0",
    "WP\\MCP\\Transport\\HttpTransport",
    "WP\\MCP\\Infrastructure\\ErrorHandling\\ErrorLogMcpErrorHandler",
    "WP\\MCP\\Infrastructure\\Observability\\NullMcpObservabilityHandler",
  ]);
  requireExcludes(repoRoot, "skills/wp-abilities-api/references/mcp-exposure.md", [
    "discover and call every server-registered ability",
    "vendor/autoloader.php",
    "WP\\MCP\\Transport\\Http\\HttpTransport",
    "ErrorHandling\\Implementations",
    "Observability\\Implementations",
  ]);
  requireIncludes(repoRoot, "skills/wp-abilities-api/SKILL.md", [
    "MCP Adapter 0.5.0 requires PHP 7.4+",
    "upgrade the site runtime or stop before installing the adapter",
    "Read `references/mcp-exposure.md` before giving installation, bootstrap, or server code.",
    "composer require automattic/jetpack-autoloader",
    "vendor/autoload_packages.php",
  ]);
  requireIncludes(repoRoot, "eval/scenarios/abilities-mcp-expose.json", [
    "PHP 7.4+",
    "composer require automattic/jetpack-autoloader",
    "vendor/autoload_packages.php",
  ]);
  requireExcludes(repoRoot, "skills/wp-abilities-api/references/client-side.md", [
    "currentUserCan(",
    "core enqueues `@wordpress/core-abilities` on all admin pages",
  ]);
  requireIncludes(repoRoot, "skills/wp-abilities-api/references/client-side.md", [
    "wp_enqueue_script_module( '@wordpress/core-abilities' )",
    "data-can-manage-options",
  ]);

  requireIncludes(repoRoot, "skills/wp-ai-client/SKILL.md", [
    "is_wp_error( $result )",
    "get_error_message()",
    "PHP AI Client 1.3.1",
    "PHP AI Client 1.4.0",
  ]);
  requireExcludes(repoRoot, "skills/wp-ai-client/SKILL.md", [
    "Pull `getProviderMetadata()` off the result",
  ]);

  for (const file of [
    "skills/wp-ai-plugin/SKILL.md",
    "skills/wp-ai-plugin/references/dashboard-widgets.md",
    "skills/wp-ai-plugin/references/experiments-framework.md",
    "skills/wp-ai-plugin/references/hooks-and-filters.md",
  ]) {
    requireExcludes(repoRoot, file, ["v1.0.2", "'1.0.2'"]);
  }
  requireIncludes(repoRoot, "skills/wp-ai-plugin/references/experiments-framework.md", [
    "v1.2.0",
    "Type_Ahead",
    "Key_Encryption",
    "Suggest_Reply",
    "core/read-content",
    "core/read-users",
  ]);
  requireIncludes(repoRoot, "skills/wp-ai-plugin/references/hooks-and-filters.md", [
    "wpai_default_request_timeout",
    "wpai_settings_feature_groups",
    "wpai_settings_feature_metadata",
  ]);

  for (const file of [
    "skills/wp-block-development/SKILL.md",
    "skills/wp-block-development/references/block-json.md",
  ]) {
    requireIncludes(repoRoot, file, ["every block inserted", "API version 3"]);
    requireExcludes(repoRoot, file, ["regardless of block apiVersion", "always use the iframe"]);
  }
  requireIncludes(repoRoot, "skills/wp-block-themes/references/theme-json.md", [
    "## WordPress 7.0 additions",
    "settings.dimensions",
    "width",
    "height",
    "min-height",
    ":focus-visible",
  ]);
  requireExcludes(repoRoot, "skills/wp-block-themes/references/theme-json.md", [
    "**Button pseudo-classes:**",
    "Style Button block hover and focus states directly in theme.json.",
  ]);
  requireIncludes(repoRoot, "skills/wp-interactivity-api/SKILL.md", [
    "watch()",
    "unwatch()",
    "export function disposeNavigationAnalytics()",
    "Do not call it immediately after registering the watcher.",
    "state.url",
    "state.navigation.hasStarted",
    "state.navigation.hasFinished",
  ]);
  requireNoMatch(
    repoRoot,
    "skills/wp-interactivity-api/SKILL.md",
    IMMEDIATE_UNWATCH_PATTERN,
    "must not call unwatch immediately after watch registration"
  );
  requireNoMatch(
    repoRoot,
    "skills/wp-interactivity-api/SKILL.md",
    /state\.navigation\.(?:hasStarted|hasFinished)(?!`)/,
    "must mention deprecated navigation state only as code-formatted prose, never as a recommended direct read"
  );

  for (const file of [
    "skills/wp-plugin-directory-guidelines/SKILL.md",
    "skills/wp-plugin-directory-guidelines/references/gpl-compliance.md",
    "skills/wp-plugin-directory-guidelines/references/guideline-review-checklist.md",
  ]) {
    requireIncludes(repoRoot, file, ["License URI", "optional"]);
    requireExcludes(repoRoot, file, [
      "Missing `License:` or `License URI:`",
      "has a `License URI:` header",
    ]);
  }
  requireIncludes(repoRoot, "skills/wpds/SKILL.md", [
    "If the WPDS MCP server is unavailable",
    "developer.wordpress.org/block-editor/reference-guides/components",
    "@wordpress/components",
    "@wordpress/ui",
  ]);
  requireExcludes(repoRoot, "skills/wpds/SKILL.md", [
    "Requires WPDS MCP server configured and running",
    "DO NOT search the web",
  ]);
}
