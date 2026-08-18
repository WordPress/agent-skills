import fs from "node:fs";
import path from "node:path";

function existsSafe(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readFileSafe(p, maxBytes = 256 * 1024) {
  try {
    const buf = fs.readFileSync(p);
    if (buf.byteLength > maxBytes) return buf.subarray(0, maxBytes).toString("utf8");
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function detectComposerVipSignal(repoRoot) {
  const composerPath = path.join(repoRoot, "composer.json");
  const txt = readFileSafe(composerPath);
  if (!txt) return null;

  let json;
  try {
    json = JSON.parse(txt);
  } catch {
    return null;
  }

  const requireBlocks = [json.require || {}, json["require-dev"] || {}];
  const vipPackages = [];
  for (const block of requireBlocks) {
    for (const name of Object.keys(block)) {
      if (name.startsWith("wpcomvip/") || name.startsWith("automattic/vip-go-")) {
        vipPackages.push(name);
      }
    }
  }
  return vipPackages.length > 0 ? vipPackages : null;
}

function detectGitRemoteSignal(repoRoot) {
  const gitConfigPath = path.join(repoRoot, ".git", "config");
  const txt = readFileSafe(gitConfigPath);
  if (!txt) return null;
  return /wpcomvip\//i.test(txt);
}

function main() {
  const repoRoot = process.cwd();

  const signals = {
    vipConfigDir: existsSafe(path.join(repoRoot, "vip-config")),
    vipConfigFile: existsSafe(path.join(repoRoot, "vip-config", "vip-config.php")),
    clientMuPlugins: existsSafe(path.join(repoRoot, "client-mu-plugins")),
    vipIgnoreFile: existsSafe(path.join(repoRoot, ".vipignore")),
    vipGoCiConfig: existsSafe(path.join(repoRoot, "vip-go-ci-config")),
    composerVipPackages: detectComposerVipSignal(repoRoot),
    gitRemoteWpcomvip: detectGitRemoteSignal(repoRoot),
  };

  const positiveSignals = Object.entries(signals).filter(([, v]) => Boolean(v)).map(([k]) => k);

  const report = {
    tool: { name: "detect_vip_project", version: "0.1.0" },
    repoRoot,
    isLikelyVip: positiveSignals.length > 0,
    signals,
    positiveSignals,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
