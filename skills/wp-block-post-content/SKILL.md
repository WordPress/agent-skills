---
name: wp-block-post-content
description: >
  Use when generating, editing, or debugging raw WordPress block comment markup
  in post content, block patterns, or programmatic post creation.
  Not for building custom block types (use wp-block-development) or editing theme
  files and theme.json (use wp-block-themes).
compatibility: WordPress 6.9+, PHP 7.2.24+
---

## When to use
Use this skill when the task involves writing or fixing the serialised block comment
markup that WordPress stores as post content, pattern HTML, or programmatic
`wp_insert_post` / `wp_update_post` payloads, specifically:

- Generating post or page content as raw block markup (static or dynamic blocks)
- Writing or editing block patterns as standalone HTML files or PHP pattern registrations
- Programmatic content seeding where `post_content` must contain valid block markup
- Diagnosing "unexpected or invalid content" block validation errors in existing content
- Converting non-block HTML into correct block comment syntax

Do not use this skill when:
- Building a custom block type from source (block.json, render.php, attributes) → use `wp-block-development`
- Editing theme templates, template parts, or theme.json → use `wp-block-themes`

## Inputs required
- The specific block namespace and name (e.g., `wp:paragraph` or `wp:image`).
- The necessary attributes, content, and whether the block is static or dynamic.

## Procedure
1. **Identify Block Type:** Determine if the block is static (stores HTML) or dynamic (stores only the comment).
2. **Format Dynamic Blocks:** Most dynamic blocks (like `wp:latest-posts`) require only the comment delimiter with no HTML body. However, structural dynamic blocks (like `wp:query`) do contain inner blocks and HTML wrappers.
3. **Format Static Blocks:** Generate the exact HTML wrapper and inner content. Use the core block namespace shorthand (omit `core/`, e.g., `wp:paragraph`).
4. **Consult References:** Keep this procedure short. For exact `save()` output signatures of specific blocks, refer to `references/core-block-markup-reference.md`.
5. **Validate before delivery — three-gate process:**
   a. Write the generated content as a PHP eval-file into the site's uploads directory via the filesystem MCP — **never `/tmp/`**. WP-CLI in WordPress Studio runs inside a container whose filesystem root is `/wordpress/`, so `/tmp/` from the host is invisible to it. The correct writable path is `/wordpress/wp-content/uploads/your-script.php` (host path: `/Users/.../Studio/sitename/wp-content/uploads/your-script.php`).
   b. **Gate 1 (Tier 1):** Run `wp eval-file /wordpress/wp-content/uploads/your-script.php`. Must report `Round-trip: TRUE` and `Freeform: 0` before proceeding.
   c. **Gate 2 (Tier 3) — MANDATORY for any content containing static blocks:** Navigate to the editor page in Chrome DevTools MCP, then run the JS validation snippet from `references/wp-block-validation.md`. `invalidCount` must be `0`.
   d. Only call `$wpdb->update` after **both gates pass**.

> ⚠️ **Gate 2 is not optional.** The Tier 1 PHP round-trip cannot catch JS `save()` contract mismatches. A page that passes Tier 1 and looks correct in a browser screenshot can still have invalid blocks. The only way to confirm zero invalid blocks is to query `wp.data.select('core/block-editor').getBlocks()` in the live editor.

## Verification
Before outputting final block markup or inserting it into the database, you must perform an internal environment discovery audit to determine your available toolsets. 

> ⚠️ **CRITICAL WARNING:** Tiers 1 and 2 check comment syntax only. They operate purely on comment delimiters and never look at the HTML, meaning they cannot catch `save()` contract mismatches. For static blocks, a Tier 1 or 2 pass is necessary but not sufficient. You MUST escalate to Tier 3 or execute the rigorous Tier 4 manual cross-reference before declaring static block markup valid.

Execute the highest-tier validation protocol available to you:

- **[TIER 1] WP-CLI Live Environment:** Use `wp eval` to perform a PHP round-trip structural validation. Run `wp eval "$c = 'YOUR_MARKUP'; var_dump(serialize_blocks(parse_blocks($c)) === $c);"`. This must return `bool(true)`. A successful round-trip catches HTML structure mismatches that `parse_blocks()` alone ignores.
- **[TIER 2] Node.js Sandbox:** Run `node scripts/validate-markup.mjs` against your generated code.
- **[TIER 3] Chrome DevTools MCP:** Run the verification snippet directly in the browser console. This is the ONLY automated way to verify the JS `save()` contract.
- **[TIER 4] Manual Signature Cross-Reference (Fallback):** Manually cross-reference generated static blocks against their exact `save()` output signatures in `references/core-block-markup-reference.md`. If not documented there, fetch the `.html` fixture from `https://github.com/WordPress/gutenberg/blob/trunk/test/integration/fixtures/blocks/`.

**Interpreting Tiers 1 & 2 Output:** Any block entry with an empty or null `blockName` represents content WordPress could not parse as a valid block. Resolve all such syntax entries before proceeding to Tiers 3 or 4.

## Failure modes / debugging
The most common source of silent breakage is incorrect whitespace and formatting. When repairing errors, follow these strict rules to avoid validation failures [2]:
1. **Whitespace:** Check for double spaces in comment delimiters, `\r\n` line endings, or extra blank lines between the comment and its HTML wrapper [2].
2. **Required Classes:** Verify the class list on the wrapper element. Missing or extra classes will fail the JS diff [2]. 
3. **JSON Attribute Formatting:** JSON keys must be strictly double-quoted, and values must be the correct type (e.g., integer vs string: `{"level":2}` not `{"level":"2"}`) [2].

If the block's `save()` has changed since the content was written, the stored markup may be legitimately "old" — update it to match the current `save()` output, or add a deprecation entry. For deeper troubleshooting and template source diagnostics (such as verifying if a `wp_template_part` is loaded from the filesystem or database), refer to `references/wp-block-validation.md`.

## Surgical content replacement

When updating a single section of an existing page, **do not rebuild the entire post content**. Use depth-aware string walking to locate and replace only the target block, then validate and update. This avoids re-introducing errors in sections that were already valid.

**Pattern — replace the last occurrence of a top-level block:**

```php
$content = get_post($post_id)->post_content;
$new_section = '<!-- wp:group ... -->...</ wp:group -->';

// Find the last opener of the target block type
$start = strrpos($content, '<!-- wp:group');
$depth = 0;
$pos = $start;
$end = false;

while ($pos < strlen($content)) {
    $next_open  = strpos($content, '<!-- wp:group', $pos + 1);
    $next_close = strpos($content, '<!-- /wp:group -->', $pos);
    if ($next_close === false) break;
    if ($next_open !== false && $next_open < $next_close) {
        $depth++;
        $pos = $next_open;
    } else {
        if ($depth === 0) { $end = $next_close + strlen('<!-- /wp:group -->'); break; }
        $depth--;
        $pos = $next_close + strlen('<!-- /wp:group -->');
    }
}

$new_content = substr($content, 0, $start) . $new_section . substr($content, $end);
// Then validate and $wpdb->update as normal
```

This pattern works for any block type — replace `<!-- wp:group` and `<!-- /wp:group -->` with the target block's opener and closer. Use `strpos` (first) or `strrpos` (last) to target specific occurrences.

## Escalation
If the block markup continues to trigger "unexpected or invalid content" errors despite adhering to the strict whitespace and class rules above, escalate and ask the human user for assistance.

## Reference files  
- `references/core-block-markup-reference.md` — Detailed per-block markup signatures for all commonly used core blocks. Load when you need exact class or attribute details for a specific block.
- `references/wp-block-validation.md` — WordPress Block & Template Troubleshooting.

## External Resources & Deep Dives
If the exact class, attribute details, or validation rules are not covered in the local reference files, consult the official documentation for deep dives:
- **Gutenberg Integration Fixtures:** https://github.com/WordPress/gutenberg/blob/trunk/test/integration/fixtures/blocks/
- **WP Block Docs:** https://www.wpblockdocs.com/best-practices