import fs from "node:fs";
import path from "node:path";

const TOOL_HEADER = { name: "detect_compromise_signals", version: 1 };

const DEFAULT_IGNORES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
]);

const SUSPICIOUS_PHP_EXTS = new Set([
  ".php",
  ".phtml",
  ".phar",
  ".php3",
  ".php4",
  ".php5",
  ".php7",
  ".pht",
]);

const MALWARE_PATTERNS = [
  { name: "eval_gzinflate_base64",   regex: /eval\s*\(\s*gzinflate\s*\(\s*base64_decode/i },
  { name: "eval_base64_decode",      regex: /eval\s*\(\s*base64_decode/i },
  { name: "eval_request_param",      regex: /eval\s*\(\s*\$_(POST|GET|REQUEST|COOKIE|SERVER)/i },
  { name: "assert_request_param",    regex: /assert\s*\(\s*\$_(POST|GET|REQUEST|COOKIE)/i },
  { name: "exec_request_param",      regex: /(system|shell_exec|passthru|exec|popen|proc_open)\s*\(\s*\$_/i },
  { name: "preg_replace_e_modifier", regex: /preg_replace\s*\(\s*['"][^'"]*\/e['"]/i },
];

const KNOWN_MALWARE_FILENAMES = new Set([
  "wp-vcd.php",
  "wp-tmp.php",
  "wp-feed.php",
  "c99.php",
  "r57.php",
  "wso.php",
  "b374k.php",
]);

const WP_FLAVORED_DIR_BAIT = [
  /^wp-config-php$/,
  /^wp-content-update$/,
  /^wp-includes-update$/,
  /^wordpress-update$/,
  /^akismet-update$/,
];

function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function readFileSafe(p, maxBytes = 128 * 1024) {
  try {
    const buf = fs.readFileSync(p);
    return buf.byteLength > maxBytes ? buf.subarray(0, maxBytes).toString("utf8") : buf.toString("utf8");
  } catch {
    return null;
  }
}

// Walks rootDir breadth-first. Returns { files, truncated, depthCapped } so
// callers can distinguish "no matches" from "scan hit a cap" — important for
// a malware scanner where the second must NOT read as clean.
function findFilesRecursive(rootDir, predicate, { maxFiles = 6000, maxDepth = 12 } = {}) {
  const files = [];
  const queue = [{ dir: rootDir, depth: 0 }];
  let truncated = false;
  let depthCapped = false;

  outer:
  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    if (depth > maxDepth) { depthCapped = true; continue; }

    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }

    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (DEFAULT_IGNORES.has(ent.name)) continue;
        queue.push({ dir: fullPath, depth: depth + 1 });
      } else if (ent.isFile() && predicate(ent.name, fullPath)) {
        files.push(fullPath);
        if (files.length >= maxFiles) { truncated = true; break outer; }
      }
    }
  }

  return { files, truncated, depthCapped };
}

function detectWpRoot(repoRoot) {
  for (const sub of ["", "wordpress", "wp", "public", "public_html"]) {
    const candidate = sub ? path.join(repoRoot, sub) : repoRoot;
    if (statSafe(path.join(candidate, "wp-includes"))) return candidate;
  }
  return null;
}

function listDirSafe(dir, { onlyDirs = false } = {}) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return onlyDirs ? entries.filter((e) => e.isDirectory()) : entries;
  } catch {
    return [];
  }
}

function scanPhpInUploads(wpRoot) {
  const uploadsDir = path.join(wpRoot, "wp-content", "uploads");
  if (!statSafe(uploadsDir)) return { files: [], truncated: false, depthCapped: false };
  return findFilesRecursive(
    uploadsDir,
    (name) => SUSPICIOUS_PHP_EXTS.has(path.extname(name).toLowerCase()),
    { maxFiles: 500 }
  );
}

function scanMuPlugins(wpRoot) {
  const muDir = path.join(wpRoot, "wp-content", "mu-plugins");
  if (!statSafe(muDir)) return { exists: false, entries: [] };
  return { exists: true, entries: listDirSafe(muDir).map((e) => e.name) };
}

// Drop-ins live directly in wp-content/ (no wp-content/drop-ins/ subdirectory
// exists in stock WP). Reference: https://developer.wordpress.org/reference/functions/_get_dropins/
const KNOWN_DROP_INS = new Set([
  "advanced-cache.php",
  "db.php",
  "db-error.php",
  "install.php",
  "maintenance.php",
  "object-cache.php",
  "php-error.php",
  "fatal-error-handler.php",
  // Multisite-only
  "sunrise.php",
  "blog-deleted.php",
  "blog-inactive.php",
  "blog-suspended.php",
]);

function scanDropIns(wpRoot) {
  return {
    present: listDirSafe(path.join(wpRoot, "wp-content"))
      .map((e) => e.name)
      .filter((n) => KNOWN_DROP_INS.has(n)),
  };
}

function scanWpFlavoredBaitDirs(wpRoot) {
  const pluginsDir = path.join(wpRoot, "wp-content", "plugins");
  if (!statSafe(pluginsDir)) return [];
  return listDirSafe(pluginsDir, { onlyDirs: true })
    .filter((e) => WP_FLAVORED_DIR_BAIT.some((rx) => rx.test(e.name)))
    .map((e) => e.name);
}

function scanKnownMalwareFilenames(wpRoot) {
  return findFilesRecursive(
    wpRoot,
    (name) => KNOWN_MALWARE_FILENAMES.has(name.toLowerCase()),
    { maxFiles: 50 }
  );
}

function scanMalwarePatterns(wpRoot, { maxFilesScanned = 4000, maxFileBytes = 256 * 1024 } = {}) {
  const walk = findFilesRecursive(
    wpRoot,
    (name) => SUSPICIOUS_PHP_EXTS.has(path.extname(name).toLowerCase()),
    { maxFiles: maxFilesScanned }
  );

  const hits = [];
  let filesReadTruncated = 0;
  for (const file of walk.files) {
    const st = statSafe(file);
    if (st && st.size > maxFileBytes) filesReadTruncated += 1;
    const content = readFileSafe(file, maxFileBytes);
    if (!content) continue;
    for (const pattern of MALWARE_PATTERNS) {
      if (pattern.regex.test(content)) hits.push({ file, pattern: pattern.name });
    }
  }

  return {
    filesScanned: walk.files.length,
    hits,
    fileListTruncated: walk.truncated,
    depthCapped: walk.depthCapped,
    filesReadTruncated,  // count of files where only the first maxFileBytes were scanned
    maxFilesScanned,
    maxFileBytes,
  };
}

function scanRecentCoreModifications(wpRoot, days = 30) {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = [];
  for (const sub of ["wp-admin", "wp-includes"]) {
    const dir = path.join(wpRoot, sub);
    if (!statSafe(dir)) continue;
    const walk = findFilesRecursive(dir, (name) => name.endsWith(".php"), { maxFiles: 5000 });
    for (const f of walk.files) {
      const st = statSafe(f);
      if (st && st.mtimeMs > cutoffMs) recent.push({ file: f, mtime: new Date(st.mtimeMs).toISOString() });
    }
  }
  return recent;
}

// ---------------------------------------------------------------------------
// Vulnerability lookup (optional, only when --check-vulns is passed)
// ---------------------------------------------------------------------------
// Queries wpvulnerability.com (free, no API key). The service aggregates
// vulnerability data from WPScan, Patchstack, and WP.org sources.
// Swappable: replace VULN_API_BASE + flattenVulnRecords to use a different source.

const VULN_API_BASE = "https://www.wpvulnerability.com/api/v3";
const VULN_FETCH_TIMEOUT_MS = 5000;
const VULN_CONCURRENCY = 5;

function detectWpCoreVersion(wpRoot) {
  const content = readFileSafe(path.join(wpRoot, "wp-includes", "version.php"));
  const m = content?.match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

// Parses Plugin Name/Version OR Theme Name/Version from a header block.
// Plugin headers live in <slug>.php (PHP comment); theme headers in style.css (CSS comment).
function parseWpHeader(filePath, kind, maxBytes = 16 * 1024) {
  const content = readFileSafe(filePath, maxBytes);
  if (!content) return null;
  const nameRegex = new RegExp(String.raw`^[\s/*]*${kind} Name:\s*(.+)$`, "im");
  const nameMatch = content.match(nameRegex);
  if (!nameMatch) return null;
  const versionMatch = content.match(/^[\s/*]*Version:\s*(.+)$/im);
  return { name: nameMatch[1].trim(), version: versionMatch ? versionMatch[1].trim() : null };
}

function detectInstalledPlugins(wpRoot) {
  const pluginsDir = path.join(wpRoot, "wp-content", "plugins");
  if (!statSafe(pluginsDir)) return [];
  const plugins = [];
  for (const ent of listDirSafe(pluginsDir, { onlyDirs: true })) {
    const slug = ent.name;
    const pluginDir = path.join(pluginsDir, slug);
    // Try <slug>.php first (the common case), then any other .php at the dir root.
    const phpFiles = listDirSafe(pluginDir)
      .filter((e) => e.isFile && e.isFile() && e.name.endsWith(".php"))
      .map((e) => path.join(pluginDir, e.name))
      .sort((a) => (path.basename(a) === `${slug}.php` ? -1 : 1));
    for (const candidate of phpFiles) {
      const header = parseWpHeader(candidate, "Plugin");
      if (header) {
        plugins.push({ slug, name: header.name, version: header.version });
        break;
      }
    }
  }
  return plugins;
}

function detectInstalledThemes(wpRoot) {
  const themesDir = path.join(wpRoot, "wp-content", "themes");
  if (!statSafe(themesDir)) return [];
  const themes = [];
  for (const ent of listDirSafe(themesDir, { onlyDirs: true })) {
    const slug = ent.name;
    const header = parseWpHeader(path.join(themesDir, slug, "style.css"), "Theme", 8 * 1024);
    if (header) themes.push({ slug, name: header.name, version: header.version });
  }
  return themes;
}

async function fetchJsonWithTimeout(url, timeoutMs = VULN_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "wp-abuse-detect-script/1" } });
    if (!res.ok) return { error: `HTTP ${res.status}`, url };
    return { data: await res.json(), url };
  } catch (e) {
    return { error: String(e?.message || e), url };
  } finally {
    clearTimeout(t);
  }
}

// Returns negative / 0 / positive for a<b / a=b / a>b on dot-separated numeric versions.
// Pre-release suffixes (e.g. "1.2.3-beta") are treated as equal to the base "1.2.3" —
// fine for matching vuln-record version constraints, which use numeric thresholds.
function compareVersions(a, b) {
  const pa = String(a).split(/[.+-]/).map((p) => parseInt(p, 10));
  const pb = String(b).split(/[.+-]/).map((p) => parseInt(p, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = isNaN(pa[i]) ? 0 : pa[i];
    const y = isNaN(pb[i]) ? 0 : pb[i];
    if (x !== y) return x - y;
  }
  return 0;
}

const OPERATOR_PREDICATES = {
  "<=": (cmp) => cmp <= 0,
  "<":  (cmp) => cmp < 0,
  "=":  (cmp) => cmp === 0,
  ">=": (cmp) => cmp >= 0,
  ">":  (cmp) => cmp > 0,
};

function vulnAffectsInstalledVersion(vuln, installedVersion) {
  if (!installedVersion) return { affected: null, reason: "version_unknown" };
  // wpvulnerability.com vuln records vary in shape; check operator-style fields, fallback to "patched_in".
  const ops = vuln?.operator || vuln?.affected;
  if (Array.isArray(ops)) {
    for (const op of ops) {
      const predicate = OPERATOR_PREDICATES[op?.operator];
      if (!op?.version || !predicate) continue;
      if (predicate(compareVersions(installedVersion, op.version))) return { affected: true };
    }
    return { affected: false };
  }
  const patchedIn = vuln?.patched_in || vuln?.fixed_in;
  if (patchedIn) return { affected: compareVersions(installedVersion, patchedIn) < 0 };
  return { affected: null, reason: "no_version_constraints_in_record" };
}

function flattenVulnRecords(apiResult, installedVersion) {
  if (!apiResult?.data) return { error: apiResult?.error || null, vulns: [], unknown_match: [] };
  const candidates = apiResult.data?.vulnerabilities || apiResult.data?.vulns || [];
  const vulns = [];
  const unknown_match = [];
  for (const v of candidates) {
    const { affected, reason } = vulnAffectsInstalledVersion(v, installedVersion);
    if (affected === false) continue;
    const record = {
      id: v.id || v.cve || v.title?.slice(0, 40) || "unknown",
      title: v.title || v.summary || null,
      source: v.source || null,
      severity: v.severity || v.cvss?.severity || null,
      score: v.cvss?.score || null,
      patched_in: v.patched_in || v.fixed_in || null,
      url: v.source_url || v.url || null,
    };
    if (affected === true) vulns.push(record);
    else unknown_match.push({ ...record, match_uncertainty_reason: reason });
  }
  return { vulns, unknown_match, error: null };
}

async function runWithConcurrency(items, worker, concurrency = VULN_CONCURRENCY) {
  const results = [];
  let i = 0;
  const lanes = Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(lanes);
  return results;
}

async function lookupComponentVulns(kind /* "plugin" | "theme" */, comp) {
  const apiResult = await fetchJsonWithTimeout(`${VULN_API_BASE}/${kind}/${encodeURIComponent(comp.slug)}`);
  const { vulns, unknown_match, error } = flattenVulnRecords(apiResult, comp.version);
  return {
    slug: comp.slug,
    name: comp.name,
    installed_version: comp.version,
    vulnerabilities: vulns,
    vulnerabilities_uncertain_match: unknown_match,
    fetch_error: error || apiResult?.error || null,
  };
}

async function checkVulnerabilities(wpRoot) {
  const wpVersion = detectWpCoreVersion(wpRoot);
  const plugins = detectInstalledPlugins(wpRoot);
  const themes = detectInstalledThemes(wpRoot);

  const corePromise = wpVersion
    ? fetchJsonWithTimeout(`${VULN_API_BASE}/wordpress/${encodeURIComponent(wpVersion)}`)
    : Promise.resolve({ error: "wp version not detected" });

  const [pluginResults, themeResults, coreApi] = await Promise.all([
    runWithConcurrency(plugins, (p) => lookupComponentVulns("plugin", p)),
    runWithConcurrency(themes,  (t) => lookupComponentVulns("theme", t)),
    corePromise,
  ]);

  const core = wpVersion ? flattenVulnRecords(coreApi, wpVersion) : { vulns: [], unknown_match: [], error: null };
  const pluginsWithVulns = pluginResults.filter((p) => p.vulnerabilities.length > 0);
  const themesWithVulns = themeResults.filter((t) => t.vulnerabilities.length > 0);

  return {
    experimental: true,
    privacy_note: "This check sends a list of your installed plugin/theme slugs (not versions or contents) to wpvulnerability.com. On a compromised box that inventory may be sensitive — do not run --check-vulns from a network you don't want the request traffic associated with. Skip this flag if in doubt.",
    source: "wpvulnerability.com (aggregates WPScan, Patchstack, WP.org). Response shape varies — adapter is best-effort.",
    wp_core: {
      installed_version: wpVersion,
      vulnerabilities: core.vulns,
      vulnerabilities_uncertain_match: core.unknown_match,
      fetch_error: coreApi?.error || null,
    },
    plugins: { total_checked: pluginResults.length, with_vulnerabilities: pluginsWithVulns, clean: pluginResults.length - pluginsWithVulns.length },
    themes:  { total_checked: themeResults.length,  with_vulnerabilities: themesWithVulns,  clean: themeResults.length  - themesWithVulns.length  },
    severity: (core.vulns.length || pluginsWithVulns.length || themesWithVulns.length) > 0 ? "high" : "none",
    note: "Known vulnerabilities affecting installed versions. Patch immediately; if exploitation predates patching, this is the likely entry point. Records under 'vulnerabilities_uncertain_match' could not be confirmed as affecting your version — verify manually.",
  };
}

function buildSignals({ phpInUploads, muPlugins, dropIns, baitDirs, knownMalwareFiles, patternScan, recentCore }) {
  const truncationNote = (s) =>
    s.fileListTruncated || s.filesReadTruncated > 0 || s.depthCapped
      ? `SCAN TRUNCATED — file list capped at ${s.maxFilesScanned}, file bodies capped at ${s.maxFileBytes} bytes. A zero hit count does NOT mean clean. Run wp core verify-checksums + wp plugin verify-checksums --all and a full external scanner.`
      : "Heuristic regex match — investigate each file before deletion.";

  return {
    php_in_uploads: {
      count: phpInUploads.files.length,
      files: phpInUploads.files.slice(0, 50),
      severity: phpInUploads.files.length > 0 ? "high" : "none",
      truncated: phpInUploads.truncated,
      note: "PHP files inside wp-content/uploads/ are never legitimate.",
    },
    mu_plugins: {
      exists: muPlugins.exists,
      entries: muPlugins.entries,
      severity: muPlugins.exists && muPlugins.entries.length > 0 ? "review" : "none",
      note: "Auto-loaded; commonly missed during cleanup. Review every entry.",
    },
    drop_ins: {
      present_in_wp_content: dropIns.present,
      severity: dropIns.present.length > 0 ? "review" : "none",
      note: "Drop-ins (object-cache.php, advanced-cache.php, db.php, etc.) auto-load from wp-content/. Verify each is legitimate (caching plugin, hosting provider, etc.).",
    },
    wp_flavored_bait_directories: {
      directories: baitDirs,
      severity: baitDirs.length > 0 ? "high" : "none",
      note: "Plugin directories with WP-mimicking names are a known compromise pattern.",
    },
    known_malware_filenames: {
      files: knownMalwareFiles.files,
      severity: knownMalwareFiles.files.length > 0 ? "high" : "none",
      truncated: knownMalwareFiles.truncated,
      note: "Known web shell / malware-family file names.",
    },
    malware_pattern_hits: {
      files_scanned: patternScan.filesScanned,
      hits: patternScan.hits.slice(0, 200),
      hit_count: patternScan.hits.length,
      severity: patternScan.hits.length > 0 ? "high" : "none",
      file_list_truncated: patternScan.fileListTruncated,
      files_read_truncated: patternScan.filesReadTruncated,
      depth_capped: patternScan.depthCapped,
      note: truncationNote(patternScan),
    },
    recent_core_modifications: {
      days_window: 30,
      files: recentCore.slice(0, 50),
      count: recentCore.length,
      severity: recentCore.length > 0 ? "review" : "none",
      note: "Recent mtime in wp-admin/wp-includes can mean either (a) a legitimate WP core update or (b) tampering. Mtimes reflect extraction/download time, not release date. Use wp core verify-checksums to distinguish — only checksum mismatches are evidence of tampering.",
    },
  };
}

function summarize(signals) {
  const anyHigh = Object.values(signals).some((s) => s.severity === "high");
  const anyReview = Object.values(signals).some((s) => s.severity === "review");
  const pat = signals.malware_pattern_hits;
  const scanTruncated = Boolean(pat.file_list_truncated || pat.files_read_truncated > 0 || pat.depth_capped
    || signals.php_in_uploads.truncated || signals.known_malware_filenames.truncated);

  let overall_severity, recommended_next_step;
  if (anyHigh) {
    overall_severity = "high";
    recommended_next_step = "Multiple high-confidence indicators present. Proceed with full investigation per skill step 3 — but DO NOT skip the manual checks: this scan covers a subset of compromise patterns, not all.";
  } else if (anyReview || scanTruncated) {
    overall_severity = "review";
    recommended_next_step = scanTruncated
      ? "Scan was TRUNCATED (large site exceeded scan caps). A zero hit count is NOT evidence of clean. Run wp core verify-checksums, wp plugin verify-checksums --all, and a full external scanner (Sucuri, Wordfence, MalCare) before declaring clean."
      : "Manually inspect 'review' signals before declaring clean.";
  } else {
    overall_severity = "none";
    recommended_next_step = "No high-confidence indicators in this scan. Compromise still possible via paths this scan does not cover (cloaked SEO spam, DB-only injections, host-level, files past size cap). Consider an external scanner.";
  }

  return { overall_severity, scan_truncated: scanTruncated, recommended_next_step };
}

async function main() {
  const checkVulns = process.argv.slice(2).includes("--check-vulns");
  const repoRoot = process.cwd();
  const wpRoot = detectWpRoot(repoRoot);

  if (!wpRoot) {
    process.stdout.write(JSON.stringify({
      tool: TOOL_HEADER,
      project: { wpRootFound: false, repoRoot },
      message: "No WordPress install detected (no wp-includes/ found). Run skills/wp-project-triage/scripts/detect_wp_project.mjs first.",
    }, null, 2) + "\n");
    return;
  }

  const signals = buildSignals({
    phpInUploads:       scanPhpInUploads(wpRoot),
    muPlugins:          scanMuPlugins(wpRoot),
    dropIns:            scanDropIns(wpRoot),
    baitDirs:           scanWpFlavoredBaitDirs(wpRoot),
    knownMalwareFiles:  scanKnownMalwareFilenames(wpRoot),
    patternScan:        scanMalwarePatterns(wpRoot),
    recentCore:         scanRecentCoreModifications(wpRoot),
  });
  if (checkVulns) signals.known_vulnerabilities = await checkVulnerabilities(wpRoot);

  process.stdout.write(JSON.stringify({
    tool: TOOL_HEADER,
    project: { wpRoot, repoRoot },
    signals,
    summary: summarize(signals),
  }, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(`detect_compromise_signals failed: ${err?.stack || err}\n`);
  process.exit(1);
});
