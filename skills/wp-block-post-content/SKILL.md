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
- The specific block namespace and name (e.g., `wp:paragraph` or `wp:image`) [2].
- The necessary attributes, content, and whether the block is static or dynamic [2].

## Procedure
1. **Identify Block Type:** Determine if the block is static (stores HTML) or dynamic (stores only the comment).
2. **Format Dynamic Blocks:** Most dynamic blocks (like `wp:latest-posts`) require only the comment delimiter with no HTML body. However, structural dynamic blocks (like `wp:query`) do contain inner blocks and HTML wrappers.
3. **Format Static Blocks:** Generate the exact HTML wrapper and inner content. Use the core block namespace shorthand (omit `core/`, e.g., `wp:paragraph`).
4. **Consult References:** Keep this procedure short. For exact `save()` output signatures of specific blocks, refer to `references/core-block-markup-reference.md`.
5. **Validate before delivery:** Do not insert or return content until validation passes. For programmatic insertion via `wp_insert_post` or WP-CLI:
   a. Write the generated content to a temp file (e.g. `/tmp/wp-content-draft.html`)
   b. Run Tier 1 or Tier 2 validation against that file before inserting
   c. Only call `wp_insert_post` / `wp post create` after validation is clean

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

## Escalation
If the block markup continues to trigger "unexpected or invalid content" errors despite adhering to the strict whitespace and class rules above, escalate and ask the human user for assistance.

## Reference files  
- `references/core-block-markup-reference.md` — Detailed per-block markup signatures for all commonly used core blocks. Load when you need exact class or attribute details for a specific block.
- `references/wp-block-validation.md` — WordPress Block & Template Troubleshooting.

## External Resources & Deep Dives
If the exact class, attribute details, or validation rules are not covered in the local reference files, consult the official documentation for deep dives:
- **Gutenberg Integration Fixtures:** https://github.com/WordPress/gutenberg/blob/trunk/test/integration/fixtures/blocks/
- **WP Block Docs:** https://www.wpblockdocs.com/best-practices