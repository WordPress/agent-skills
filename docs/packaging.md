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
- `dist/gemini/.gemini/*` (Gemini CLI extension layout)

## Install into another repo

1. Build dist (above).
2. Install into a destination repo:

- `node shared/scripts/skillpack-install.mjs --dest=../some-repo --targets=codex,vscode,claude,cursor,gemini`

By default, install mode is `replace` (it replaces only the skill directories it installs).

## Gemini CLI Extension

To use these skills with [Gemini CLI](https://github.com/google/gemini-cli), the build process generates a modular extension with individual skills located in the `skills/` directory. This allows Gemini CLI to load only the necessary skills on demand, optimizing context usage.

### Build and Install

1. **Build the package**:
   ```bash
   node shared/scripts/skillpack-build.mjs --targets=gemini
   ```

2. **Install via Gemini CLI (Recommended)**:
   The native CLI command is the safest method. It handles security trust prompts, registers the extension properly, and enables on-demand skill activation.
   ```bash
   gemini extension install ./dist/gemini/.gemini
   ```

3. **Install via script (Alternative)**:
   For headless environments or automated setups, you can install the extension globally to `~/.gemini/extensions/wordpress-agent-skills/`:
   ```bash
   node shared/scripts/skillpack-install.mjs --targets=gemini-global
   ```

### Managing the Extension
To update the extension, you must uninstall it first. Always use the registered extension name (found in `gemini-extension.json`), not the file path:
```bash
gemini extension uninstall wordpress-agent-skills
```
