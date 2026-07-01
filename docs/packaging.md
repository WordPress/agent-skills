# Packaging and installation

This repo is the **source of truth** under `skills/`.

## Claude Code plugin marketplace

This repo doubles as a [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces): `.claude-plugin/marketplace.json` catalogs a single `wordpress-skills` plugin whose `source` is the repo root (`./`), and `.claude-plugin/plugin.json` is that plugin's manifest.

Because Claude Code's default plugin layout (`skills/<name>/SKILL.md`) already matches this repo's structure exactly, **no build step and no file duplication is required** — both manifests just point at the existing `skills/` directory. New skills scaffolded under `skills/` are picked up automatically; the manifests don't need to be updated when a skill is added, renamed, or removed.

Users install with:

```
/plugin marketplace add henryperkins/agent-skills
/plugin install wordpress-skills@wordpress-skills
```

Validate the manifests after editing them:

```bash
claude plugin validate . --strict
claude plugin validate .claude-plugin/plugin.json --strict
```

To distribute skills to other repos/tools (without symlinks), use the skillpack scripts.

## Build dist

Build a packaged copy under `dist/`:

- `node shared/scripts/skillpack-build.mjs --clean`

Outputs:

- `dist/codex/.codex/skills/*` (OpenAI Codex repo layout)
- `dist/vscode/.github/skills/*` (VS Code / Copilot repo layout)
- `dist/claude/.claude/skills/*` (Claude Code repo layout)
- `dist/cursor/.cursor/skills/*` (Cursor repo layout)

## Install into another repo

1. Build dist (above).
2. Install into a destination repo:

- `node shared/scripts/skillpack-install.mjs --dest=../some-repo --targets=codex,vscode,claude,cursor`

By default, install mode is `replace` (it replaces only the skill directories it installs).

