# Upstream sync (automation plan)

Goal: when upstream changes (WordPress core releases, Gutenberg releases, docs updates), the repo should **regenerate indexes** and (eventually) **open PRs** that update affected skills/references.

## What to automate first (low risk)

1. **Indexes and matrices**
   - WordPress core version list (latest stable + recent).
   - Gutenberg releases list (latest stable + recent).
   - WordPress ↔ Gutenberg mapping table (derived from canonical docs where available).
2. **Routing metadata refresh**
   - Update `shared/references/*.json` files only.

This keeps automation deterministic and reviewable before it starts rewriting skill prose.

## Later automation (higher risk)

- “Reference chunk regeneration” from upstream docs into `skills/*/references/*.md`.
- Task-shaped deltas (e.g. a new Gutenberg package, new block APIs, changes in theme.json schema).
- Semi-automated PRs that include:
  - regenerated references
  - updated checklists
  - updated eval scenarios

## Scripts

- `shared/scripts/update-upstream-indices.mjs`
  - Fetches upstream sources and rewrites JSON indexes in `shared/references/`.
  - Covers WordPress core versions, Gutenberg releases, WordPress/ai (canonical AI plugin) releases, and the WP↔Gutenberg mapping.
- `shared/scripts/check-upstream-drift.mjs`
  - Offline check (run by `eval/harness/run.mjs` and therefore CI): compares the committed release indexes against the canonical release each skill declares (e.g. the `current canonical release: vX.Y.Z` marker in `skills/wp-ai-plugin/SKILL.md`).
  - When the Upstream Sync workflow's refresh PR lands a newer release, CI turns red until the affected skill is re-synced against the tagged source and its marker is bumped. This converts "someone notices the skill is stale" into a forced, reviewable follow-up.

## CI / PR bot design (recommended)

- Schedule a workflow (daily/weekly).
- Run `shared/scripts/update-upstream-indices.mjs`.
- If `git diff` is non-empty, open a PR with:
  - a summary of changes
  - links to upstream release notes
  - a checklist for human review (“does this impact blocks/themes/plugin workflows?”)

## Validation

- Always run `node eval/harness/run.mjs`.
- Optional: use Agent Skills reference validator:
  - `skills-ref validate skills/<skill-name>`

The updater is transactional with respect to parsing: it fetches and normalizes all three sources before writing any index. If the canonical WordPress/Gutenberg mapping cannot be parsed into at least one row, the command exits non-zero and preserves the checked-in indexes. Never accept `table-not-found` or an empty `rows` array as a successful refresh.

## Canonical sources

The automation should prefer canonical sources and avoid scraping where possible.

- WordPress core releases and API endpoints (official WordPress APIs)
- Gutenberg releases (GitHub releases)
- WordPress developer docs (used for the WP↔Gutenberg mapping when no API exists)

