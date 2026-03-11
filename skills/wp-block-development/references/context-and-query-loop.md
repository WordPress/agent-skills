# Block context and Query Loop

Use this file when your block reads per-post data (content, meta, title, excerpt, etc.) and must work inside Query Loop as well as standalone.

## Canonical references

- Block context: https://developer.wordpress.org/block-editor/reference-guides/block-api/block-context/
- Query Loop block: https://developer.wordpress.org/block-editor/reference-guides/core-blocks/#query-loop
- Entity records: https://developer.wordpress.org/block-editor/reference-guides/packages/packages-core-data/

## How block context works

Blocks declare the context they consume via `usesContext` and the context they provide via `providesContext` in `block.json`.

Query Loop (`core/post-template`) provides `postId` and `postType` to every inner block. When your block declares `usesContext: ["postId", "postType"]`, WordPress passes those values automatically.

### block.json example

```json
{
  "usesContext": [ "postId", "postType" ]
}
```

No `providesContext` is needed unless your block in turn passes data to its own inner blocks.

## Editor pattern (edit.js)

Consume the `context` prop and use `getEditedEntityRecord` from the `core` store to fetch post data that reflects unsaved edits:

```js
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { useBlockProps } from '@wordpress/block-editor';

export default function Edit( { context } ) {
  const { postId, postType } = context;

  const post = useSelect(
    ( select ) =>
      postId
        ? select( coreStore ).getEditedEntityRecord( 'postType', postType, postId )
        : undefined,
    [ postId, postType ]
  );

  const blockProps = useBlockProps();

  if ( ! post ) {
    return <div { ...blockProps }>{ /* placeholder or spinner */ }</div>;
  }

  return (
    <div { ...blockProps }>
      { /* render using post.title, post.meta, etc. */ }
    </div>
  );
}
```

Key points:

- `context.postId` is `undefined` when the block is used standalone outside Query Loop. Handle this case (e.g., fall back to the current post via `select( 'core/editor' ).getCurrentPostId()`).
- Always pass `[ postId, postType ]` as the dependency array for `useSelect`.

## Render pattern (render.php)

Access context via `$block->context` and fall back to `get_the_ID()` for standalone use:

```php
$post_id = isset( $block->context['postId'] )
    ? (int) $block->context['postId']
    : get_the_ID();
```

- Cast to `int` to avoid type issues downstream.
- `get_the_ID()` returns the correct post ID when the block is placed directly in a template or post content outside Query Loop.

## Antipattern: using `core/editor` store in context-aware blocks

Do **not** use `select( 'core/editor' ).getEditedPostContent()` or similar `core/editor` selectors to fetch post data when the block declares `usesContext`. The `core/editor` store always returns data for the *top-level post being edited*, not the iterated post inside Query Loop. This causes every loop iteration to display the same (wrong) data.

Use `select( 'core' ).getEditedEntityRecord()` with the context-provided `postId` and `postType` instead.

## Verification

Test both scenarios:

1. **Standalone:** Insert the block directly in a post or page. Confirm it reads data from that post.
2. **Query Loop:** Insert the block inside a Query Loop block (e.g., in a template or a post that contains a Query Loop). Confirm each iteration shows data for its respective post, not the parent post.

## Common blocks that need this pattern

Any block that displays per-post data should declare `usesContext` and follow the patterns above. Examples:

- Reading time estimate
- Author bio / avatar
- Share count
- Custom field display (post meta)
- Excerpt derivatives (truncated content, summary)
- Related post metadata (publish date, categories, tags)
