# Reading the validation report

`scripts/html-to-blocks.mjs` prints a text report on stderr (or a JSON object on stdout with `--json`). Example from `fixtures/legacy-page`:

```
html-to-blocks: fixtures/legacy-page/input.html
Packages: @wordpress/blocks 16.2.0, @wordpress/block-library 11.2.0, node 22.22.3
Mode: convert HTML to blocks
Blocks: 12 (core/paragraph 3, core/group 2, core/html 2, core/list-item 2, core/heading 1, core/image 1, core/list 1)

Design mapped (8)
  h2 "About the studio"  color: #1a1a2e  ->  core/heading style.color.text = "#1a1a2e"
  ...
Design dropped (2)
  div "Visitors are welcome on Fridays."  text-align: center  ->  core/group has no text alignment; align the headings and paragraphs inside it instead
  ul "Monday to Friday 9 to 5"  list-style: none  ->  not part of the mapping; see references/design-mapping.md

Fallbacks (2)
  0:core/group > 4:core/html  from form "Email Subscribe"
    <form action="/subscribe" method="post"> <label>Email <input type="email" name="email"></label> ... </form>
    no core block has a raw transform for <form>
  0:core/group > 5:core/html  from iframe
    <iframe src="https://example.com/map" width="600" height="400" title="Map to the studio"></iframe>
    no core block has a raw transform for <iframe>

Invalid (0)

Round trip: stable (serialize -> parse -> serialize is identical)
Result: OK (12 of 12 blocks valid, 2 fallbacks)
```

## What each section means and what to do

### Blocks

Counts by block name after the markup was parsed back. Compare with the HTML structure: one Group per section, one Columns per row, one Button per link. A count that is off usually means a wrapper was not recognised (check `data-block`) or an element was split.

### Design mapped

One line per CSS declaration or explicit attribute that landed on a block. The element label is `tag#id.class "first words"`. Read this to confirm presets were recognised (`fontSize = "x-large"` rather than `style.typography.fontSize = "var(--wp--preset--font-size--x-large)"`; the latter never happens, a preset custom property is always mapped to its slug).

### Design dropped

One line per declaration the script refused to place, with the reason:

| Reason | Fix |
|--------|-----|
| `<block> has no <feature> support` | Move the property to an element whose block supports it. Lists, images and tables do not take backgrounds; wrap them in a `div` (Group). Groups do not take `text-align`; align the text blocks inside. |
| `<block> has no attribute "<name>"` | The key in `data-block-attrs` is wrong for that block. Look it up in `references/design-mapping.md` or the block's `block.json`. |
| `<block> does not accept align "<value>"` | Only `wide` and `full` for most blocks; `left`, `center`, `right` for Image, Table and Separator. For text alignment use `text-align`. |
| `not part of the mapping` | The property has no block attribute. Use a class plus a theme stylesheet, or drop it knowingly. |
| `only ... are mapped` | The value shape is not supported (for example a `background` shorthand with several layers). Split it into the single-purpose property. |

Nothing in this section was carried over. If the user asked for it, say so in the summary rather than letting it vanish.

### Fallbacks

Every `core/html` (and `core/freeform`) block in the output, with its path in the tree, the source element and a snippet. The path `0:core/group > 4:core/html` means the fifth child of the first top-level block.

Each fallback is a decision:

- rewrite the source as a mapped element (a `div` of links becomes `data-block="core/buttons"`, an `iframe` of a video becomes the bare video URL in a `p`, a hand-made two column `div` becomes `data-block="core/columns"`);
- replace it with a plugin block the site has (forms, maps);
- keep it, because Custom HTML is the honest answer for that fragment.

`--strict` turns any fallback into exit code 1 for pipelines that must not ship Custom HTML.

### Invalid

Blocks whose markup does not match what their `save()` produces for their attributes, the same comparison the editor runs. Each entry has the validator's own message (`Expected tag name h2, instead saw h3`, `Expected attribute class of value ..., instead saw ...`), the expected markup and the actual markup. A block whose name is not registered appears as `block "<name>" is not registered`.

The script's own conversion output does not produce invalid blocks: the markup comes from the registered `save()` functions. Invalid entries appear when you validate markup from another source. Do not patch the comment JSON or the HTML by hand; regenerate the block from HTML, or for a plugin block, install the plugin's package so its block is registered when validating.

### Migrated through a deprecated save()

Only in validate mode. The markup matched an older version of the block, parsed through a deprecation and will be rewritten the next time the post is saved in the editor. Harmless, but the post content on disk will change on first save; regenerate the markup if that matters.

### Round trip

`serialize(parse(markup)) === markup`. Stable means the markup is a fixed point of the block parser. A changed round trip in convert mode fails the run; in validate mode it accompanies migrated or invalid blocks.

### Result and exit code

| Exit | Meaning |
|------|---------|
| 0 | Every block valid; fallbacks allowed unless `--strict` |
| 1 | At least one invalid block, an unstable round trip, or a fallback under `--strict` |
| 2 | Usage error or missing npm dependencies |

## JSON report

`--json` prints `{ tool, packages, input, mode, ok, okReason, design: { mapped, dropped }, fallbacks, warnings, validation: { counts, total, invalid, fallbacks, migrated, roundTrip }, markup }`. `fixtures/*/expected.json` holds the summary the fixture runner compares against.
