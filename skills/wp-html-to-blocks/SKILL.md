---
name: wp-html-to-blocks
description: "Use when converting HTML into WordPress block markup (post content, page content, pattern content): agent-written HTML for a new page, legacy HTML from a classic site, or pasted markup. Converts with rawHandler from @wordpress/blocks against the registered core blocks, maps inline design onto block supports and theme.json presets so colours, spacing, typography and layout survive, and validates the result by serialize, parse and compare before anything is inserted. Not for site migration (fonts, forms, CSS rewriting, template parts, assets)."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Filesystem-based agent with bash + node (Node 20.19+ for the script). The script needs npm install once; no WordPress install is required to convert and validate."
---

# WP HTML to Blocks

## When to use

- You have HTML (written by you, pasted, or exported from a classic site) and need block markup the block editor opens without "This block contains unexpected or invalid content".
- You are about to hand-write `<!-- wp:... -->` comment delimiters. Do not. Convert instead and let the registered blocks produce their own markup.
- You need to check whether existing block markup is valid before inserting it through the REST API or WP-CLI.

Not for: migrating a whole site (fonts, forms, stylesheet rewriting, template parts, image inventories, scripts). That is a separate layer built on top of conversion; see `references/raw-handler-coverage.md` for where it lives. Custom block development routes to `wp-block-development`; pattern authoring routes to `wp-patterns`.

## Inputs required

- The HTML to convert (a fragment or a full document; `<head>` is ignored).
- Where the result goes: a post or page (REST `content.raw`), a pattern file, or a template.
- The theme's presets if you want the design to use them: colour, font size, font family, spacing, gradient and shadow slugs from `theme.json` (read it, or run `skills/wp-block-themes/scripts/detect_block_themes.mjs`). Without them, custom values still convert; they land as inline styles on the blocks.
- The WordPress version of the target site. The script validates against the `@wordpress/blocks` and `@wordpress/block-library` versions pinned in `scripts/package.json`; `shared/references/wp-gutenberg-version-map.json` maps WordPress releases to Gutenberg versions if you need to pin differently.

## Procedure

### 0) Install the script once

```bash
cd skills/wp-html-to-blocks/scripts && npm install
```

This pulls `@wordpress/blocks`, `@wordpress/block-library` and `jsdom`. The first run takes a few seconds while the block library registers 100+ core blocks.

### 1) Write HTML that rawHandler maps

`rawHandler` matches each top-level element against the raw transforms the core blocks declare. These map cleanly:

| HTML | Block |
|------|-------|
| `h1` to `h6` | `core/heading` (level kept) |
| `p` | `core/paragraph` |
| `ul`, `ol` (nested, `start`, `reversed`) | `core/list` with `core/list-item` |
| `blockquote` with `p` children and a `cite` | `core/quote` (the `cite` becomes the citation) |
| `figure > img` with optional `figcaption` | `core/image` |
| `table` with `thead`, `tbody`, `tfoot` | `core/table` |
| `pre > code` / `pre` | `core/code` / `core/preformatted` |
| `hr` | `core/separator` |
| `video`, `figure > video` | `core/video` |
| a paragraph holding only a URL | `core/embed` |

rawHandler has no transform for layout wrappers or buttons. The script builds those from the registered block types (`createBlock` plus the block's own `save()`), never from hand-written delimiters:

| HTML | Block |
|------|-------|
| `section`, `div`, `article`, `aside`, `header`, `footer`, `main`, `nav` | `core/group` (semantic tag kept as `tagName`, `layout.type` constrained by default) |
| `data-block="core/columns"` on a wrapper; each child element | `core/columns` with one `core/column` per child |
| `a` or `button` with `data-block="core/button"` (or a `button` / `btn` class), alone or inside a `p` | `core/button`; consecutive ones share one `core/buttons` |
| `data-block="core/buttons"` on a wrapper of links | `core/buttons` |
| `data-block="core/cover"` with `background-image` or `url` in `data-block-attrs` | `core/cover` |
| `data-block="core/media-text"` with an `img` or `video` inside | `core/media-text` |
| `details > summary` | `core/details` |
| `data-block="core/spacer"` with a `height` | `core/spacer` |

Inside text use `strong`, `em`, `a`, `code`, `mark`, `sub`, `sup`, `kbd` and `br`. A `span style="..."` survives as raw HTML inside the paragraph, which editors cannot restyle; prefer block-level styling.

Anything else (`form`, `iframe`, `svg`, `audio`, a `div` holding only inline widgets) becomes `core/html`. The report lists each one so you can decide: rewrite it with an existing block, keep it as Custom HTML on purpose, or route it to a plugin block.

### 2) Put the design where the converter can read it

rawHandler keeps content and drops presentation. Before converting, express the design on the element in one of two forms; the script maps both onto block supports and reports every declaration it cannot place.

**Inline style with theme presets** (preferred, still valid HTML that renders with the theme):

```html
<section style="background-color: var(--wp--preset--color--contrast);
                color: var(--wp--preset--color--base);
                padding: var(--wp--preset--spacing--60) var(--wp--preset--spacing--40)">
  <h2 style="font-size: var(--wp--preset--font-size--x-large); text-align: center">...</h2>
</section>
```

becomes `{"backgroundColor":"contrast","textColor":"base","style":{"spacing":{"padding":{"top":"var:preset|spacing|60",...}}}}` on the Group and `{"fontSize":"x-large","style":{"typography":{"textAlign":"center"}}}` on the Heading. A literal value (`#1a1a2e`, `18px`, `Georgia, serif`) maps to the matching `style.color.*` / `style.typography.*` / `style.spacing.*` / `style.border.*` key instead of a preset slug.

**Explicit block attributes** for what CSS cannot say:

```html
<section data-block-attrs='{"align":"full","layout":{"type":"constrained","contentSize":"44rem"}}'>
<div data-block="core/columns" data-block-attrs='{"verticalAlignment":"center"}'>
<a href="/docs" data-block="core/button" class="is-style-outline">
```

`data-block-attrs` is merged last and wins. Attribute names must exist on the block; unknown ones are dropped and reported, which is how you learn the right name.

Read `references/design-mapping.md` for the full CSS-to-attribute table, the layout mapping (`display:flex`, `display:grid`, `justify-content`, `gap`) and which blocks support what. The rule of thumb: colour, typography, spacing and border live on the block that renders them; layout lives on a Group, Columns or Buttons wrapper. A property a block does not support is not guessed onto it. Wrap the element in a Group and style the Group.

### 3) Convert and validate

```bash
node skills/wp-html-to-blocks/scripts/html-to-blocks.mjs page.html --out page.blocks.html
```

The block markup goes to `--out` (or stdout); the report goes to stderr. `--json` prints both as one JSON object. `--strict` makes any `core/html` fallback a failure.

The script converts, then serializes the blocks with their registered `save()`, parses the markup back and compares, the same check the editor runs before showing a recovery prompt. It also parses the result a second time and confirms serialize, parse, serialize is identical.

The report has five sections: blocks produced, design mapped, design dropped (with the reason and what to do), fallbacks (`core/html` with the source snippet), invalid blocks (name, path, the validator's message, expected versus actual markup). Exit code 0 means every block is valid. Read `references/validation-report.md` for how to read and fix each line.

If the input already contains `<!-- wp:` delimiters the script skips conversion and only validates, so the same command checks markup from any source.

### 4) Fix and re-run until it validates

Work from the report, not from the markup:

- **Design dropped: `<block> has no X support`**: move the property to an element the block supports, usually a wrapping Group (background, padding, border on a list or image) or the text blocks inside (text-align on a wrapper).
- **Design dropped: `has no attribute "X"`**: the `data-block-attrs` key is misspelled or belongs to another block. Check `references/design-mapping.md` or the block's `block.json` in `scripts/node_modules/@wordpress/block-library/build/<block>/block.json`.
- **Fallback `core/html`**: rewrite the source as one of the mapped elements above, or accept it deliberately. Never leave the whole page in one `core/html`.
- **Invalid block**: the markup does not match what `save()` produces. This only happens for markup written by hand or produced by another tool; regenerate it from HTML instead of patching the comment delimiters.
- **Warning: element split into N blocks**: rawHandler split an element (for example a paragraph holding an image and text) and the design could not be attached. Split the source HTML yourself so each element is one block.

Re-run after each change. Stop when the result line reads `OK` and the fallbacks are the ones you chose.

### 5) Insert the markup

Send the markup as raw post content; do not pass it through the editor's paste handler again.

- REST: `POST /wp/v2/posts` (or `/pages`) with `{"content": "<markup>", "status": "draft"}` and an authenticated user (see `wp-rest-api`).
- WP-CLI: `wp post create --post_type=page --post_status=draft page.blocks.html` (see `wp-wpcli-and-ops`).
- Pattern file: paste the markup as the pattern body (see `wp-patterns`).

Create as a draft first. Open it in the block editor once: no block recovery prompt, the List View shows the expected tree, and the colours and spacing match the design.

## Verification

- `node scripts/html-to-blocks.mjs <file>` exits 0 and the report shows `Invalid (0)`.
- Every `core/html` in the report is intentional; with `--strict` the run exits 0 when none remain.
- `Design dropped` is empty, or each dropped line is a property you chose not to carry.
- Opening the draft in the editor shows no "Attempt Block Recovery" prompt and the List View matches the HTML structure.
- `cd scripts && npm test` runs the committed fixtures under `fixtures/` (hero, two columns, feature list, image with caption, pricing table, legacy page) and compares output and report with the expected files. Use `node run-fixtures.mjs --update` after a deliberate change to the mapping.

## Failure modes / debugging

- **`Missing dependency`**: run `npm install` in `scripts/`. Node must be 20.19 or newer for the pinned jsdom.
- **Output valid locally, invalid on the site**: the site registers different block versions (older WordPress, a plugin filtering core blocks) or a block attribute you used does not exist there yet. Pin `@wordpress/blocks` and `@wordpress/block-library` in `scripts/package.json` to the Gutenberg version bundled with that WordPress release (`shared/references/wp-gutenberg-version-map.json`), reinstall, re-run.
- **A preset slug renders unstyled**: the slug is not in the site's `theme.json`. The markup is still valid (the class is emitted; the theme defines no CSS for it). Use a slug the theme defines, or a literal value.
- **Everything became `core/html`**: the input has no block-level structure the converter recognises (for example one big `div` of spans), or the `data-block` markers are misspelled. Check the warnings section.
- **Images carry `width`/`height` attributes and come out resized**: that is rawHandler's image transform. Omit the attributes for a natural-size image, or set `sizeSlug` in `data-block-attrs`.
- **A `<cite>` outside a blockquote or a `<span>` at top level became `core/html`**: wrap inline content in a `p`.
- **Embeds**: a bare URL alone in a `p` becomes `core/embed`; an `iframe` does not and falls back to `core/html`.

Read `references/raw-handler-coverage.md` for what rawHandler does and does not handle, and what the Gutenberg work on block-declared transforms changes.

## Never do this

- Hand-write `<!-- wp:name {...} -->` delimiters and their inner HTML. Comment delimiters are only valid together with the markup the block's `save()` produces for those exact attributes; a hand-written pair is the usual source of recovery prompts.
- Put the whole page into one `core/html` block. It renders, and nobody can edit it.
- Strip design silently. Every dropped declaration must appear in the report and in your summary to the user.
- Patch an invalid block by editing its comment JSON. Regenerate it from HTML.

## Escalation

- The site uses a plugin block for a region (forms, maps, sliders): ask which block, then write the HTML the plugin's raw transform expects or leave a placeholder `core/html` and say so.
- The design needs something no core block support expresses (absolute positioning, CSS grid areas, animations): say it is out of scope for block attributes and propose a Group with a class and a theme stylesheet rule.
- The target site runs an unsupported WordPress version or a heavily filtered block set: ask for the version before promising valid output.
