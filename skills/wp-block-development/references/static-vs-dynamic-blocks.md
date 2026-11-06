# Static vs dynamic blocks

Use this file when deciding whether a new block should save its markup to the database (static) or render on the server at request time (dynamic).

## Decision checklist

Ask these questions in order — the first YES wins:

1. Does the block depend on data outside its own attributes (latest posts, user info, site options, database queries)?
   → **Dynamic.**

2. Will the block's markup likely change over time (design updates, bug fixes, accessibility improvements)?
   → **Dynamic.** Static blocks freeze markup in the database; updating it later requires deprecations and manual re-saves.

3. Will the block use the Interactivity API?
   → **Dynamic.** Hydration requires server-rendered HTML to match the current code. Stale markup stored by a static block can cause mismatches.

4. Is the block part of Block Themes (templates, template parts, theme blocks)?
   → **Dynamic.** Block themes replace PHP themes, which are architecturally server-rendered.

5. Does the block need server-side capabilities (WordPress hooks/filters, authenticated data, PHP APIs)?
   → **Dynamic.**

6. Is content portability to non-WordPress systems critical (CMS migration, raw HTML export)?
   → **Static.** Static blocks store self-contained HTML that works outside WordPress without a PHP renderer.

7. Is the block simple, purely presentational, and unlikely to change (a styled quote, a separator, a callout)?
   → **Static** is fine — you avoid writing PHP entirely.

When in doubt → **default to dynamic.** The cost of choosing static and needing dynamic later (rewriting, deprecation chains) is higher than starting dynamic. Dynamic blocks keep markup fresh, avoid the deprecation treadmill, and align with the direction of WordPress (Block Themes, Interactivity API).

## Key differences at a glance

- **Static**: `save()` produces HTML → stored in `post_content` → served as-is. Changing `save()` later requires `deprecated` entries or every post must be re-saved.
- **Dynamic**: attributes stored in `post_content` → PHP `render` file (or `render_callback`) produces HTML at request time. Change the render function freely — no deprecations needed.
