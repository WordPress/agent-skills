# Logging and debugging output

There's no local filesystem to tail a log file on (see `file-system-and-media.md` — the web tier is read-only outside `/tmp/`). VIP's logging surfaces replace that workflow.

## Runtime Logs

`error_log()` calls, and PHP fatals/warnings/notices (per the application's configured `error_reporting` level), are aggregated into **Runtime Logs** — a near-real-time view of recent application log output from web containers.

- View in the VIP Dashboard's Runtime Logs panel, or retrieve via VIP-CLI: `vip logs` (see `local-development-and-cli.md`).
- `vip logs` returns up to the ~500 most recent entries — it's for recent/live debugging, not long-term log storage or historical analysis.
- If you need to search/aggregate logs over a longer window or ship them elsewhere, see Log Shipping below — don't assume you can just `grep` a file on disk.

## Slow Query Logs

Queries that take an unusually long time to execute are captured in **Slow Query Logs** (up to the 100 most recent, in the VIP Dashboard's Slow Query Logs panel, or via VIP-CLI `vip slowlogs`). Use this as the starting point for "why is this endpoint slow" instead of guessing at which query is the culprit — see `wp-performance` for the general profiling workflow once you have a candidate query.

## Log Shipping (longer-term / external analysis)

For retention or analysis beyond what Runtime/Slow Query Logs keep in-dashboard, **Log Shipping** ships selected log types (JSON, batched by size/time) to a customer-configured cloud storage bucket (AWS S3, Google Cloud Storage, or Azure Blob Storage). This is a VIP Dashboard configuration step (App admin/Org admin role required) — not something application code sets up.

## Guardrails

- Never suggest writing application logs to a file path — the filesystem is read-only outside `/tmp/`, and even `/tmp/` isn't shared across containers or requests.
- `error_log()` is still the right function to call in code — it's the *destination* (Runtime Logs, not a local file) that differs from a typical host.
- Don't reach for `var_dump`/`print_r` output left in production code as a debugging strategy — it'll pollute responses; use Runtime Logs via `error_log()` instead, and remove debug output before shipping.

## Source

- https://docs.wpvip.com/logs/
- https://docs.wpvip.com/logs/runtime-logs/
- https://docs.wpvip.com/logs/slow-query/
- https://docs.wpvip.com/vip-cli/commands/slowlogs/
- https://docs.wpvip.com/logs/log-shipping/
