# Core Block Markup Reference  
Exact `save()` output signatures for commonly used WordPress core blocks.
All examples use WordPress 6.5+ output. Load this file when the golden
standards in SKILL.md do not cover the specific block or attribute combination
you need [1].  

---

## Table of contents  
- Text blocks: paragraph, heading, list, preformatted
- Media blocks: image, file
- Design blocks: separator, buttons, group, columns, details
- Embed / dynamic blocks: latest-posts

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

### Image (with ID and size)
```html
<!-- wp:image {"id":42,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://example.com/wp-content/uploads/photo.jpg" alt="Alt text" class="wp-image-42"/></figure>
<!-- /wp:image -->
```

### Image (with link to media file)
```html
<!-- wp:image {"id":42,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://example.com/wp-content/uploads/photo.jpg"><img src="https://example.com/wp-content/uploads/photo-1024x768.jpg" alt="" class="wp-image-42"/></a></figure>
<!-- /wp:image -->
```

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

### Group with inner paragraph
```html
<!-- wp:group {"tagName":"div","layout":{"type":"constrained"}} -->
<div class="wp-block-group"><!-- wp:paragraph -->
<p>Content inside a group.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
```

### Columns (two equal columns)
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

### Button
```html
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://example.com">Click here</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
```

### Separator
```html
<!-- wp:separator /-->
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

## Classic block (legacy)  
Unstructured HTML from the Classic Editor. Avoid generating new content in this format —
use proper block markup instead. Only used when migrating legacy content.
```html
<!-- wp:freeform -->
<p>Legacy HTML content here.</p>
<!-- /wp:freeform -->
```