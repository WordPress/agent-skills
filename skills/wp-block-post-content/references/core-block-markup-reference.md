# Core Block Markup Reference  
Exact `save()` output signatures for commonly used WordPress core blocks.
All examples use WordPress 7.0 output. Load this file when the golden
standards in SKILL.md do not cover the specific block or attribute combination
you need [1].

---

## Table of contents
- Text blocks: paragraph, heading, list, preformatted
- Media blocks: image (basic, resized, border-radius), file
- Design blocks: separator, buttons (basic, with inline fontSize), group, group with background image, columns (basic, with width/verticalAlignment), cover, details
- Embed / dynamic blocks: latest-posts
- Attribute serialisation rules
- Inline style property ordering
- Classic block (legacy)

---

## "Golden standard" examples
These are exact representations of what WordPress would write to the database. Copy the structure, not just the concept. The block serialisation format is unchanged in WordPress 7.0, making these signatures completely valid for modern implementations.

### Simple paragraph
```html
<!-- wp:paragraph -->
<p>This is a paragraph of text.</p>
<!-- /wp:paragraph -->
```

### Heading (h2)
```html
<!-- wp:heading -->
<h2 class="wp-block-heading">Section Title</h2>
<!-- /wp:heading -->
```

### Heading (h3, explicit level)
```html
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Subsection</h3>
<!-- /wp:heading -->
```

---

## Image block signatures

### Basic image (with ID and size)
```html
<!-- wp:image {"id":42,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://example.com/wp-content/uploads/photo.jpg" alt="Alt text" class="wp-image-42"/></figure>
<!-- /wp:image -->
```

### Image with border-radius
`style.border.radius` is serialised as an inline style on the `<figure>` tag, not the `<img>`.
```html
<!-- wp:image {"id":42,"sizeSlug":"large","style":{"border":{"radius":"4px"}}} -->
<figure class="wp-block-image size-large" style="border-radius:4px"><img src="https://example.com/wp-content/uploads/photo.jpg" alt="" class="wp-image-42"/></figure>
<!-- /wp:image -->
```

### Image with explicit width (resized)
When `width` is set as a raw value (e.g. `"56px"`) rather than a preset, three things happen simultaneously — all three must be present or JS validation fails:
1. The `<figure>` gets class `is-resized`
2. The `<img>` gets `style="width:56px"` (the value verbatim from the attr)
3. The `<figure>` remains `size-{sizeSlug}` as normal

```html
<!-- wp:image {"id":97,"width":"56px","sizeSlug":"thumbnail"} -->
<figure class="wp-block-image size-thumbnail is-resized"><img src="https://example.com/wp-content/uploads/icon.png" alt="" class="wp-image-97" style="width:56px"/></figure>
<!-- /wp:image -->
```

> ⚠️ The PHP round-trip (Tier 1) does NOT catch a missing `is-resized` class or missing `style="width:..."` on the img. These are JS `save()` contract requirements only. Always verify resized images via Tier 3.

### Image with link to media file
```html
<!-- wp:image {"id":42,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://example.com/wp-content/uploads/photo.jpg"><img src="https://example.com/wp-content/uploads/photo-1024x768.jpg" alt="" class="wp-image-42"/></a></figure>
<!-- /wp:image -->
```

---

## Button block signatures

### Basic button
```html
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://example.com">Click here</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
```

### Button with colour presets, padding, border-radius
`backgroundColor` and `textColor` preset slugs produce `has-{slug}-background-color` and `has-{slug}-color` classes on the `<a>` tag. `style.border.radius`, `style.spacing.padding.*` are serialised into the `<a>` tag's inline style.

Style property order on the `<a>` tag (Gutenberg serialises in this sequence):
`border-radius` → `padding-top/right/bottom/left` → `font-size` (if set) → `font-weight` (if set)

```html
<!-- wp:button {"backgroundColor":"signal-amber","textColor":"ink-navy","style":{"spacing":{"padding":{"top":"1rem","bottom":"1rem","left":"2.5rem","right":"2.5rem"}},"border":{"radius":"3px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-ink-navy-color has-signal-amber-background-color has-text-color has-background wp-element-button" href="https://example.com" style="border-radius:3px;padding-top:1rem;padding-right:2.5rem;padding-bottom:1rem;padding-left:2.5rem">Click here</a></div>
<!-- /wp:button -->
```

### Button with inline font-size (raw value, not preset)
When `style.typography.fontSize` is a raw value (e.g. `"1.125rem"`), **not** a preset slug, two additional things are required:
1. `has-custom-font-size` class on the `<a>` tag (after `has-background`, before `wp-element-button`)
2. `font-size` appears in the inline style **before** `font-weight`

```html
<!-- wp:button {"backgroundColor":"signal-amber","textColor":"ink-navy","style":{"typography":{"fontWeight":"700","fontSize":"1.125rem"},"spacing":{"padding":{"top":"1.25rem","bottom":"1.25rem","left":"3rem","right":"3rem"}},"border":{"radius":"3px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-ink-navy-color has-signal-amber-background-color has-text-color has-background has-custom-font-size wp-element-button" href="https://example.com" style="border-radius:3px;padding-top:1.25rem;padding-right:3rem;padding-bottom:1.25rem;padding-left:3rem;font-size:1.125rem;font-weight:700">Click here</a></div>
<!-- /wp:button -->
```

> ⚠️ Missing `has-custom-font-size` or wrong style order both pass Tier 1 and look identical in the browser but fail Tier 3.

---

## Group block signatures

### Basic group with constrained layout
```html
<!-- wp:group {"tagName":"div","layout":{"type":"constrained"}} -->
<div class="wp-block-group"><!-- wp:paragraph -->
<p>Content inside a group.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
```

### Group with background colour
`style.color.background` using a preset reference produces `has-background` class; the actual colour is applied via `background-color` in the inline style using the CSS custom property reference.

```html
<!-- wp:group {"style":{"color":{"background":"var:preset|color|ink-navy"},"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group has-background" style="background-color:var(--wp--preset--color--ink-navy);padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--70);padding-left:var(--wp--preset--spacing--50)"><!-- wp:paragraph -->
<p>Content.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
```

### Group with background image overlay
`style.background.backgroundImage` stores the image metadata in the comment JSON. The group div gets `has-background` but the background-image CSS is **not** in the inline style — it is applied via a generated CSS custom property (`--wp--style--background-image`). The `background-color` and `padding-*` values are still serialised as inline styles as normal.

```html
<!-- wp:group {"style":{"color":{"background":"var:preset|color|ink-navy"},"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}},"background":{"backgroundImage":{"url":"http://example.com/wp-content/uploads/texture.png","id":95,"source":"file","title":"Texture pattern"},"backgroundSize":"cover"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group has-background" style="background-color:var(--wp--preset--color--ink-navy);padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)"><!-- wp:paragraph -->
<p>Content.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
```

> Note: The background-image URL does not appear in the div's inline style. WordPress outputs it separately via a `<style>` block in the document head. The Tier 1 round-trip passes correctly without it in the inline style.

---

## Columns block signatures

### Two equal columns
```html
<!-- wp:columns -->
<div class="wp-block-columns"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:paragraph -->
<p>Left column content.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:paragraph -->
<p>Right column content.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->
```

### Column with explicit width
`width` on a `core/column` is serialised as `flex-basis:{value}` in the div's inline style. The value is used verbatim from the attribute (e.g. `"55%"` → `flex-basis:55%`).

```html
<!-- wp:column {"width":"55%"} -->
<div class="wp-block-column" style="flex-basis:55%"><!-- wp:paragraph -->
<p>Wider column content.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
```

### Column with verticalAlignment
`verticalAlignment` produces class `is-vertically-aligned-{value}` on the div. Valid values: `top`, `center`, `bottom`. The class must be present when the attribute is set — its absence passes Tier 1 but fails Tier 3.

```html
<!-- wp:column {"verticalAlignment":"center","width":"45%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:45%"><!-- wp:paragraph -->
<p>Vertically centred column content.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
```

---

## Cover block

### Cover with parallax and gradient overlay
The cover block produces two child elements before the `inner-container`: the image background div (with `has-parallax` class and `background-image` in its inline style) and the overlay `<span>`. Both must be present in the correct order.

```html
<!-- wp:cover {"url":"https://example.com/photo.jpg","id":46,"hasParallax":true,"dimRatio":80,"customGradient":"linear-gradient(180deg,rgb(0,0,0) 0%,rgb(50,50,50) 100%)","sizeSlug":"large","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-cover has-parallax" style="padding-top:var(--wp--preset--spacing--70);padding-bottom:var(--wp--preset--spacing--70)"><div class="wp-block-cover__image-background wp-image-46 size-large has-parallax" style="background-position:50% 50%;background-image:url(https://example.com/photo.jpg)"></div><span aria-hidden="true" class="wp-block-cover__background has-background-dim-80 has-background-dim wp-block-cover__gradient-background has-background-gradient" style="background:linear-gradient(180deg,rgb(0,0,0) 0%,rgb(50,50,50) 100%)"></span><div class="wp-block-cover__inner-container"><!-- wp:paragraph -->
<p>Cover content.</p>
<!-- /wp:paragraph --></div></div>
<!-- /wp:cover -->
```

---

## Other blocks

### File
```html
<!-- wp:file {"id":77,"href":"https://example.com/wp-content/uploads/doc.pdf"} -->
<div class="wp-block-file"><a id="wp-block-file--media-UID" href="https://example.com/wp-content/uploads/doc.pdf">doc.pdf</a><a href="https://example.com/wp-content/uploads/doc.pdf" class="wp-block-file__button wp-element-button" download aria-describedby="wp-block-file--media-UID">Download</a></div>
<!-- /wp:file -->
```

### Bulleted list
```html
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>First item</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Second item</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
```

### Preformatted
```html
<!-- wp:preformatted -->
<pre class="wp-block-preformatted">Pre-formatted text.</pre>
<!-- /wp:preformatted -->
```

### Separator
```html
<!-- wp:separator /-->
```

### Details
`core/details` has highly specific `save()` output constraints that will cause validation errors if guessed:
- Boolean HTML attributes must be used (`open`, not `open=""`).
- Inline styles are minified with no spaces after colons (e.g., `border-width:1px;padding-top:2px`).
- The `<details>` tag is the wrapper; the `<summary>` tag is a direct child with no wrapper.
- The closing `</details>` tag must immediately follow the last inner block's closing comment with **no newline**.

```html
<!-- wp:details {"showContent":true,"style":{"border":{"width":"1px"},"spacing":{"padding":{"top":"2px"}}}} -->
<details class="wp-block-details" open style="border-width:1px;padding-top:2px"><summary>Summary text</summary><!-- wp:paragraph -->
<p>Hidden content</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details -->
```

### Dynamic block (no HTML body)
```html
<!-- wp:latest-posts {"postsToShow":3,"displayPostDate":true} /-->
```

---

## Attribute serialisation rules
When a block attribute is stored in the comment JSON vs parsed from HTML:

| Method | Stored where | Example |
|---|---|---|
| `attribute` source | HTML attribute | `src`, `href`, `alt` read from the tag |
| `html` source | HTML content | paragraph text, heading text |
| `text` source | HTML content (sanitised) | button label |
| `content` source | Inner HTML | rich text blocks |
| Everything else | Comment JSON | `id`, `level`, `sizeSlug`, `align`, `layout` etc. |

Only attributes that cannot be inferred from the HTML need to appear in the comment.
WordPress strips attributes from the comment if they match the block's default value —
so if `level` defaults to `2`, omit it from the comment for h2 headings.

---

## Inline style property ordering

Gutenberg's `save()` serialises inline style properties in a consistent order. Getting the order wrong produces a string that is byte-for-byte different from what `save()` generates, which **passes Tier 1 but fails Tier 3**. The general ordering rule across most blocks:

```
border-radius
border-{side}-color / border-{side}-width (per side: top, right, bottom, left)
padding-top / padding-right / padding-bottom / padding-left
margin-top / margin-right / margin-bottom / margin-left
font-size   ← always before font-weight when both are present
font-weight
background-color
color
```

When uncertain about order for a specific block and attribute combination, use the Tier 3 workflow: insert a draft, load the editor, run `wp.blocks.getBlockType('core/button').save(...)` or inspect `btn.validationIssues[0].args` to see exactly what `save()` produces and what was stored.

---

## Classic block (legacy)
Unstructured HTML from the Classic Editor. Avoid generating new content in this format —
use proper block markup instead. Only used when migrating legacy content.
```html
<!-- wp:freeform -->
<p>Legacy HTML content here.</p>
<!-- /wp:freeform -->
```
