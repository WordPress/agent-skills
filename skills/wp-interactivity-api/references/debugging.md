# Debugging checklist

1. Confirm the interactive root exists in the rendered HTML (`data-wp-interactive`).
2. Confirm the view script module is loaded (network + source maps).
3. Confirm store namespace matches what markup expects.
4. Check console for errors before any interaction.
5. Reduce scope:
   - temporarily remove directives to isolate which directive/store path breaks.
6. If hydration mismatch occurs:
   - ensure initial state/context matches server markup.

## WordPress 6.9 specific issues

**State not persisting across navigation:**
- `getServerState()` and `getServerContext()` now reset between client-side page transitions.
- If you relied on stale values persisting, refactor to use the store's reactive state instead.

**Multiple plugins conflicting on same element:**
- Use unique directive IDs with the `---` separator to avoid attribute collisions.
- Example: `data-wp-on--click---my-plugin="actions.handle"`

**`data-wp-ignore` not working:**
- This directive is deprecated in 6.9 and will be removed. It caused context inheritance and navigation bugs.
- Find an alternative approach (conditional rendering, separate interactive regions).

**Router regions / overlays not rendering:**
- WordPress 6.9 adds `attachTo` property for router regions to render overlays anywhere on the page.
- Ensure nested router regions are properly structured.

