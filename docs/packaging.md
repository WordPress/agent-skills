# Packaging and installation

This repo is the **source of truth** under `skills/`.

To distribute skills to other repos/tools (without symlinks), use the skillpack scripts.

## Build dist

Build a packaged copy under `dist/`:

- `node shared/scripts/skillpack-build.mjs --clean`

Outputs:

- `dist/codex/.codex/skills/*` (OpenAI Codex repo layout)
- `dist/vscode/.github/skills/*` (VS Code / Copilot repo layout)
- `dist/claude/.claude/skills/*` (Claude Code repo layout)
- `dist/cursor/.cursor/skills/*` (Cursor repo layout)

Antigravity is opt-in. Add `--targets=codex,vscode,claude,cursor,antigravity` to also build:

- `dist/antigravity/.agents/skills/*` (Antigravity repo layout)

## Install into another repo

1. Build dist (above).
2. Install into a destination repo:

- `node shared/scripts/skillpack-install.mjs --dest=../some-repo --targets=codex,vscode,claude,cursor`

To include Antigravity, build it first and include it in the install targets:

- `node shared/scripts/skillpack-build.mjs --clean --targets=codex,vscode,claude,cursor,antigravity`
- `node shared/scripts/skillpack-install.mjs --dest=../some-repo --targets=codex,vscode,claude,cursor,antigravity`

By default, install mode is `replace` (it replaces only the skill directories it installs).
