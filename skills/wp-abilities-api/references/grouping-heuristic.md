# Grouping heuristic — domain-layer granularity

How to decide WHAT to register when a plugin already has a REST (or internal service) surface. The hard part of adopting the Abilities API is not the registration syntax — it's picking the right *domain-layer granularity* so abilities map to user-meaningful actions instead of HTTP plumbing.

> **Scope note.** This reference governs *domain-layer* decisions: how many abilities to register, where to put filters vs. where to introduce a new ability name. It does NOT govern projection-layer choices (flat-with-full-schemas vs single-tool facade vs nested-discovery vs semantic grouping in the consumer view). Those are separate decisions made *after* the domain layer is settled — see `domain-vs-projection.md` for the layering. A domain layer chosen well is reusable across multiple projections; conflating the two means re-registering every time a consumer's constraints change.

## Three observed approaches

| Approach | Shape | Example | Verdict (domain-layer) |
|---|---|---|---|
| **Action-bundle** | One ability bundles many sub-operations behind an action string. | `my_plugin_account` with `action: "get" \| "update" \| "delete"`. | **Avoid.** Hides the ability surface from the agent's tool-list and defeats the Abilities API's introspection model — agents can't see what a bundle can do until they invoke it. |
| **REST-atomization** | One ability per HTTP method per resource (typically 5 per resource: list, get, create, update, delete). | `orders-list`, `orders-get`, `orders-create`, `orders-update`, `orders-delete`. | **Avoid as the registration shape.** Couples ability names to HTTP plumbing rather than user intent — and forces re-registration if the projection layer ever needs to compress the surface. |
| **Semantic-intent** | One ability per real-world question or state transition. Filter parameters in `input_schema` collapse N variants into 1. | One `feedback/get-responses` ability with `status`, `is_unread`, `search`, and date-range filters in `input_schema` — replaces what would be 8+ atomized variants. | **Recommended for the domain layer.** |

## Why semantic-intent wins at the domain layer

1. **Users think in questions, not HTTP verbs.** "Which form responses are unread?" maps cleanly to one ability with an `is_unread` filter. It does NOT map to 8 abilities (`get-unread-responses`, `get-spam-responses`, `get-trashed-responses`, ...). Ability names are *use-case contracts* — see `./domain-vs-projection.md`.
2. **The Abilities API's `input_schema` is designed for rich inputs.** Enum constraints, date-time formats, and required-field validation do the variant-splitting job that atomization would delegate to the ability name.
3. **Writes stay narrow anyway.** A write ability should already be one state transition; atomization and semantic-intent converge for writes.
4. **Tool-list token cost is a downstream consequence, not the reason.** Semantic-intent registrations also serialize cheaper in flat MCP projections — but token cost is a *projection-layer* concern. If registrations are cheap by accident because the use-case framing happened to compress them, that's a happy side-effect; if they're expensive, the fix is at the projection layer (single-tool facade, nested-discovery), not by re-grouping the domain.

## Rules that make it work

### 1. Group reads by the question a user would type

Draft the question in plain English. That question is the ability. The filter parameters go in `input_schema`.

- WRONG: one ability per status value.
- RIGHT: one `get-<resource>` ability with `status: { type: "string", enum: [...] }`.

### 2. Keep writes narrow — one state transition per ability

A write ability should do exactly one thing the agent can reason about in isolation and explain to a user. Different state transitions → different abilities (different consequences, different annotations, different permission implications).

- WRONG: `update-resource` that branches internally on an action enum.
- RIGHT: `submit-evidence` and `close-resource` as separate abilities.

### 3. Prefer 1 ability with filter params over N abilities with no params

Ask: "if the backing added a new filter value, would that create a new ability?" If not, the filter belongs in `input_schema`, not in the ability name.

### 4. Zero-arg overview abilities are high-leverage

When enumerating the backing surface, specifically look for zero-argument aggregate or "overview" endpoints — "what's my balance?", "what's my next payout?", "what's my form response count?". These answer the highest-frequency user questions with zero input and zero room for agent error. Flag them even if they weren't in the original plan.

### 5. Don't ship abilities you can't explain in one sentence

Every ability's `label` + `description` should fit in an agent's tool-selection prompt. If you can't describe the ability in one sentence without "and", that's usually a sign it's two abilities.

## Worked example A — feedback/responses: 3 abilities for the whole responses surface

Consider a generic feedback or form-response plugin. Its admin screens expose: a list with 8+ filters, a detail view, bulk status changes (spam / trash / publish), read/unread toggles, and a count-by-status dashboard summary.

REST-atomization would ship ~6 abilities (list, get, delete, update, bulk-update, count). Semantic-intent registers **three**:

- `feedback/get-responses` — list/search, with `status`, `is_unread`, `search`, `before`, `after`, `parent` in `input_schema`.
- `feedback/update-response` — one write that covers status changes AND read-state toggles on a single response (semantically "modify a response").
- `feedback/get-status-counts` — the dashboard summary ability. Zero-arg-friendly (only optional filters).

Why three works: a user asking "show me spam responses from last week" uses one ability. An agent updating one response to `spam` uses one ability. The dashboard-style "how many unread?" uses one ability. The entire product surface fits in three tool-list entries.

## Worked example B — generic Tickets plugin: one ability with a status filter, not eight

A hypothetical `myplugin-tickets` plugin manages a support-ticket queue. Its REST endpoint `GET /myplugin/v1/tickets` accepts `status`, `priority`, `assigned_to`, `tag`, `date_before`, `date_after`, `search`. Status values include `new`, `triaged`, `in_progress`, `waiting_customer`, `waiting_internal`, `resolved`, `closed`, `reopened` — eight in total.

- Atomization would ship ~8 abilities (`get-tickets-new`, `get-tickets-resolved`, `get-tickets-closed`, ...).
- Semantic-intent ships **one** — `myplugin-tickets/get-tickets` with `status: { type: "string", enum: ["new", "triaged", "in_progress", "waiting_customer", "waiting_internal", "resolved", "closed", "reopened"] }`.

The user question "which tickets are waiting on the customer?" becomes one ability invocation with `status: "waiting_customer"`. The agent doesn't scan a list of 8 near-identical tool names; it scans one, and the enum documents what values are valid.

The same plugin also registers a zero-arg `myplugin-tickets/get-queue-summary` ability (open count + average response time + oldest unresolved) because "how is the queue today?" is the highest-frequency support-team question and the backing endpoint takes no arguments. That one ability has outsized value for one line of registration code — rule 4 in action.

## Escape hatch — when per-operation granularity is right (for reads)

Two cases where one-ability-per-operation IS appropriate on the read
side, despite the recommendation against REST-atomization for reads:

1. **Genuinely different permission models.** If `list-<resource>` and `search-<resource>` require different capabilities or different confirmation flows, splitting is honest.
2. **Different destructive / idempotent annotations.** An ability that both reads and writes cannot honestly declare `readonly: true`; split the read-only part into its own ability.

For writes, this escape hatch isn't needed: rule 2 ("one state
transition per ability") already establishes per-operation granularity
as the default. Splitting `submit-evidence` and `close-resource` into
separate abilities isn't an exception — it's rule 2 in action.

## Related references

- `domain-vs-projection.md` — granularity governs *domain-layer* decisions; that reference covers the projection layer where token-efficiency tradeoffs and consumer-shape choices live.
- `shared-core-service.md` — implementation mechanism for keeping abilities, REST handlers, CLI commands, and UI in lockstep on the domain layer.
