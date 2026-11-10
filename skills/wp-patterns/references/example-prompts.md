# Example Prompts

## Hero Section

> "Create a bold hero pattern with a large heading, subtitle, and two CTA buttons. Dark background, full-width, for a creative agency theme."

Expected: Cover or Group block with contrast bg, constrained inner, heading with xx-large + heading font, paragraph with secondary color, Buttons with primary + outline styles.

## Testimonial Grid

> "Create a 3-column testimonial grid with avatar, quote, name, and role. Alternating card backgrounds."

Expected: Group wrapper, block-native grid or Columns layout (3 columns, responsive), inner Group cards with varied tertiary/base backgrounds, Image block for avatar (rounded border-radius), Paragraph for quote (italic), Heading h3 for name, Paragraph small for role.

## Blog Post Listing

> "Create a starter page pattern for a blog index with featured post hero and 3-column grid of recent posts below."

Expected: `Block Types: core/post-content` header, Query Loop for featured post (perPage 1, large layout), second Query Loop for grid (perPage 3, grid layout with post-template), clear visual separation between sections.

## Footer with Columns

> "Create a 4-column footer pattern with logo, navigation links, contact info, and social icons. Dark background."

Expected: `Block Types: core/template-part/footer` header, Group full-width with contrast bg, Columns (4), Site Logo block, Navigation or list blocks, Paragraph blocks for contact, Social Icons block. `Inserter: no`.
