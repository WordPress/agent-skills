# Common workflows

Recipes for the patterns that appear most often. Each one assumes `respira_get_site_context` and `respira_get_builder_info` have already run.

## 1. Targeted text edit (e.g. "shorten the homepage hero headline")

```js
// Locate
const matches = await respira_find_element({
  pageId: 12,
  query: 'class:elementor-heading-title',
  limit: 5,
});

// Update the first match in place
await respira_update_element({
  builder: 'elementor',
  pageId: 12,
  moduleIdentifier: { id: matches[0].id },
  updates: { content: 'A shorter, sharper headline.' },
});
```

## 2. Multiple edits on one page (e.g. "swap testimonial copy in 4 places")

```js
await respira_batch_update({
  builder: 'divi',
  pageId: 87,
  updates: [
    { moduleIdentifier: { admin_label: 'Quote-1' }, updates: { quote: 'New copy 1' } },
    { moduleIdentifier: { admin_label: 'Quote-2' }, updates: { quote: 'New copy 2' } },
    { moduleIdentifier: { admin_label: 'Quote-3' }, updates: { quote: 'New copy 3' } },
    { moduleIdentifier: { admin_label: 'Quote-4' }, updates: { quote: 'New copy 4' } },
  ],
});
```

`batch_update` is atomic — all updates land or none do. Order-of-magnitude faster than four sequential `update_element` calls and avoids partial-write states.

## 3. Add a new section from a structured spec

```js
// Optional: duplicate first if the page is published
const dup = await respira_create_page_duplicate({ pageId: 12 });

await respira_inject_builder_content({
  builder: 'elementor',
  pageId: dup.duplicate_id,
  position: 'after',
  anchor: { admin_label: 'Hero' },
  content: {
    type: 'section',
    children: [
      { type: 'heading', text: 'Why teams choose us' },
      { type: 'text', html: '<p>Three reasons, in plain language.</p>' },
      { type: 'columns', count: 3, children: [/* ... */] },
    ],
  },
});
```

Surface `dup.preview_url` to the user. Promote with `respira_update_page({ pageId: dup.duplicate_id, status: 'publish' })` after their approval.

## 4. HTML to native builder (e.g. Claude generated a landing page in HTML)

```js
const builderJson = await respira_convert_html_to_builder({
  html: '<section><h1>...</h1><p>...</p></section>',
  builder: 'divi',
  diviVersion: '5',
});

const newPage = await respira_build_page({
  title: 'Barbershop landing',
  builder: 'divi',
  diviVersion: '5',
  content: builderJson,
  status: 'draft',
});
```

`build_page` returns `{ pageId, edit_url, preview_url }`. The user reviews + publishes from the WordPress admin or from `respira_update_page`.

## 5. Audit, then fix

```js
// Score the page
const seo = await respira_analyze_seo({ pageId: 12 });
const a11y = await respira_scan_page_accessibility({ pageId: 12 });
const images = await respira_analyze_images({ pageId: 12 });

// Apply targeted fixes
if (images.missing_alt.length) {
  await respira_update_media_batch({
    updates: images.missing_alt.map(m => ({ id: m.id, alt: m.suggested_alt })),
  });
}

if (seo.missing_meta_description) {
  await respira_update_page({
    pageId: 12,
    meta: { description: seo.suggested_meta_description },
  });
}
```

Re-run the matching analysis tool after the fix and report the score delta.

## 6. Multi-site rollout (agency)

```js
const sites = await respira_list_sites();
for (const s of sites.sites) {
  await respira_switch_site({ site_id: s.id });
  // Apply the change pattern from #2 against the same page slug on every site
  const target = (await respira_list_pages({ search: 'pricing' })).pages[0];
  if (!target) continue;
  await respira_batch_update({ /* ... */ });
}
```

## 7. Migrate one builder to another

This is its own multi-step skill. Respira ships dedicated migration skills at `https://github.com/respira-press/claude-skills-wordpress`:

- `migrate-elementor-to-gutenberg`, `migrate-elementor-to-bricks`, `migrate-elementor-to-breakdance`, `migrate-elementor-to-oxygen`
- `migrate-divi-to-gutenberg`, `migrate-divi-to-bricks`, `migrate-divi-to-breakdance`
- `migrate-beaver-builder-to-gutenberg`, `migrate-beaver-builder-to-bricks`
- `migrate-oxygen-to-bricks`, `migrate-oxygen-to-breakdance`
- `migrate-wpbakery-to-gutenberg`, `migrate-wpbakery-to-bricks`
- `migrate-thrive-architect-to-gutenberg`
- `migrate-visual-composer-to-gutenberg`
- `migrate-brizy-to-gutenberg`

Recommend the matching skill, then run this `respira-mcp` skill alongside it as the execution layer.
