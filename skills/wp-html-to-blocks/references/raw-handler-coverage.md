# What rawHandler covers, and what sits around it

`rawHandler( { HTML } )` from `@wordpress/blocks` is the editor's own HTML to blocks path. It is what runs when a Classic block is converted to blocks. The paste handler (`pasteHandler`) is the same pipeline with extra cleanup for content copied from word processors; this skill uses `rawHandler` because the input is deliberate HTML, not a clipboard.

Requirement: the blocks must be registered first. In the browser the editor does that; in Node the script registers the core block library with `registerCoreBlocks()` inside a jsdom window. A third-party block is only reachable if its package is installed and registered the same way.

## The pipeline

1. If the input contains `<!-- wp:` the string is parsed as block markup instead; conversion is skipped.
2. Shortcodes standing alone become blocks when a block declares a shortcode transform; others stay text.
3. Light normalisation: loose list items get a list, `<!--more-->` and `<!--nextpage-->` become blocks, images inside paragraphs are lifted into `figure`, loose text inside a blockquote is wrapped in `p`, inline runs at the top level are wrapped in `p`.
4. Each top-level element is matched against the raw transforms the registered blocks declare (`type: "raw"`, with a `selector` or an `isMatch` function). The first match (by priority) builds the block; its content is read through the block's attribute sources.
5. An element no transform claims becomes `core/html` with the element's outer HTML.

In the pinned `@wordpress/blocks`, a top-level element's `class` attribute is copied into the block's `className` when a raw transform claims it.

## Raw transforms in the pinned core block library

Enumerated from the registered blocks (`getBlockTransforms('from')` filtered by `type === 'raw'`) for `@wordpress/block-library` 11.2.0:

| Block | Matches |
|-------|---------|
| `core/paragraph` | `p` |
| `core/heading` | `h1` to `h6` |
| `core/list` | `ol`, `ul` (recursive; `start`, `reversed`, `type` read from the list) |
| `core/quote` | `blockquote` (children converted recursively; no `cite` handling) |
| `core/image` | `figure > img`, `img` alone, with optional link and `figcaption`; `width`/`height` attributes produce a resized image |
| `core/table` | `table` |
| `core/code` | `pre` whose only child is `code` |
| `core/preformatted` | `pre` |
| `core/separator` | `hr` |
| `core/video` | `figure > video`, `video` |
| `core/embed` | a paragraph holding one URL and nothing else |
| `core/more`, `core/nextpage` | the `<!--more-->` and `<!--nextpage-->` comments |

No raw transform exists for `div`, `section`, `header`, `footer`, `nav`, `aside`, `article`, `main`, `a`, `button`, `details`, `form`, `iframe`, `svg`, `span` at the top level, or any wrapper. That is why a page written as nested `div`s converts to a handful of `core/html` blocks, and why rawHandler is said to drop the design: wrappers carry most of it and wrappers are not claimed.

## What this skill adds on top

Two things, both deliberately thin:

- **Containers**: wrappers become Group, Columns, Buttons, Cover, Media & Text, Details or Spacer, built with `createBlock()` from the registered block type. The block's `save()` writes the markup, so the output is exactly what the editor would write for those attributes, and validation proves it.
- **Design mapping**: inline CSS, `id`, `class` and `data-block-attrs` on an element become attributes on the block the element produced, checked against the block's `supports` and `attributes`, with every refusal reported. See `references/design-mapping.md`.

Everything else is rawHandler. When the Gutenberg work on declaring raw transforms in `block.json` lands (WordPress/gutenberg#82013: a `transforms` field read by both the editor and PHP, plus `gutenberg_html_to_blocks()` as a server-side counterpart of `rawHandler()`), the container step can shrink to whatever core still does not claim, and the same conversion becomes available from PHP without this script. Until then, the script depends only on released packages.

## Out of scope: site migration

Converting a page's HTML to blocks is one step of moving a site. The rest is a different problem with different tools:

- fonts: finding font sources and producing a font plan;
- forms: extracting fields and behaviour for a form plugin;
- stylesheets: rewriting selectors for the converted markup and generating the extra CSS a theme needs;
- images and assets: inventories, downloads, URL rewriting;
- scripts: deciding what interactive regions to keep and how;
- template parts, routes and navigation across many pages;
- custom blocks generated for unsupported regions.

Automattic's `blocks-engine` does that layer on top of `rawHandler`, and Studio's `validate_blocks` tool runs the validation half against a live site. This skill is the pure conversion they build on; use it for one page or one fragment, and hand the migration to tooling that owns the whole site.
