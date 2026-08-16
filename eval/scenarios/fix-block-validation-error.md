# Scenario: Fix Block Validation Error using Chrome DevTools

## Prompt
"I am getting a 'block contains unexpected or invalid content' error on my WordPress post editor. Please connect to my browser, find the broken block, and fix the markup."

## What the AI should do
1. **Connect and Navigate:** The AI should prioritize using the Chrome DevTools MCP tools (`list_pages` and `navigate_page`) to connect to the active editor tab. If `list_pages` returns only `about:blank`, the AI must stop and explicitly ask the user to open the target page in their browser instead of falling back to manual analysis.
2. **Diagnose:** Instead of relying on a screenshot or static analysis, the AI must use `list_console_messages` (filtered strictly to `error` and `warn`) or run the JavaScript verification snippet in the browser console to identify exactly which block is failing and extract the expected vs. actual HTML. The required script is located in the [WordPress Block & Template Troubleshooting](../skills/wp-block-post-content/references/wp-block-validation.md) reference.
3. **Analyze:** The AI should identify the root cause of the validation failure. This could be incorrect whitespace (e.g., tabs, trailing spaces, or unexpected blank lines), incorrect JSON attribute formatting, or missing wrapper classes, ensuring the markup is valid according to the [WP Block Post Content Skill](../skills/wp-block-post-content/SKILL.md).
4. **Fix:** The AI should update the block's raw HTML/comments to match the canonical WordPress output standard. For exact `save()` output signatures, it should refer to the [Core Block Markup Reference](../skills/wp-block-post-content/references/core-block-markup-reference.md).
5. **Verify:** The AI must re-run the verification snippet in the console to confirm the fix was successful, ensuring no validation errors remain.

## How to verify it worked
The test passes if the AI autonomously runs the DevTools workflow, correctly formats the broken block, and verifies the resolution in the console.

**Connection Fallback:** If the DevTools connection fails or the `list_pages` tool returns only `about:blank`, the test passes if the AI stops and explicitly asks the user to open the target page in their browser. The test fails if the AI prematurely falls back to manual analysis or attempts to use screenshots instead of the DevTools workflow.