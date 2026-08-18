# Databases: HyperDB, replica lag, and custom tables

## Read/write splitting

VIP uses Automattic's **HyperDB** as the `db.php` drop-in: writes go to the environment's master database, reads are distributed across replicas. This is transparent to normal `$wpdb`/`WP_Query` usage — you don't opt into it, it's just how the platform works.

**No other `db.php` drop-in is permitted on the platform.** Don't suggest installing a different DB abstraction/drop-in to solve a database problem — solve it within HyperDB's model or via caching (`caching.md`) instead.

## The replica-lag gotcha

Because reads and writes can land on different database servers, there's a small window where a replica hasn't caught up to a write yet. The classic failure:

```php
$wpdb->insert( $wpdb->prefix . 'my_table', $data );
$row = $wpdb->get_row( "SELECT * FROM {$wpdb->prefix}my_table WHERE id = {$wpdb->insert_id}" );
// $row can come back empty/stale if this SELECT hit a lagging replica
```

HyperDB has its own lag-awareness (it tracks recent writes on a connection and can prefer the master to avoid handing back stale data), but **don't rely on that as a substitute for correct code**. When a request logically needs to read back something it just wrote:

- Read the value you just wrote from the variables/data you already have in memory, rather than re-querying.
- If you must re-query, be aware the result can be stale immediately after a write in the same request or in a fast-follow request (e.g., an AJAX call right after a form submit).
- Don't "fix" apparent staleness by adding `sleep()` or retry loops — treat it as a data-flow problem (avoid the unnecessary re-read) rather than a timing problem to paper over.

## Custom tables

Custom tables are allowed, with caution:

- Create/update them with `dbDelta()` as part of a proper upgrade routine (activation hook + a versioned migration path), not an ad hoc `CREATE TABLE` on every request.
- Do a real pass on schema and indexes *before* shipping — match indexes to the actual queries the code runs, not just the primary key.
- Add caching (object cache) on top of custom-table queries where it makes sense, same as any other expensive query.

## What this means for review/advice

- A function that reads immediately after writing the same data is a candidate for a replica-lag bug — call it out even if nothing is visibly broken yet.
- Don't propose a custom `db.php` drop-in, a different ORM's connection layer, or bypassing `$wpdb`/HyperDB to "fix" a database performance problem.
- For query-level performance work (slow queries, missing indexes, `SAVEQUERIES`), see `logging.md` for how to actually find the slow queries on VIP, and `wp-performance` for the general optimization approach.

## Source

- https://docs.wpvip.com/databases/
- https://docs.wpvip.com/databases/custom-tables/
- https://docs.wpvip.com/wordpress-on-vip/drop-ins/
