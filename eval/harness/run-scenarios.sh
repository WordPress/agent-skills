#!/usr/bin/env bash
# Eval harness: validate scenario files and report coverage.
# Usage: bash eval/harness/run-scenarios.sh [scenario-dir]
# Default: eval/scenarios/

set -euo pipefail

SCENARIO_DIR="${1:-eval/scenarios}"
ERRORS=0
TOTAL=0
PASS=0

echo "=== Agent Skills Eval Harness ==="
echo "Scanning: $SCENARIO_DIR"
echo ""

# Find all scenario markdown files (exclude README, test-runs)
while IFS= read -r file; do
    TOTAL=$((TOTAL + 1))
    filename=$(basename "$file")
    skill_dir=$(basename "$(dirname "$file")")
    errors_in_file=0

    # Check: file has "Skill:" header
    if ! grep -q "^Skill:" "$file"; then
        echo "FAIL: $skill_dir/$filename — missing 'Skill:' header"
        errors_in_file=$((errors_in_file + 1))
    fi

    # Check: file has Given/When/Then
    if ! grep -q "^\*\*Given\*\*" "$file"; then
        echo "FAIL: $skill_dir/$filename — missing Given/When/Then block"
        errors_in_file=$((errors_in_file + 1))
    fi

    # Check: file has Pass example
    if ! grep -q "^Pass:" "$file"; then
        echo "FAIL: $skill_dir/$filename — missing Pass example"
        errors_in_file=$((errors_in_file + 1))
    fi

    # Check: file has Fail example
    if ! grep -q "^Fail:" "$file"; then
        echo "FAIL: $skill_dir/$filename — missing Fail example"
        errors_in_file=$((errors_in_file + 1))
    fi

    if [ "$errors_in_file" -eq 0 ]; then
        PASS=$((PASS + 1))
    else
        ERRORS=$((ERRORS + errors_in_file))
    fi
done < <(find "$SCENARIO_DIR" -name "*.md" -not -name "README.md" -not -path "*/test-runs/*" | sort)

echo ""
echo "=== Results ==="
echo "Scenarios: $TOTAL"
echo "Valid:     $PASS"
echo "Errors:    $ERRORS"

if [ "$ERRORS" -gt 0 ]; then
    exit 1
fi
echo "All scenarios valid."
