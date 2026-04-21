# Audit Document Schema

The canonical schema for an abilities audit doc. Every audit produced by
`wp-abilities-audit` must conform to this schema — downstream implement and
verify skills consume it and error out on invalid or missing fields.

Two complete reference implementations live in the author's vault:

- `/Users/rtiodev/rtiodev_vault/plans/2026-04-20-abilities-everywhere-woopayments-audit.md`
  (single-cap plugin with a shared API client).
- `/Users/rtiodev/rtiodev_vault/plans/2026-04-20-abilities-audit-woocommerce-subscriptions.md`
  (post-type-backed plugin with compound `{read, write}` caps and inherited
  controllers).

## File layout

```
<output-dir>/<YYYY-MM-DD>-abilities-audit-<plugin-slug>.md
```

`<output-dir>` is explicit — collected from the user, not inferred. Typical
values are the user's vault `plans/` directory or a dedicated audit repo.
Writing into the plugin worktree is discouraged (pollutes git history).

The body has two parts:

1. A fenced ` ```yaml ` block holding structured fields (top-level metadata
   + `proposed_abilities`, `excluded_from_mvp`, `surfaced_gaps`).
2. Prose sections below: "Controller Inventory" table + "Notes and Surprises".

A `Last updated: YYYY-MM-DD HH:MM` header sits above everything.

## Top-level fields (all required)

| Field | Type | Description |
|---|---|---|
| `plugin` | string | Plugin slug (e.g. `woopayments`, `woocommerce-subscriptions`, `jetpack-forms`). |
| `repo` | string | `Owner/Repository` (e.g. `Automattic/woocommerce-payments`). |
| `plugin_family` | string | Classification from `wp-project-triage`. REQUIRED. Common values: `woo-payments`, `woo-extension`, `jetpack`, plus any family triage adds over time. Free-form string — downstream consumers treat unknown values as opaque rather than erroring. |
| `branch_audited` | string | Git branch the audit was run against. |
| `audited_at` | string | ISO date (YYYY-MM-DD). |
| `auditor` | string | Human auditor name + team (e.g. `Rafael (Gamma)`). |
| `baseline_abilities` | integer | Count of abilities already registered by the plugin at audit time. Usually 0. |
| `capability_gate` | string OR object | The capability gate the base controller resolves to. Accept either a single string (single-cap plugins) OR a `{read, write}` object (post-type-backed or otherwise compound gates). See `capability-gate-tracing.md` for the mechanisms. |

### `capability_gate` representations

Two legal shapes, both consumed by downstream skills:

```yaml
# Single-cap plugin (e.g. WooPayments — manage_woocommerce uniformly)
capability_gate: manage_woocommerce  # confirmed at includes/admin/class-wc-payments-rest-controller.php line 64
```

```yaml
# Compound read/write (e.g. WooCommerce Subscriptions — post-type-backed)
capability_gate:
  read: read_private_shop_orders
  write: edit_shop_orders
  confirmed: true
  verified_at: "shop_subscription capability_type='shop_order' → WC core includes/wc-rest-functions.php line 229"
```

A legacy compound-string form exists in the wild (`"<read_cap> / <write_cap>"`)
and is accepted for backwards compatibility, but the structured form above is
the preferred representation for new audits.

## `proposed_abilities` — array

Each entry:

| Field | Type | Description |
|---|---|---|
| `name` | string | Kebab-case `<plugin-slug>/<ability>`. |
| `intent` | string | One sentence, user-question framed. |
| `backing` | object or `null` | See below. `null` marks an ability with no backing endpoint (a known gap). |
| `permission` | object or `null` | See below. `null` when `backing` is null. |
| `return_type` | string | Short description (e.g. `WP_REST_Response (wrapping array)`). Hint-only; not machine-parsed. |
| `effort` | enum | `S`, `M`, or `L`. |
| `annotations` | object | `{ readonly: bool, destructive: bool, idempotent: bool }`. All three required. |
| `notes` | array of strings | Implementer-facing detail (filter params, edge cases, alternative backings). |
| `risks` | array of strings | Anything the implementer must handle (missing idempotency key, two-phase behavior, `permission_callback => '__return_true'` at the REST layer that must not copy into the ability, etc.). |
| `reference_ability` | bool (optional) | If `true`, marks this ability as the reference implementation — the first one the implement skill should land. Exactly zero or one ability per audit may set this. |

### `backing: null` semantics

An ability with `backing: null` is a known gap (the auditor identified a
valuable ability that has no backing endpoint yet). The schema permits this
as a warning, not an error:

- The ability MUST also appear in `surfaced_gaps` with a one-line rationale.
- Downstream implement skills pause for human resolution rather than failing.
- The audit is still valid; `backing: null` is intentional output, not
  missing data.

### `backing` object

| Field | Type | Description |
|---|---|---|
| `class` | string | Fully-qualified PHP class name. |
| `file` | string | Path relative to plugin root. |
| `method` | enum | HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`. |
| `route` | string | Full REST route path. |
| `route_registration_line` | integer OR `null` | Line number of the `register_rest_route(` call, or `null` when inherited from a parent controller that lives outside the plugin repo. |
| `callback` | string | Controller method name that handles the route. |
| `callback_line` | integer OR `null` | Line number of the callback method definition, or `null` when inherited. |
| `inherited_from` | string (optional) | Fully-qualified parent class name when the route and/or callback is inherited (e.g. `WC_REST_Orders_Controller`). Pair with `null` line numbers. Lets downstream skills skip the re-grep step cleanly. |

### `permission` object

| Field | Type | Description |
|---|---|---|
| `callback` | string | The method name used as `permission_callback`. |
| `resolves_to` | string | The `current_user_can()` call(s) it ultimately resolves to. For compound gates, include both (e.g. `"current_user_can('read_private_shop_orders')` for read; `current_user_can('edit_shop_orders')` for write"). |
| `confirmed` | bool | `true` if verified against source; `false` if inferred. |

## `excluded_from_mvp` — array

Abilities intentionally deferred for risk reasons. Each entry:

| Field | Type | Description |
|---|---|---|
| `name` | string | Proposed ability name (kebab-case). |
| `reason` | string | One sentence why it's deferred. |

## `surfaced_gaps` — array

MVP candidates with no backing endpoint (paired with `backing: null` above),
plus high-value endpoints discovered during enumeration that aren't in MVP
but would make future follow-up work. Each entry:

| Field | Type | Description |
|---|---|---|
| `name` | string | Proposed ability name. |
| `one_line_rationale` | string | Why it would be high-leverage. |

## Prose sections (required)

### Controller Inventory

A Markdown table with columns `Class | File | REST Base | Routes`. Must list
every controller enumeration found, even ones that aren't backing any MVP
ability. This gives reviewers a full picture and catches "why isn't X in the
MVP?" questions.

### Notes and Surprises

Free-form prose capturing anything that didn't fit the structured schema:
capability-gate mismatches between controllers, hardcoded route paths, dual
controllers with different output shapes, two-phase endpoint semantics, and
any judgment calls the auditor made.

## Minimal valid example

Copy-pasteable starting point for a new audit:

````markdown
---
Last updated: 2026-04-20 14:30
---

# Example Plugin Abilities — Phase 1 Audit

```yaml
plugin: example-plugin
repo: Owner/example-plugin
plugin_family: woo-extension
branch_audited: feat/abilities-example-plugin
audited_at: 2026-04-20
auditor: Your Name (Your Team)
baseline_abilities: 0
capability_gate: manage_woocommerce  # confirmed at includes/rest-api/class-example-rest-controller.php line 32

proposed_abilities:

  - name: example-plugin/get-items
    intent: "List items with filters (status, customer, date range) so an agent can answer 'which items need attention?' in one call."
    backing:
      class: Example_REST_Items_Controller
      file: includes/rest-api/class-example-rest-items-controller.php
      method: GET
      route: /example/v1/items
      route_registration_line: 26
      callback: get_items
      callback_line: 52
    permission:
      callback: check_permission
      resolves_to: "current_user_can('manage_woocommerce')"
      confirmed: true
    return_type: "WP_REST_Response (wrapping array)"
    effort: S
    annotations: { readonly: true, destructive: false, idempotent: true }
    notes:
      - "get_items(WP_REST_Request $request) requires a WP_REST_Request; construct one in the ability execute_callback."
    risks: []
    reference_ability: true

  - name: example-plugin/close-item
    intent: "Close a single item — terminal state transition, non-reversible."
    backing:
      class: Example_REST_Items_Controller
      file: includes/rest-api/class-example-rest-items-controller.php
      method: POST
      route: /example/v1/items/{id}/close
      route_registration_line: 41
      callback: close_item
      callback_line: 120
    permission:
      callback: check_permission
      resolves_to: "current_user_can('manage_woocommerce')"
      confirmed: true
    return_type: "WP_REST_Response (updated item object)"
    effort: M
    annotations: { readonly: false, destructive: true, idempotent: false }
    notes:
      - "Close is terminal — no reopen endpoint exists."
    risks:
      - "No idempotency key on the backing endpoint; duplicate POSTs may produce inconsistent audit trails."

excluded_from_mvp:
  - name: example-plugin/delete-item
    reason: "Hard delete is irreversible and lacks an undo endpoint; defer until soft-delete is designed."

surfaced_gaps:
  - name: example-plugin/get-overview
    one_line_rationale: "A zero-arg overview endpoint answering 'what's the current state of all items?' would be the highest-leverage ability but no backing endpoint exists yet."
```

## Controller Inventory

| Class | File | REST Base | Routes |
|---|---|---|---|
| Example_REST_Items_Controller | includes/rest-api/class-example-rest-items-controller.php | example/v1/items | GET /example/v1/items, POST /example/v1/items/{id}/close |

## Notes and Surprises

### Capability gate is uniform
Every controller inherits `Example_Base_REST_Controller` and uses
`check_permission` verbatim as the `permission_callback`. No per-route
overrides. Safe to treat `manage_woocommerce` as the single gate.
````

## Known limitations

Documented so downstream skills have an explicit contract:

- **`capability_gate` string-with-inline-comment form** loses data when parsed
  by strict YAML parsers (comments are dropped). The structured object form is
  preferred; string form is accepted for backwards compatibility.
- **`return_type` is hint-only.** Prose for the human auditor; not
  machine-parseable. Downstream skills use runtime `is_wp_error(...)` and
  `instanceof WP_REST_Response` checks regardless of what this field says.
- **Line numbers drift.** `route_registration_line` and `callback_line` are
  captured at audit time and may bit-rot. Downstream skills re-locate routes
  by `(class, callback)` and do not rely on exact line numbers.
- **`inherited_from` + `null` line numbers** are the canonical way to
  represent routes/callbacks defined in a parent class that lives outside
  the plugin repo.
