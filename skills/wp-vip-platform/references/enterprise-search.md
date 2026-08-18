# Enterprise Search (Elasticsearch)

Enterprise Search is VIP's Elasticsearch-based search and query-offloading solution. It's an **Integration** — it has to be added to the organization and then activated per-application/environment in the VIP Dashboard before any code changes matter.

## How it works

- Content changes (publish/update) fire action hooks that identify what changed and queue it for indexing.
- Elasticsearch runs as its own environment/data store; WordPress talks to it via REST API calls rather than local DB queries for search-powered requests.
- Under the hood: a VIP fork of **ElasticPress** provides indexing/search, and a fork of **es-wp-query** provides query offloading (routing `WP_Query` calls to Elasticsearch instead of MySQL where configured) via an Enterprise Search adapter.

## What you actually do in code

- Don't hand-roll Elasticsearch queries against the cluster directly — go through the ElasticPress-based APIs Enterprise Search provides.
- After activation, an index has to be created for the site's content via VIP-CLI before search/query-offloading will return results.
- If a query needs to be excluded from ES offloading (e.g. it depends on DB-only semantics), that's a per-query decision using the adapter's controls — don't assume every `WP_Query` is safe to offload automatically.

## What this skill does NOT cover

- Activating the Enterprise Search integration itself (VIP Dashboard / VIP Support territory — see `SKILL.md` → Escalation).
- Generic Elasticsearch operations/cluster administration outside the VIP-provided integration.

## Local development

Enterprise Search can be exercised in a VIP Local Development Environment (`vip dev-env`) — the `elasticsearch` service is one of the services `vip dev-env create` provisions. See `local-development-and-cli.md`.

## Source

- https://docs.wpvip.com/enterprise-search/
- https://docs.wpvip.com/enterprise-search/enable/
- https://docs.wpvip.com/vip-local-development-environment/use-enterprise-search/
