# Database backups, export, and migration

## Backup cadence (see also `security-and-access-controls.md`)

Production databases (including custom tables) back up **hourly**; non-production databases back up **daily**. This is automatic and platform-managed — application code has no role in triggering routine backups.

## Exporting a backup (getting data out)

- `vip export sql` downloads the most recent database backup for an environment to the local machine.
- Add `--generate-backup` to force a fresh backup to be generated first, then downloaded — use this when the most recent automatic backup isn't recent enough for what you're doing (e.g., you need a snapshot from right now, not from up to an hour ago).
- Generating/exporting a backup requires at least an **Org admin** or **App write** role — this isn't available to every team member by default.

## Migrating a site's data onto or off VIP

- **Onto VIP**: the source (non-VIP) site's database has to be exported as a SQL file — typically via `wp db export` on that site — before it can be imported into a VIP environment. Plan for the same restricted-function/filesystem differences (`restricted-functions-and-code-review.md`, `file-system-and-media.md`) to apply once content lands on VIP; a migration isn't done when the DB import finishes.
- **Off VIP / to another environment**: use `vip export sql` as above; the resulting SQL file is a normal WordPress database export and can be imported anywhere.
- Don't propose direct database-to-database replication/connection between a VIP environment and an external host — go through an export/import cycle.

## Database Backup Shipping

For teams that want backups retained outside the VIP Dashboard's own retention window, **Database Backup Shipping** ships backup files to a customer-configured cloud storage bucket (AWS S3, Google Cloud Storage, or Azure Blob Storage) — the same underlying mechanism as HTTP request Log Shipping (`logging.md`). This is VIP Dashboard configuration (App admin/Org admin role), not something triggered from application code.

## Guardrails

- Never suggest a custom cron job or plugin that dumps the database to a file on the web tier as a "backup" — the filesystem is read-only outside `/tmp/` (`file-system-and-media.md`), and it would duplicate a feature the platform already provides more reliably.
- If someone needs to restore from a backup rather than just export one, that's a VIP Support / VIP Dashboard operation — don't attempt it via direct SQL manipulation from application code.

## Source

- https://docs.wpvip.com/databases/backups/access/
- https://docs.wpvip.com/databases/export-a-file-for-migration/
- https://docs.wpvip.com/databases/backups/database-backup-shipping/
