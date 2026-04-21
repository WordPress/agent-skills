# Grouping heuristic — picking which abilities to register

How to decide WHAT to register when a plugin already has a REST (or internal service) surface. The hard part of adopting the Abilities API is not the registration syntax — it's picking the right granularity so agents can actually use the result.

## Three observed approaches

| Approach | Shape | Example | Verdict |
|---|---|---|---|
| **Action-bundle** | One ability bundles many sub-operations behind an action string. | `my_plugin_account` with `action: "get" \| "update" \| "delete"`. | Reference only. Hides the ability surface from the agent's tool-list and defeats the Abilities API's introspection model — agents can't see what a bundle can do until they invoke it. |
| **REST-atomization** | One ability per HTTP method per resource (typically 5 per resource: list, get, create, update, delete). | `orders-list`, `orders-get`, `orders-create`, `orders-update`, `orders-delete`. | Explodes the agent's tool-list. Agents spend context picking between near-duplicates and often still miss the right one. Doesn't match how humans ask questions. |
| **Semantic-intent** | One ability per real-world question or state transition. Filter parameters in `input_schema` collapse N variants into 1. | Jetpack Forms `jetpack-forms/get-responses` with `status`, `is_unread`, `search`, date-range — 1 ability replaces what would be 8+ atomized variants. | **Recommended.** |

## Why semantic-intent wins

1. **Agent tool-list context is finite.** Every registered ability consumes tokens on every agent turn that includes the tool list. A semantic ability collapses 8 REST variants into 1 entry and frees that context for reasoning.
2. **Users think in questions, not HTTP verbs.** "Which form responses are unread?" maps cleanly to one ability with an `is_unread` filter. It does NOT map to 8 abilities (`get-unread-responses`, `get-spam-responses`, `get-trashed-responses`, ...).
3. **The Abilities API's `input_schema` is designed for rich inputs.** Enum constraints, date-time formats, and required-field validation do the variant-splitting job that atomization would delegate to the ability name.
4. **Writes stay narrow anyway.** A write ability should already be one state transition; atomization and semantic-intent converge for writes.

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

## Worked example A — Jetpack Forms: 3 abilities for the whole responses surface

Jetpack Forms' responses surface in the WP admin exposes: a list with 8+ filters, a detail view, bulk status changes (spam/trash/publish), read/unread toggles, and a count-by-status dashboard summary.

REST-atomization would ship ~6 abilities (list, get, delete, update, bulk-update, count). Jetpack Forms instead registers **three**:

- `jetpack-forms/get-responses` — list/search, with `status`, `is_unread`, `search`, `before`, `after`, `parent` in `input_schema`.
- `jetpack-forms/update-response` — one write that covers status changes AND read-state toggles on a single response (semantically "modify a response").
- `jetpack-forms/get-status-counts` — the dashboard summary ability. Zero-arg-friendly (only optional filters).

Why three works: a user asking "show me spam responses from last week" uses one ability. An agent updating one response to `spam` uses one ability. The dashboard-style "how many unread?" uses one ability. The entire product surface fits in three tool-list entries.

Canonical file: [`Automattic/jetpack/projects/packages/forms/src/abilities/class-forms-abilities.php`](https://github.com/Automattic/jetpack/blob/trunk/projects/packages/forms/src/abilities/class-forms-abilities.php).

## Worked example B — WooPayments disputes: one ability with a status filter, not eight

WooPayments' `GET /wc/v3/payments/disputes` accepts `status_is`, `status_is_not`, `date_before`, `date_after`, `date_between`, `store_currency_is`, `match`, `search`. Status values include `warning_needs_response`, `needs_response`, `under_review`, `won`, `lost`, and several more.

- Atomization would ship ~8 abilities (`get-disputes-warning-needs-response`, `get-disputes-won`, `get-disputes-lost`, ...).
- Semantic-intent ships **one** — `woopayments/get-disputes` with `status_is: { type: "string", enum: ["warning_needs_response", "needs_response", "under_review", "won", "lost", ...] }`.

The user question "which disputes need a response?" becomes one ability invocation with `status_is: "needs_response"`. The agent doesn't scan a list of 8 near-identical tool names; it scans one, and the enum documents what values are valid.

The same plugin also registers a zero-arg `get-payout-overview` ability (next payout date + amount) because "when do I get paid?" is the single highest-frequency merchant question and the backing endpoint takes no arguments. That one ability has outsized value for one line of registration code — rule 4 in action.

## Escape hatch — when atomization is right

Two cases where one-ability-per-operation IS appropriate:

1. **Genuinely different permission models.** If `create-<resource>` and `delete-<resource>` require different capabilities or different confirmation flows, splitting is honest.
2. **Different destructive / idempotent annotations.** An ability that both reads and writes cannot honestly declare `readonly: true`; split the read-only part into its own ability.

These exceptions tend to coincide with rule 2 (one state transition per ability) — not a contradiction.
