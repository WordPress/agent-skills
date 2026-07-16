import fs from "node:fs";
import path from "node:path";

const SOURCES = {
  wordpressCoreVersionCheck: "https://api.wordpress.org/core/version-check/1.7/",
  gutenbergReleases: "https://api.github.com/repos/WordPress/gutenberg/releases?per_page=50",
  aiPluginReleases: "https://api.github.com/repos/WordPress/ai/releases?per_page=30",
  wpGutenbergMapDoc:
    "https://developer.wordpress.org/block-editor/contributors/versions-in-wordpress/",
};

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "wp-agent-skills-upstream-sync/0.1",
      accept: "text/html,application/json",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got non-JSON response`);
  }
}

function parseWpGutenbergMapFromHtml(html) {
  // Best-effort HTML table parsing without dependencies:
  // 1) find the first <table> that contains "WordPress Version" and "Gutenberg Versions"
  // 2) extract rows, then extract cells
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  const target = tables.find((t) => /WordPress\s*Version/i.test(t) && /Gutenberg\s*Versions/i.test(t));
  if (!target) return { rows: [], note: "table-not-found" };

  const rowHtml = [...target.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  const rows = [];

  for (const r of rowHtml) {
    const cellHtml = [...r.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
    if (cellHtml.length < 2) continue;

    const cells = cellHtml.map((c) => decodeHtml(stripTags(c)));
    const wp = cells[0];
    const gb = cells[1];

    if (/WordPress\s*Version/i.test(wp) || /Gutenberg\s*Versions/i.test(gb)) continue;
    if (!/^\d+\.\d+/.test(wp)) continue;

    rows.push({ wordpress: wp, gutenberg: gb });
  }

  return { rows, note: null };
}

function normalizeWpVersionCheckPayload(payload) {
  // https://api.wordpress.org/core/version-check/1.7/ returns something like:
  // { offers: [...], translations: [...] }
  const offers = Array.isArray(payload?.offers) ? payload.offers : [];

  const candidates = offers
    .map((o) => ({
      version: typeof o?.version === "string" ? o.version : null,
      current: typeof o?.current === "string" ? o.current : null,
      download: typeof o?.download === "string" ? o.download : null,
      phpVersion: typeof o?.php_version === "string" ? o.php_version : null,
      mysqlVersion: typeof o?.mysql_version === "string" ? o.mysql_version : null,
      response: typeof o?.response === "string" ? o.response : null,
      locale: typeof o?.locale === "string" ? o.locale : null,
    }))
    .filter((o) => o.version || o.current);

  // Keep a small, stable subset; prioritize "upgrade" offers.
  const byVersion = new Map();
  for (const o of candidates) {
    const v = o.version ?? o.current;
    if (!v) continue;
    if (!byVersion.has(v)) byVersion.set(v, o);
  }

  const versions = [...byVersion.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return {
    latest: versions[0] ?? null,
    recent: versions.slice(0, 20),
    offers: versions.slice(0, 20).map((v) => byVersion.get(v)),
  };
}

function normalizeGutenbergReleases(payload) {
  const releases = Array.isArray(payload) ? payload : [];
  const stable = releases
    .filter((r) => r && !r.draft && !r.prerelease && typeof r.tag_name === "string")
    .map((r) => ({
      tag: r.tag_name,
      name: typeof r.name === "string" ? r.name : null,
      publishedAt: typeof r.published_at === "string" ? r.published_at : null,
      url: typeof r.html_url === "string" ? r.html_url : null,
    }));
  return {
    latest: stable[0] ?? null,
    recent: stable.slice(0, 30),
  };
}

async function main() {
  const repoRoot = process.cwd();
  const outDir = path.join(repoRoot, "shared", "references");

  const [wpVersionPayload, gbReleasesPayload, aiReleasesPayload, mapHtml] = await Promise.all([
    fetchJson(SOURCES.wordpressCoreVersionCheck),
    fetchJson(SOURCES.gutenbergReleases),
    fetchJson(SOURCES.aiPluginReleases),
    fetchText(SOURCES.wpGutenbergMapDoc),
  ]);

  const wordpress = normalizeWpVersionCheckPayload(wpVersionPayload);
  const gutenberg = normalizeGutenbergReleases(gbReleasesPayload);
  const aiPlugin = normalizeGutenbergReleases(aiReleasesPayload); // Same GitHub Releases shape.
  const map = parseWpGutenbergMapFromHtml(mapHtml);

  writeJson(path.join(outDir, "wordpress-core-versions.json"), {
    source: SOURCES.wordpressCoreVersionCheck,
    ...wordpress,
  });

  writeJson(path.join(outDir, "gutenberg-releases.json"), {
    source: SOURCES.gutenbergReleases,
    ...gutenberg,
  });

  writeJson(path.join(outDir, "ai-plugin-releases.json"), {
    source: SOURCES.aiPluginReleases,
    ...aiPlugin,
  });

  writeJson(path.join(outDir, "wp-gutenberg-version-map.json"), {
    source: SOURCES.wpGutenbergMapDoc,
    note: map.note,
    rows: map.rows,
  });

  process.stdout.write("OK: updated shared/references/* upstream indices\n");
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || String(err)}\n`);
  process.exit(1);
});
