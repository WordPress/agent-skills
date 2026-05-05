# Builder routing

`respira_get_builder_info` returns one of these `builder` slugs. Pick tools accordingly.

| Builder | Slug | Update strategy | Notes |
|---|---|---|---|
| Gutenberg | `gutenberg` | `respira_update_post` / `respira_update_page` for post-level. `respira_update_element` for blocks. `respira_extract_builder_content` returns block-tree JSON. | First-class. Native block tree. |
| Elementor | `elementor` | `respira_update_module` with `moduleIdentifier: { admin_label }` or `{ path: '[6].elements[1]' }`. Path-based is the most reliable. | First-class. ~50 widget types covered. |
| Divi 4 | `divi` | `respira_update_module` with `moduleIdentifier`. `respira_inject_builder_content` requires `diviVersion: '4'`. | First-class. |
| Divi 5 | `divi-5` | Same as Divi 4 but `diviVersion: '5'`. Module slugs differ — check `respira_get_builder_info` first. | First-class. v6.8.0 audit fixed five long-standing slug mismatches; safe for production. |
| Bricks | `bricks` | `respira_update_element` works at element level. `respira_extract_builder_content` returns Bricks JSON. | First-class. Deep intelligence shipped in v5.4. |
| Beaver Builder | `beaver` | `respira_update_module` for single-module edits. | First-class. |
| Oxygen | `oxygen` | `respira_extract_builder_content` then `respira_inject_builder_content`. | Partial — extract / inject only, no surgical update yet. |
| Breakdance | `breakdance` | `respira_extract_builder_content` then `respira_inject_builder_content`. | Partial. v6.9 canonical-tree-shape work in flight. |
| WPBakery | `wpbakery` | Full extract / inject. | Partial. |
| Brizy | `brizy` | Full extract / inject. | Partial. |
| Thrive Architect | `thrivearchitect` | Full extract / inject. | Partial. |
| Visual Composer | `visualcomposer` | Full extract / inject. | Partial. |
| Flatsome UX Builder | `flatsome` | Full extract / inject. | First-class for WooCommerce themes. |

## Decision tree

```
Does the builder's row above say "First-class"?
├─ Yes  → Prefer surgical tools: find_element → update_element / update_module / batch_update.
└─ No   → Use extract → modify in JSON → inject. Always wrap the edit in respira_create_page_duplicate first.
```

## Universal fallbacks

These work regardless of builder:

- `respira_update_post` / `respira_update_page` — post-level fields (title, slug, status, meta, featured image).
- `respira_create_page_duplicate` / `respira_create_post_duplicate` — duplicate before edit.
- `respira_list_snapshots` / `respira_restore_snapshot` — undo.

## Builder detection edge cases

- **Multiple builders detected** (legacy migrations): `respira_get_builder_info` returns a `builders` array sorted by signal strength. Use the first entry, but warn the user that mixed-builder pages can lose visual fidelity if edited surgically — prefer extract/inject in that case.
- **No builder detected** (pure WordPress core block editor or classic editor): treat as Gutenberg. Use core-level update tools.
- **Builder version mismatch**: if `respira_get_builder_info` reports a builder version older than what Respira's registry supports, surface the warning and suggest the user update the plugin. Edits may still work but module slugs may have drifted.
