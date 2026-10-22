# Design mapping: CSS and data attributes to block attributes

The script reads three things on each element and turns them into block attributes before `createBlock()` runs:

1. the inline `style` attribute (a documented subset of CSS, below);
2. `id` (becomes `anchor` when the block supports anchors) and `class` (becomes `className`; for buttons the marker classes `button`, `btn`, `wp-block-button__link`, `wp-element-button` are removed and style variations such as `is-style-outline` are kept);
3. `data-block-attrs`, a JSON object merged last.

Every declaration is either reported as mapped (`property: value -> block attribute = result`) or as dropped with a reason. Nothing is guessed onto a block that does not support it.

## Preset custom properties

A value written as a WordPress preset custom property maps to the preset slug, so the block uses the theme's token instead of a literal:

| CSS value | Attribute |
|-----------|-----------|
| `var(--wp--preset--color--<slug>)` | `backgroundColor`, `textColor`, `borderColor` or `overlayColor` = `<slug>` |
| `var(--wp--preset--font-size--<slug>)` | `fontSize` = `<slug>` |
| `var(--wp--preset--font-family--<slug>)` | `fontFamily` = `<slug>` |
| `var(--wp--preset--spacing--<slug>)` | `style.spacing.*` = `var:preset\|spacing\|<slug>` |
| `var(--wp--preset--gradient--<slug>)` | `gradient` = `<slug>` |
| `var(--wp--preset--shadow--<slug>)` | `style.shadow` = `var:preset\|shadow\|<slug>` |

Any other value (`#1a1a2e`, `rgb(...)`, `18px`, `1.5rem`, `Georgia, serif`, `linear-gradient(...)`) is kept as a custom value under `style.*`. The default WordPress presets are `base`, `contrast`, `primary`, `secondary`, `tertiary` for colours, `small`, `medium`, `large`, `x-large`, `xx-large` for font sizes and `20` to `80` for spacing; a theme defines its own in `theme.json`.

## CSS property table

The "needs" column is the block support the target block must declare. Group, Columns, Column, Cover, Buttons, Button, Heading, Paragraph, List, Quote, Table, Code and Details support colour, typography, spacing and border. Image supports align, anchor, border, margin, shadow and duotone only; style an image's background or padding by wrapping it in a Group.

| CSS | Attribute | Needs |
|-----|-----------|-------|
| `background-color`, `background: <colour>` | `backgroundColor` or `style.color.background` (Cover: `overlayColor` / `customOverlayColor`) | `color.background` |
| `color` | `textColor` or `style.color.text` | `color.text` |
| `background: <gradient>`, `background-image: <gradient>` | `gradient` or `style.color.gradient` (Cover: `gradient` / `customGradient`) | `color.gradients` |
| `background-image: url(...)`, `background: url(...)` | Cover: `url`; Group and others: `style.background.backgroundImage.url` | `background.backgroundImage` |
| `font-size` | `fontSize` or `style.typography.fontSize` | `typography.fontSize` |
| `font-family` | `fontFamily` or `style.typography.fontFamily` | `typography.__experimentalFontFamily` |
| `font-weight`, `font-style`, `line-height`, `letter-spacing`, `text-transform`, `text-decoration` | `style.typography.<camelCase>` | matching typography support |
| `text-align` (left, center, right) | `style.typography.textAlign`; Buttons: `layout.justifyContent`; Quote: `textAlign` | `typography.textAlign` |
| `padding`, `padding-<side>` | `style.spacing.padding.<side>` | `spacing.padding` |
| `margin`, `margin-<side>` | `style.spacing.margin.<side>` | `spacing.margin` (Group allows top and bottom only) |
| `gap`, `row-gap`, `column-gap` | `style.spacing.blockGap` (two values: `{top, left}`) | `spacing.blockGap` |
| `border: <width> <style> <colour>`, `border-width`, `border-style`, `border-color` | `style.border.{width,style,color}`; a preset colour becomes `borderColor` | `__experimentalBorder.*` |
| `border-<side>: ...` | `style.border.<side>.{width,style,color}` | `__experimentalBorder.*` |
| `border-radius` | `style.border.radius` | `__experimentalBorder.radius` |
| `box-shadow` | `style.shadow` | `shadow` |
| `min-height` | `style.dimensions.minHeight`; Cover: `minHeight` + `minHeightUnit` | `dimensions.minHeight` |
| `max-width` (Group, Cover) | `layout.type = constrained`, `layout.contentSize` | `layout` |
| `width` | Column: `width`; Image: `width`; Button: `style.dimensions.width` | Button: `dimensions.width` |
| `height` | Spacer: `height`; Image: `height` | |
| `aspect-ratio`, `object-fit` | Image: `aspectRatio`, `scale` | |
| `display: flex` | `layout.type = flex` | `layout` |
| `flex-direction: column` | `layout.orientation = vertical` | `layout` |
| `justify-content` | `layout.justifyContent` (left, center, right, space-between) | `layout` |
| `flex-wrap: nowrap` | `layout.flexWrap = nowrap` | `layout` |
| `align-items` | Group: `layout.verticalAlignment` (horizontal) or `layout.justifyContent` (vertical); Columns, Column, Media & Text: `verticalAlignment` | `layout` |
| `display: grid`, `grid-template-columns: repeat(N, ...)` | `layout.type = grid`, `layout.columnCount = N` | `layout` |
| `grid-template-columns: repeat(auto-fit, minmax(X, 1fr))` | `layout.type = grid`, `layout.minimumColumnWidth = X` | `layout` |

Anything not in the table (`position`, `float`, `max-width` on text, `list-style`, `overflow`, `transition`, ...) is reported as "not part of the mapping". Express it with a `className` and a theme stylesheet rule, or leave it out.

## Attributes you set with data-block-attrs

These have no CSS equivalent. Names are the ones in each block's `block.json`.

| Block | Attribute | Values |
|-------|-----------|--------|
| any block with `align` support | `align` | `wide`, `full` (Image, Table, Separator also `left`, `center`, `right`) |
| `core/group` | `layout` | `{"type":"constrained","contentSize":"44rem","wideSize":"72rem"}`, `{"type":"flex","orientation":"vertical","justifyContent":"center"}`, `{"type":"grid","columnCount":3}` |
| `core/group` | `tagName` | `div`, `section`, `article`, `aside`, `header`, `footer`, `main`, `nav` (set from the HTML tag automatically) |
| `core/columns` | `isStackedOnMobile`, `verticalAlignment` | `true`/`false`; `top`, `center`, `bottom` |
| `core/column` | `width`, `verticalAlignment` | `"33.33%"`, `"40%"` |
| `core/buttons` | `layout` | `{"type":"flex","justifyContent":"center"}` |
| `core/button` | `className`, `linkTarget`, `rel`, `style.dimensions.width` | `is-style-outline`, `is-style-fill`; `_blank`; `"50%"` |
| `core/cover` | `url`, `dimRatio`, `overlayColor`, `minHeight`, `minHeightUnit`, `contentPosition`, `isDark` | `dimRatio` 0 to 100 (50 is used when a `url` is present and nothing is set) |
| `core/media-text` | `mediaPosition`, `mediaWidth`, `isStackedOnMobile`, `verticalAlignment`, `imageFill` | `left`/`right`; 15 to 85 |
| `core/image` | `sizeSlug`, `linkDestination`, `href`, `align`, `aspectRatio`, `scale` | `thumbnail`, `medium`, `large`, `full` |
| `core/heading` | `level` | 1 to 6 (set from the tag automatically) |
| `core/list` | `ordered`, `start`, `reversed`, `type` | `type`: `a`, `A`, `i`, `I` |
| `core/table` | `hasFixedLayout` | `true`/`false` |
| `core/details` | `showContent`, `name` | `open` on the `<details>` tag sets `showContent` |
| `core/spacer` | `height` | `"40px"`, `"var:preset\|spacing\|50"` |
| any block | `anchor`, `className` | set from `id` and `class` automatically; `{"metadata":{"name":"Hero"}}` names the block in the List View |

To check an attribute name, open `scripts/node_modules/@wordpress/block-library/build/<block>/block.json` after `npm install`; the `attributes` and `supports` keys are the source of truth for the pinned version.

## Where design belongs

- Section background, padding, border, min-height, layout: on the wrapper (Group, Columns, Cover).
- Text colour, size, family, weight, alignment, transform, letter spacing: on the Heading, Paragraph, List or Quote that shows the text. A text colour on a Group is inherited by its children through the `has-text-color` class, so it also works at wrapper level.
- Button colours, radius, padding: on the Button; alignment of the row on Buttons (`justify-content` or `text-align` on the wrapper).
- Image radius: on the Image; image background or padding: on a Group around it.
- Card look (border, radius, padding, background): on the Column or an inner Group, not on the Heading inside.
