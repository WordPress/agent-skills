# Cron on VIP

**`wp-cron.php` is disabled for every site on WordPress VIP.** Cron is instead managed by Automattic's **Cron Control** plugin, which stores and runs events from an optimized database table designed for the highly concurrent query load VIP sites see.

## What stays the same

- Register events the normal way: `wp_schedule_event()`, `wp_schedule_single_event()`, hooked callbacks via `add_action()`.
- Core cron APIs (`wp_next_scheduled()`, `wp_clear_scheduled_hook()`, etc.) work as expected.

## What's different

- There is no `wp-cron.php` request triggering execution on page load — don't debug by looking for that request or trying to hit the endpoint directly.
- Events run out of Cron Control's own table/queue, which is built for concurrency and scale rather than the default single-site cron table.
- Debugging tooling and timing characteristics differ from a non-VIP host: check Cron Control's own event listing/status rather than assuming default wp-cron behavior (spawn on request, `DOING_CRON` timing, etc. still apply conceptually, but the trigger mechanism is Cron Control, not an HTTP hit to `wp-cron.php`).

## Don't confuse this with Cavalcade

Cavalcade (from Human Made) is a *different* cron replacement system used on Altis, not VIP. If you see references to Cavalcade in generic WordPress cron advice, it doesn't apply here — VIP uses Cron Control.

## Failure modes

- "My scheduled event never fires" on VIP but works locally — confirm the event is actually registered (not silently failing to schedule), then check Cron Control's event status rather than assuming a wp-cron HTTP trigger is missing.
- Heavy/expensive cron jobs — same guidance as generic WordPress performance work (batch, avoid duplicate near-simultaneous events, keep single-run cost bounded); see `wp-performance` → `references/cron.md` for the general optimization angle. This file is about VIP's execution model specifically.

## Source

- https://docs.wpvip.com/wordpress-on-vip/cron-control/
- https://learn.wpvip.com/lesson/wp-cron/
