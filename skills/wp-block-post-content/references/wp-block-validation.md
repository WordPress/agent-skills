# WordPress Block & Template Troubleshooting

## Verification
Before outputting final block markup or inserting it into the database, you must perform an internal environment discovery audit to determine your available toolsets. 

> ⚠️ **CRITICAL WARNING:** Tiers 1 and 2 check comment syntax only. They operate purely on comment delimiters and never look at the HTML, meaning they cannot catch `save()` contract mismatches. For static blocks, a Tier 1 or 2 pass is necessary but not sufficient. You MUST escalate to Tier 3 or execute the rigorous Tier 4 manual cross-reference before declaring static block markup valid.

Execute the highest-tier validation protocol available to you:

- **[TIER 1] WP-CLI Live Environment:** Use `wp eval` to perform a PHP round-trip structural validation. Run `wp eval "$c = 'YOUR_MARKUP'; var_dump(serialize_blocks(parse_blocks($c)) === $c);"`. This must return `bool(true)`. A successful round-trip catches HTML structure mismatches that `parse_blocks()` alone ignores.- **[TIER 2] Node.js Sandbox:** Run `node scripts/validate-markup.mjs` against your generated code.
- **[TIER 3] Chrome DevTools MCP:** Run the verification snippet directly in the browser console. This is the ONLY automated way to verify the JS `save()` contract.
- **[TIER 4] Manual Signature Cross-Reference (Fallback):** If no browser MCP is available, you CANNOT rely on internal predictive logic. You must manually cross-reference your generated static blocks against their exact `save()` output signatures in `references/core-block-markup-reference.md`. If the block is not documented there, you must retrieve its exact `.html` fixture from `https://github.com/WordPress/gutenberg/blob/trunk/test/integration/fixtures/blocks/`.

**Interpreting Tiers 1 & 2 Output:** The result is an array of block objects. Any entry with an empty or null `blockName` represents content WordPress could not parse as a valid block — this is a failure. Resolve all such entries before proceeding.

**For programmatic insertion (WP-CLI / `wp_insert_post`):** Always write content to a temp file and validate it syntactically (Tier 1/2) AND structurally (Tier 3/4) before inserting. Never pass content directly to `wp_insert_post` without confirming it is clean.

## 2. WordPress 7.0 Block Validation Rules
### Canonical Whitespace & Structure
* Tabs, trailing spaces, and unexpected blank lines inside block wrappers trigger silent validation failures.
* Inner block comments (`<!-- wp:... -->`) must start on the same line as—or immediately following—the opening HTML wrapper tag, with zero leading indentation or blank lines.
* Emulate the golden-standard structural patterns established in the `wp-block-post-content` skill.

## 3. Chrome DevTools Verification Workflow
If using the DevTools MCP (Tier 3), verify by querying the block editor store — never by screenshot. The editor renders only one "Block contains unexpected or invalid content" banner regardless of how many blocks are invalid. A clean-looking screenshot does not mean all blocks pass. 

Run this snippet in Chrome DevTools after every fix and before reporting done:

```javascript
(() => {
const invalid = [];
const find = (blocks, path = '') => blocks.forEach((b, i) => {
const p = path ? `${path} > ${b.name}[${i}]` : `${b.name}[${i}]`;
if (b.isValid === false) {
const issue = (b.validationIssues || []).find(v => v.args?.?.includes('Expected attribute'));
invalid.push({ path: p, expected: issue?.args?.?.slice(0,120), actual: issue?.args?.?.slice(0,120) });
}
if (b.innerBlocks?.length) find(b.innerBlocks, p);
});
find(wp.data.select('core/block-editor').getBlocks());
return { invalidCount: invalid.length, blocks: invalid };
})();
```

## 4. Block Validation Diagnostic Sequence
When debugging block validation errors, follow this strict pipeline:  
`get_block_template()` -> Confirm source & extract raw block content
|
`parse_blocks()`    -> Inspect individual block innerHTML structure
|
`WP_Block_Type_Registry` -> Check render_callback (Static vs. Dynamic blocks)
|
`render_block()`     -> Cross-check PHP side output (Caution: includes structural layout classes absent in save())