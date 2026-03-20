#!/usr/bin/env bash
# Build distribution packages for each editor from source skills.
# Usage: bash shared/scripts/build-dist.sh
#
# Reads skills/ and packages them into dist/ for:
#   - Claude Code (.claude/skills/)
#   - OpenAI Codex (.codex/)
#   - Cursor (.cursor/)
#   - VS Code / Copilot (.github/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$ROOT_DIR/skills"
DIST_DIR="$ROOT_DIR/dist"

echo "=== Building skill distributions ==="
echo "Source: $SKILLS_DIR"
echo "Output: $DIST_DIR"
echo ""

# Clean dist
rm -rf "$DIST_DIR/claude/.claude/skills/"*
rm -rf "$DIST_DIR/codex/.codex/"*
rm -rf "$DIST_DIR/cursor/.cursor/"*
rm -rf "$DIST_DIR/vscode/.github/"copilot-instructions-skills.md

# --- Claude Code ---
# Claude Code reads SKILL.md files directly. Package each skill as a directory.
echo "Building: Claude Code (.claude/skills/)"
for skill_dir in "$SKILLS_DIR"/*/; do
    skill_name=$(basename "$skill_dir")
    if [ -f "$skill_dir/SKILL.md" ]; then
        mkdir -p "$DIST_DIR/claude/.claude/skills/$skill_name"
        cp "$skill_dir/SKILL.md" "$DIST_DIR/claude/.claude/skills/$skill_name/SKILL.md"
        echo "  + $skill_name"
    fi
done

# --- OpenAI Codex ---
# Codex uses YAML agent configs pointing to SKILL.md content as system prompt.
echo ""
echo "Building: OpenAI Codex (.codex/)"
for skill_dir in "$SKILLS_DIR"/*/; do
    skill_name=$(basename "$skill_dir")
    if [ -f "$skill_dir/agents/openai.yaml" ]; then
        mkdir -p "$DIST_DIR/codex/.codex/agents"
        cp "$skill_dir/agents/openai.yaml" "$DIST_DIR/codex/.codex/agents/$skill_name.yaml"
        echo "  + $skill_name (agent config)"
    fi
    if [ -f "$skill_dir/SKILL.md" ]; then
        mkdir -p "$DIST_DIR/codex/.codex/skills"
        cp "$skill_dir/SKILL.md" "$DIST_DIR/codex/.codex/skills/$skill_name.md"
        echo "  + $skill_name (skill content)"
    fi
done

# --- Cursor ---
# Cursor uses .cursor/rules/ directory with markdown files.
echo ""
echo "Building: Cursor (.cursor/)"
mkdir -p "$DIST_DIR/cursor/.cursor/rules"
for skill_dir in "$SKILLS_DIR"/*/; do
    skill_name=$(basename "$skill_dir")
    if [ -f "$skill_dir/SKILL.md" ]; then
        cp "$skill_dir/SKILL.md" "$DIST_DIR/cursor/.cursor/rules/$skill_name.md"
        echo "  + $skill_name"
    fi
done

# --- VS Code / GitHub Copilot ---
# Copilot reads a single .github/copilot-instructions.md file.
# Concatenate all skills into one instructions file.
echo ""
echo "Building: VS Code / Copilot (.github/)"
COPILOT_FILE="$DIST_DIR/vscode/.github/copilot-instructions-skills.md"
mkdir -p "$DIST_DIR/vscode/.github"
echo "# WordPress Agent Skills (Auto-generated)" > "$COPILOT_FILE"
echo "" >> "$COPILOT_FILE"
echo "This file is generated from agent-skills/skills/. Do not edit directly." >> "$COPILOT_FILE"
echo "" >> "$COPILOT_FILE"

for skill_dir in "$SKILLS_DIR"/*/; do
    skill_name=$(basename "$skill_dir")
    if [ -f "$skill_dir/SKILL.md" ]; then
        echo "---" >> "$COPILOT_FILE"
        echo "" >> "$COPILOT_FILE"
        cat "$skill_dir/SKILL.md" >> "$COPILOT_FILE"
        echo "" >> "$COPILOT_FILE"
        echo "  + $skill_name"
    fi
done

echo ""
echo "=== Distribution build complete ==="
skill_count=$(find "$SKILLS_DIR" -name "SKILL.md" | wc -l | tr -d ' ')
echo "Skills packaged: $skill_count"
