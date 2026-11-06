import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const sourceSkills = path.join(repoRoot, "skills");
const affectedSkills = [
  "wordpress-router", "wp-project-triage", "wp-block-development", "wp-block-themes",
  "wp-patterns", "wp-performance", "wp-phpstan", "wp-plugin-development",
  "wp-rest-api", "wp-wpcli-and-ops",
];
const projectLayouts = {
  codex: [".codex", "skills"],
  vscode: [".github", "skills"],
  claude: [".claude", "skills"],
  cursor: [".cursor", "skills"],
  antigravity: [".agents", "skills"],
};
const globalLayouts = {
  claude: [".claude", "skills"],
  cursor: [".cursor", "skills"],
  antigravity: [".gemini", "antigravity", "skills"],
};
let temporaryRoot;
let projectRoot;
let buildRoot;

function runNode(args, cwd = repoRoot, env = process.env) {
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: "utf8", timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${args.join(" ")}\n${result.stderr || result.stdout}`);
  return result.stdout;
}

function skillDirectories(root) {
  return Object.fromEntries(fs.readdirSync(root).map((name) => [name, path.join(root, name)]));
}

// Read the actual instructions, substituting only the documented path placeholders.
function runInstructions(directories, cwd) {
  for (const name of affectedSkills) {
    const markdown = fs.readFileSync(path.join(directories[name], "SKILL.md"), "utf8");
    const commands = [...markdown.matchAll(/`node (?!`)([^`\r\n]+)`/g)];
    assert.ok(commands.length > 0, `No helper command found in ${name}`);
    for (const [, command] of commands) {
      const match = command.match(/^(?:"([^"]+)"|(\S+))(.*)$/);
      assert.ok(match, `Cannot parse helper command in ${name}: ${command}`);
      const script = (match[1] || match[2]).replace(/<([a-z0-9-]+)-dir>/g, (_, skill) => {
        assert.ok(directories[skill], `Unknown skill directory: ${skill}`);
        return directories[skill];
      });
      const args = match[3].replace(/\[--url=(?:"<url>"|<url>)\]/, "").trim().split(/\s+/).filter(Boolean)
        .map((arg) => arg.replaceAll('"', "").replace("<path>", cwd));
      // Never probe a developer's live WordPress installation via an ambient wp binary.
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"));
      const report = JSON.parse(runNode([script, ...args], cwd, { ...env, PATH: "" }));
      assert.equal(report.tool.name, path.basename(script, ".mjs"));
      if (report.tool.name === "detect_wp_project") {
        assert.equal(report.signals.paths.repoRoot, cwd);
        assert.equal(report.signals.detectedPluginName, "Skill path fixture");
        assert.equal(report.project.primary, "wp-block-plugin");
      } else if (report.repoRoot) {
        assert.equal(report.repoRoot, cwd);
        if (report.tool.name === "detect_plugins") {
          assert.ok(report.plugins.some((plugin) => plugin.name === "Skill path fixture"));
        } else if (report.tool.name === "list_blocks") {
          assert.ok(report.blocks.some((block) => block.name === "fixture/example"));
        } else if (report.tool.name === "detect_block_themes") {
          assert.ok(report.themes.some((theme) => theme.isBlockTheme));
        }
      } else {
        assert.equal(report.target?.path ?? report.wordpress?.path, cwd);
        assert.equal(report.wpCli.available, false);
      }
    }
  }
}

function instructionFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? instructionFiles(file) : /\.(md|json)$/.test(entry.name) ? [file] : [];
  });
}

before(() => {
  // macOS temp roots can be symlinks; process.cwd() reports their physical path.
  temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "wp skill paths ")));
  projectRoot = path.join(temporaryRoot, "deep", "nested", "WordPress plugin");
  buildRoot = path.join(temporaryRoot, "built skillpacks");
  fs.mkdirSync(path.join(projectRoot, "src"), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, "example-theme", "templates"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "plugin.php"), "<?php\n/**\n * Plugin Name: Skill path fixture\n */\n");
  fs.writeFileSync(path.join(projectRoot, "src", "block.json"), JSON.stringify({ name: "fixture/example", apiVersion: 3 }));
  fs.writeFileSync(path.join(projectRoot, "example-theme", "theme.json"), '{"version":3}');
  runNode(["shared/scripts/skillpack-build.mjs", "--clean", `--out=${buildRoot}`,
    `--targets=${Object.keys(projectLayouts).join(",")}`]);
});

after(() => {
  if (temporaryRoot) fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

test("skill instructions and eval scenarios do not use checkout-relative helper/resource paths", () => {
  const files = [...instructionFiles(sourceSkills), ...instructionFiles(path.join(repoRoot, "eval", "scenarios"))];
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /\bnode\s+["']?(?:\.\/)?skills\/|\bskills\/[a-z0-9-]+\/references\//,
      path.relative(repoRoot, file));
  }
  for (const name of affectedSkills) {
    const markdown = fs.readFileSync(path.join(sourceSkills, name, "SKILL.md"), "utf8");
    for (const [, command] of markdown.matchAll(/`node ([^`\r\n]+)`/g)) {
      assert.match(command, /^"<[a-z0-9-]+-dir>\/scripts\/[^"<>]+\.mjs"(?:\s|$)/,
        `Helper paths must be quoted, explicitly resolved skill directories: ${name}`);
      if (command.includes("--path=")) assert.ok(command.includes('--path="<path>"'), name);
    }
  }
});

test("schema and router references resolve relative to their own SKILL.md", () => {
  for (const [name, reference] of [
    ["wp-project-triage", "references/triage.schema.json"],
    ["wordpress-router", "references/decision-tree.md"],
  ]) {
    const directory = path.join(sourceSkills, name);
    assert.ok(fs.readFileSync(path.join(directory, "SKILL.md"), "utf8").includes(`\`${reference}\``));
    assert.ok(fs.existsSync(path.join(directory, reference)));
  }
});

test("original checkout-relative detector still runs from the source repo", () => {
  const report = JSON.parse(runNode(["skills/wp-project-triage/scripts/detect_wp_project.mjs"]));
  assert.equal(report.signals.paths.repoRoot, repoRoot.replace(/[\\/]$/, ""));
});

test("the legacy command reproduces MODULE_NOT_FOUND in an unrelated project", () => {
  assert.equal(fs.existsSync(path.join(projectRoot, "skills")), false);
  const result = spawnSync(process.execPath, ["skills/wp-project-triage/scripts/detect_wp_project.mjs"], {
    cwd: projectRoot, encoding: "utf8", timeout: 30000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /MODULE_NOT_FOUND/);
});

test("source skill instructions run from an unrelated project", () => {
  runInstructions(skillDirectories(sourceSkills), projectRoot);
});

for (const [target, layout] of Object.entries(projectLayouts)) {
  test(`${target} project installation preserves the target project cwd`, () => {
    runNode(["shared/scripts/skillpack-install.mjs", `--from=${buildRoot}`, `--dest=${projectRoot}`, `--targets=${target}`]);
    runInstructions(skillDirectories(path.join(projectRoot, ...layout)), projectRoot);
  });
}

for (const [target, layout] of Object.entries(globalLayouts)) {
  test(`${target} global installation preserves the target project cwd`, () => {
    const isolatedHome = path.join(temporaryRoot, `${target} home`);
    fs.mkdirSync(isolatedHome, { recursive: true });
    // Override the child's home only; never write to the actual user's skill directories.
    const env = { ...process.env, HOME: isolatedHome, USERPROFILE: isolatedHome };
    const args = target === "claude" ? ["--global"] : [`--targets=${target}-global`];
    runNode(["shared/scripts/skillpack-install.mjs", `--from=${buildRoot}`, ...args], repoRoot, env);
    runInstructions(skillDirectories(path.join(isolatedHome, ...layout)), projectRoot);
  });
}

test("instructions remain valid after relocating a skillpack", () => {
  const relocated = path.join(temporaryRoot, "relocated skills");
  fs.renameSync(path.join(temporaryRoot, "claude home", ".claude", "skills"), relocated);
  runInstructions(skillDirectories(relocated), projectRoot);
});

test("quoted installed script paths work through the host shell", () => {
  const directory = path.join(projectRoot, ...projectLayouts.cursor, "wp-project-triage");
  const markdown = fs.readFileSync(path.join(directory, "SKILL.md"), "utf8");
  const command = markdown.match(/`(node [^`]+)`/)[1]
    .replace("node ", `"${process.execPath}" `).replace("<wp-project-triage-dir>", directory);
  const result = spawnSync(command, { cwd: projectRoot, shell: true, encoding: "utf8", timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).signals.paths.repoRoot, projectRoot);
});

test("cross-skill helpers can be resolved from different installation roots", () => {
  const directories = skillDirectories(path.join(projectRoot, ...projectLayouts.codex));
  directories["wp-project-triage"] = path.join(temporaryRoot, "cursor home", ".cursor", "skills", "wp-project-triage");
  directories["wp-block-themes"] = path.join(temporaryRoot, "antigravity home", ".gemini", "antigravity", "skills", "wp-block-themes");
  runInstructions(directories, projectRoot);
});
