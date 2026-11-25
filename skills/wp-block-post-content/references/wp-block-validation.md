# WordPress Block & Template Troubleshooting

## Verification
Before outputting final block markup or inserting it into the database, you must perform an internal environment discovery audit to determine your available toolsets.

> ⚠️ **CRITICAL WARNING:** Tiers 1 and 2 check comment syntax only. They operate purely on comment delimiters and never look at the HTML, meaning they cannot catch `save()` contract mismatches. For static blocks, a Tier 1 or 2 pass is necessary but not sufficient. You MUST escalate to Tier 3 or execute the rigorous Tier 4 manual cross-reference before declaring static block markup valid.

Execute the highest-tier validation protocol available to you:

- **[TIER 1] WP-CLI Live Environment:** Use `wp eval-file` to perform a PHP round-trip structural validation. The script must call `parse_blocks()` → `serialize_blocks()` and confirm the round-trip returns `TRUE` with `0 freeform blocks`. A successful round-trip catches delimiter mismatches but **cannot** catch JS `save()` contract violations.
- **[TIER 2] Node.js Sandbox:** Run `node scripts/validate-markup.mjs` against your generated code.
- **[TIER 3] Chrome DevTools MCP:** Navigate to the post editor in Chrome DevTools, then run the verification snippet below. This is the ONLY automated way to verify the JS `save()` contract. `invalidCount` must equal `0` before the task is complete.
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

Navigate to the post editor (`/wp-admin/post.php?post=ID&action=edit`) and wait for the editor to fully load before running the snippet. Run this snippet via `chrome-devtools:evaluate_script` after every insert and before reporting done:

```javascript
() => {
    if (!window.wp || !window.wp.data) return 'editor not loaded';
    const invalid = [];
    function find(blocks, path) {
        blocks.forEach((b, i) => {
            const p = (path ? path + ' > ' : '') + b.name + '[' + i + ']';
            if (b.isValid === false) invalid.push(p);
            if (b.innerBlocks && b.innerBlocks.length) find(b.innerBlocks, p);
        });
    }
    const blocks = wp.data.select('core/block-editor').getBlocks();
    if (!blocks.length) return 'no blocks loaded — editor may still be initialising';
    find(blocks, '');
    return { invalidCount: invalid.length, paths: invalid };
}
```

`invalidCount: 0` with an empty `paths` array means all blocks pass JS validation. Any other result requires debugging.

**If the outer wrapper block is the one flagged:** The most likely cause is non-block HTML comments inside the block's innerHTML (see § 4 below). The outer block's stored `innerHTML` includes everything between the opening and closing tags of that block — including any annotation comments left between inner blocks that are not `<!-- wp:... -->` delimiters.

## 4. Non-Block HTML Comments — Silent Tier 1 Pass, Fatal Tier 3 Fail
HTML comments that are not block delimiters (e.g. `<!-- Section label -->`, `<!-- TODO: ... -->`, `<!-- unchanged -->`) are **silently preserved** by `parse_blocks()` / `serialize_blocks()`. This means:

- **Tier 1 (PHP round-trip) passes** — the comment is part of the serialised string and round-trips unchanged.
- **Tier 3 (JS validator) fails** — Gutenberg's JS validator compares the block's stored `innerHTML` against what `save()` would produce. `save()` produces no such comments, so the diff fails and the block is marked invalid.

This is the single most common cause of a block that looks correct in the browser, passes PHP validation, but is still flagged as invalid in the editor.

**Diagnostic:** If Tier 3 flags only the outermost wrapper block while all inner blocks pass, check for annotation comments between inner blocks. Run in Chrome DevTools:

```javascript
() => {
    const blocks = wp.data.select('core/block-editor').getBlocks();
    const outer = blocks[0];
    const stored = outer.originalContent || '';
    const nonBlockComments = (stored.match(/<!--[^>]*-->/g) || [])
        .filter(c => !c.match(/<!--\s*\/?wp:/));
    return { count: nonBlockComments.length, comments: nonBlockComments };
}
```

**Fix:** Strip all non-block HTML comments from the content before inserting. In PHP:

```php
$content = preg_replace('/<!--(?!\s*\/?wp:)[^>]*-->/', '', $content);
```

Run the PHP round-trip validation again after stripping, then re-run Tier 3 to confirm.

## 5. Block Validation Diagnostic Sequence
When debugging block validation errors, follow this strict pipeline:
`get_block_template()` → Confirm source & extract raw block content
|
`parse_blocks()` → Inspect individual block innerHTML structure
|
`WP_Block_Type_Registry` → Check render_callback (Static vs. Dynamic blocks)
|
`render_block()` → Cross-check PHP side output (Caution: includes structural layout classes absent in save())
