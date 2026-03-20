#!/usr/bin/env bash
# Validate that a single scenario file follows the expected format.
# Usage: bash eval/harness/check-scenario-format.sh <file.md>

set -euo pipefail

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "ERROR: File not found: $FILE"
    exit 1
fi

echo "Checking: $FILE"
errors=0

# Must have Skill: header
if ! grep -q "^Skill:" "$FILE"; then
    echo "  MISSING: 'Skill:' header line"
    errors=$((errors + 1))
fi

# Must have at least one Given/When/Then block
if ! grep -q "^\*\*Given\*\*" "$FILE"; then
    echo "  MISSING: '**Given**' line"
    errors=$((errors + 1))
fi
if ! grep -q "^\*\*When\*\*" "$FILE"; then
    echo "  MISSING: '**When**' line"
    errors=$((errors + 1))
fi
if ! grep -q "^\*\*Then\*\*" "$FILE"; then
    echo "  MISSING: '**Then**' line"
    errors=$((errors + 1))
fi

# Must have examples
if ! grep -q "^Pass:" "$FILE"; then
    echo "  MISSING: 'Pass:' example"
    errors=$((errors + 1))
fi
if ! grep -q "^Fail:" "$FILE"; then
    echo "  MISSING: 'Fail:' example"
    errors=$((errors + 1))
fi

# Check code fence pairing (odd count = corrupted)
fence_count=$(grep -c '```' "$FILE" || true)
if [ $((fence_count % 2)) -ne 0 ]; then
    echo "  WARNING: Odd number of code fences ($fence_count) — possible corruption"
    errors=$((errors + 1))
fi

if [ "$errors" -eq 0 ]; then
    echo "  OK"
else
    echo "  $errors issue(s) found"
    exit 1
fi
