# Safety + snapshots

Respira's edit pipeline is built on three guarantees the agent should always honor.

## 1. Duplicate before edit

For any non-trivial change, call `respira_create_page_duplicate` (or `respira_create_post_duplicate`) **before** any write. Apply edits to the duplicate. Surface the duplicate URL to the user; let them publish or discard.

When to skip the duplicate:

- Single-field updates the user explicitly asked to "publish directly" (typo fixes, broken-link patches).
- Site-config changes that don't have a publishable surface (option updates, plugin activations).

For everything else: duplicate first.

## 2. Automatic snapshots

Every write through Respira creates an immutable snapshot. The response payload includes `snapshot_id` and `approval_url`. The agent should:

- Echo the `snapshot_id` in its reply so the user has a one-line undo handle.
- Surface the `approval_url` as a clickable link.
- Use `respira_diff_snapshots` to show the user what changed if they ask.

To revert: `respira_restore_snapshot({ snapshot_id })`. Restoration is itself snapshotted, so undoing the undo is also one call away.

## 3. Dry-run for bulk + destructive operations

Tools that touch many records support `dry_run: true`:

- `respira_bulk_pages_operation`
- `respira_update_media_batch`
- `respira_apply_accessibility_fixes`

Always run with `dry_run: true` first, present the preview to the user, then run again with `dry_run: false` only after explicit confirmation.

## Permission scope

The MCP token (`WORDPRESS_API_KEY`) is bound to a specific `(license, site_url)` pair via Respira's cloud. It cannot be used on undeclared domains — the validator at `/api/license/validate` rejects any site_url not registered in the Respira dashboard.

Practical implication: if the agent is asked to act on a site whose URL isn't in the user's connected-sites list, the tool calls will fail with `domain_mismatch`. The fix is dashboard-side, not agent-side. Direct the user to `https://www.respira.press/dashboard/mcp` to register the new site, then retry.

## Audit trail

Every tool invocation logs to `usage_stats` (per-user, per-site, per-tool, with content_length and response_status). The user can inspect activity at `https://www.respira.press/dashboard`. The agent does not need to log anything separately — Respira's pipeline records it automatically.
