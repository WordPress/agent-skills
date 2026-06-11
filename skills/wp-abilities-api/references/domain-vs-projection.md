# Domain capability vs projection — picking the layer to register at

> Three layers in this model: **domain**, **projection**, and an optional **workflow** layer that composes abilities into multi-step tasks. The title names the two primary decisions; workflow is introduced where it earns its keep.

The Abilities API can be used at two heights. You can register abilities as the surface an MCP/REST/Command-Palette client will consume directly. Or you can register abilities at the domain layer — "what can this plugin do, transport-neutrally?" — and let each consumer see a projection of that surface that suits its constraints. This reference covers why the second framing pays off, the three-layer model that operationalizes it, and how to use it when deciding what to register.

## Why this matters

Treating MCP exposure as the registration target conflates two decisions:

1. What capabilities does this plugin offer?
2. How should each consumer see them?

The first decision is stable. The second is volatile — token budgets shift, MCP clients improve, Command Palette gains new conventions, large plugins outgrow flat tool lists and adopt nested-discovery patterns. Coupling the two means re-registering abilities every time the projection question is reopened.

Decoupling them means registrations stay where they are while projections evolve underneath.

## The three layers

| Layer | Purpose | Examples |
|---|---|---|
| **Domain capability** | Stable, transport-neutral, permission-checked. The plugin's contract for "what can this do." | `myplugin/list-things`, `myplugin/update-thing`, `myplugin/get-overview` |
| **Workflow** *(optional)* | Compositions of one or more abilities into a human- or agent-friendly task. | "Onboard a new merchant" = `verify-account` → `enable-feature` → `send-welcome` |
| **Projection** | Consumer-specific view of the domain layer. Token-efficient compression for MCP, curated workflows for Command Palette, discoverable execution surface for REST, forms for admin UI, chainable commands for CLI. | The bundled WordPress MCP adapter projects every published ability through three meta-abilities (`mcp-adapter/discover-abilities`, `mcp-adapter/execute-ability`, `mcp-adapter/get-ability-info`) — agents traverse those three rather than seeing the full registry flat. Command Palette, by contrast, can show the same domain abilities flat because token budget is not a constraint. |

The domain layer is what the registry holds. The projection layer is what each consumer sees. The workflow layer is optional and exists when a user-or-agent-meaningful task needs more than one ability.

## The use-case-contract test

A registered ability is a use-case contract — a natural-language shortcut to an action a human can already perform in the UI. REST endpoints and CLI commands are transport contracts; they expose plumbing. Abilities expose actions.

Two consequences fall out of that framing:

### 1. Inclusion test — "would a human intentionally do this through a supported UI or workflow?"

If yes, the operation is a candidate for an ability. The lens is broader than wp-admin alone: a "supported UI or workflow" covers admin screens, public-facing UIs (storefront, account dashboard, course viewer, appointment booker), end-user self-service flows on the site front-end, and supported workflows in which another plugin or an agent calls the operation as part of a chain of actions. Abilities like `store/get-my-orders`, `events/list-available-tickets`, or `profile/update-public-profile` qualify just as much as admin-side abilities like `myplugin/list-pending-orders` or `myplugin/approve-submission`.

If no, the operation stays a REST endpoint, a CLI command, or an internal hook. Internal-only plumbing — cache invalidation, scheduler ticks, debug snapshots, lifecycle bookkeeping — does not belong as an ability even when it has a clean schema. There is no meaningful human invocation point, so there is no use-case contract to register.

The test is asymmetric: not everything a UI exposes should be an ability either (rule 1 in `grouping-heuristic.md` covers grouping). But anything that has no human-meaningful invocation surface almost certainly is not ability-meaningful.

### 2. Same code path as the UI

If the ability mirrors a UI action, it must share the UI's permissions, validation, and business rules. The mechanism for keeping that promise is in `shared-core-service.md`. The framing is here: the ability is the use-case; UI / REST / CLI / MCP are thin adapters over it.

## Implications

### You may register abilities you do NOT expose via MCP

The Abilities API is a WordPress core primitive. It establishes a formal contract for "run this code with these inputs under this permission check." MCP, REST, and Command Palette are exposure layers on top. You opt in.

This means a plugin can register abilities that the Command Palette uses but MCP does not see, or vice versa. The registration is transport-neutral; exposure is per-consumer.

### The same domain ability can appear in multiple projections with different shapes

A small plugin might expose its three abilities flat in MCP and flat in Command Palette. A larger plugin might keep the same three domain abilities but project them through a nested-discovery facade for MCP (three meta-tools that traverse to the underlying registrations) while showing them flat in the Command Palette where token budget is not a constraint.

The domain layer does not change. The projection layer does the consumer-specific work.

### Token-efficiency tradeoffs live at the projection layer

The choice between flat-with-full-schemas, semantic-grouping, single-tool-facade, and nested-discovery is a *projection* decision. Different shapes serve different consumer constraints. None of those shapes require changing what abilities are registered at the domain layer; they change how a consumer sees the registered set.

This is what "pattern-agnostic" means in practice: the registration is one decision, the projection is another, and a redesign of the second does not invalidate the first.

## Decision order

When designing a plugin's ability surface, work in this order:

1. **Domain first.** What can this plugin do, transport-neutrally? Use the inclusion test. Apply `grouping-heuristic.md` to pick the right granularity (semantic-intent over REST-atomization).
2. **Projection second.** Which surfaces does each capability appear on, and in what shape? For most plugins under ~10 abilities, flat-in-every-projection works. For larger plugins, consider nested-discovery for MCP while keeping flat for Command Palette and REST.
3. **Workflow third (only if needed).** Are there multi-ability tasks worth composing into a single user-or-agent-facing entry point? If yes, the workflow lives above the domain layer and references multiple abilities.

Most plugins never need step 3.

## Worked example — generic Notifications plugin

A "Notifications" plugin manages a per-user notification feed. It supports listing, marking read, and dismissing all.

### Domain layer

Three abilities, registered once:

- `notifications/list` — read; filter by `unread_only`, `since`, `category`.
- `notifications/mark-read` — write; takes a `notification_id`.
- `notifications/dismiss-all` — write; zero-arg.

These are use-case contracts. They are transport-neutral. They do not assume MCP or Command Palette or REST.

### Projection — MCP

Small surface, flat works. The MCP projection exposes the three abilities as-is. No nested-discovery needed.

### Projection — Command Palette

The Command Palette projection adds a small workflow that wraps `notifications/list` with default filters (`unread_only=true`) and opens the admin notifications page on selection. The other two abilities remain visible as flat commands. The domain registration did not change; the Command Palette layer added the workflow on top.

### Projection — REST

The REST projection exposes only the read ability. Writes go through admin UI for security-review reasons. The domain registration is unchanged; the REST layer just doesn't expose two of the three.

Same three registrations, three different projections, no re-registration as projection decisions evolve.

## Escape hatch — tiny plugins

For plugins with one to three admin-only abilities and no other surfaces, the projection layer is trivially the identity function. You don't need to *implement* layers; you need to *think* in layers so you don't paint yourself into a corner when the plugin grows or when MCP token budgets become a constraint.

Concretely: name the abilities at the domain level (`myplugin/get-thing`, not `myplugin-mcp/get-thing`), keep the registration permission-checked and transport-neutral, and skip the projection layer until something needs it.

## Related references

- `grouping-heuristic.md` — within-domain decisions: how many abilities, where to put filters.
- `shared-core-service.md` — the implementation mechanism for "same code path as the UI."
