# Audit Document Schema

The canonical schema for an abilities audit doc. Every audit produced by
`wp-abilities-audit` must conform to this schema so downstream tooling
(humans reviewing, agents implementing, or validators like
`wp-abilities-verify`) can consume it without parsing surprises.

A copy-pasteable minimal example with both a read ability and a write
ability lives under "Minimal valid example" below.

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
| `plugin` | string | Plugin slug (e.g. `my-plugin`, `tasks-plugin`, `notifications`). |
| `repo` | string | `Owner/Repository`. |
| `branch_audited` | string | Git branch the audit was run against. |
| `audited_at` | string | ISO date (YYYY-MM-DD). |
| `auditor` | string | Human auditor name + team or context (e.g. `Your Name (Your Team)`). |
| `baseline_abilities` | integer | Count of abilities already registered by the plugin at audit time. Usually 0. |
| `capability_gate` | string OR object | The capability gate the base controller resolves to. Accept either a single string (single-cap plugins) OR a `{read, write}` object (post-type-backed or otherwise compound gates). See `capability-gate-tracing.md` for the mechanisms. |
| `plugin_family` | string (optional) | Free-form classification when useful to downstream readers (e.g. `core-post-type`, `forms-engine`, or a project-specific family name). Optional and user-supplied — no canonical enum. Downstream consumers treat unknown values as opaque rather than erroring. |

### `capability_gate` representations

Two legal shapes, both consumed by downstream tooling:

```yaml
# Single-cap plugin (one capability across every controller)
capability_gate: manage_options  # confirmed at includes/admin/class-my-plugin-rest-controller.php line 64
```

```yaml
# Compound read/write (post-type-backed plugins typically need this shape;
# read and write resolve to different capabilities)
capability_gate:
  read: read_private_pages
  write: edit_others_pages
  confirmed: true
  verified_at: "custom_post_type capability_type='page' → core post-type cap map (wp-includes/post.php map_meta_cap)"
```

Plugin-specific capabilities (e.g. WooCommerce's `manage_woocommerce`,
`edit_shop_orders`) are equally valid — substitute your plugin's caps. The
shape is the contract; the literal cap names are project-specific.

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
| `use_case_fit` | string | One sentence naming the human or agent workflow this ability serves. The use-case-contract check (see `wp-abilities-api/references/domain-vs-projection.md`): if no human would intentionally do this through a supported UI or workflow, the entry probably belongs in `excluded_from_mvp` instead. |
| `side_effects` | array of strings | Side effects the backing path emits on every call: telemetry hooks, audit-log rows, notifications, cache writes. One short line per effect. Empty array (`[]`) when the backing is a pure data-fetch — that is *itself* a load-bearing fact: it is what unlocks the conditional delegation shortcut in `wp-abilities-api/references/shared-core-service.md`. A non-empty array tells the implementer (and downstream verify-mode tooling) that this ability needs the shared-service shape, not the delegate-through-REST shortcut. |
| `seed_data_needs` | string OR `null` | One line describing what representative data must exist in the test environment for the ability to execute through the public boundary and return something meaningful (e.g. `"at least one entity in the plugin's primary table"`, `"no seed required"`). `null` when the auditor has not yet identified the seed shape; downstream verify-mode tooling treats `null` as "ask the implementer" rather than guessing. |
| `reference_ability` | bool (optional) | If `true`, marks this ability as the reference implementation — the first one an implementer should land (smallest, safest, highest-leverage read). Exactly zero or one ability per audit may set this. |

### `backing: null` semantics

An ability with `backing: null` is a known gap (the auditor identified a
valuable ability that has no backing endpoint yet). The schema permits this
as a warning, not an error:

- The ability MUST also appear in `surfaced_gaps` with a one-line rationale.
- Implementers pause for resolution rather than guessing a backing.
- The audit is still valid; `backing: null` is intentional output, not
  missing data.

### `backing` object

| Field | Type | Description |
|---|---|---|
| `kind` | enum (optional, default `rest_controller`) | The implementation path the ability should use or inspect. One of `rest_controller`, `service`, `helper`, `data_store`. When omitted, defaults to `rest_controller` for backwards compatibility with audits authored before this field landed. The kind tells downstream tooling whether the delegation pattern from `wp-abilities-api/references/shared-core-service.md` applies (only `rest_controller` is a candidate; the others select the shared-service shape from the start). |
| `class` | string | Fully-qualified PHP class name (controller class for `rest_controller`; service / helper / data-store class for the other kinds). May be omitted when `kind: data_store` and the backing is a bare option key, post-meta key, or table without an owning class. |
| `file` | string | Path relative to plugin root. |
| `method` | enum (required when `kind: rest_controller`) | HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`. Not applicable when `kind` is `service`, `helper`, or `data_store`. |
| `route` | string (required when `kind: rest_controller`) | Full REST route path. Not applicable to non-REST kinds. |
| `route_registration_line` | integer OR `null` | For `kind: rest_controller`: line number of the `register_rest_route(` call, or `null` when inherited. Omit for other kinds. |
| `callback` | string | For `kind: rest_controller`: controller method name that handles the route. For `kind: service` / `helper`: method name on the service / helper class. For `kind: data_store`: the operation name (`get_option`, `get_post_meta`) or the table-read pattern; may be omitted. |
| `callback_line` | integer OR `null` | Line number of the callback or method definition, or `null` when inherited or not applicable. |
| `inherited_from` | string (optional) | Fully-qualified parent class name when the route and/or callback is inherited from a class outside this plugin's repo (e.g. `WP_REST_Posts_Controller` from WordPress core, or another plugin's REST base class for extension plugins). Pair with `null` line numbers. Lets downstream tooling skip the re-grep step cleanly. Primarily relevant for `kind: rest_controller`. |

### `permission` object

| Field | Type | Description |
|---|---|---|
| `source` | enum (optional, default `rest_controller`) | Where the canonical permission for this behavior lives — not always the REST controller's `permission_callback`. One of `rest_controller`, `admin_action`, `service`, `domain_policy`, `post_type_map`, `none`. When omitted, defaults to `rest_controller` for backwards compatibility. `admin_action` for behaviors gated by `check_admin_referer` / `current_user_can` on an admin handler; `service` when a shared method enforces the cap; `domain_policy` for plugins with a policy / authorization layer; `post_type_map` for capabilities resolved through `map_meta_cap` on a post-type cap shadow; `none` for genuinely public behavior. Tells the implementer whether the ability's `permission_callback` can mirror the REST callback or must consult a different source of truth. |
| `callback` | string | The method or function name that enforces the cap at the recorded `source`. For `source: rest_controller`, this is the `permission_callback` value. For `source: admin_action`, the admin handler function or method. For `source: service`, the service method that performs the cap check. |
| `resolves_to` | string | The `current_user_can()` call(s) it ultimately resolves to. For compound gates, include both (e.g. `"current_user_can('read_private_pages')` for read; `current_user_can('edit_others_pages')` for write"). |
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
branch_audited: feat/abilities-example-plugin
audited_at: 2026-04-20
auditor: Your Name (Your Team)
baseline_abilities: 0
capability_gate: manage_options  # confirmed at includes/rest-api/class-example-rest-controller.php line 32

proposed_abilities:

  - name: example-plugin/get-items
    intent: "List items with filters (status, owner, date range) so an agent can answer 'which items need attention?' in one call."
    backing:
      kind: rest_controller
      class: Example_REST_Items_Controller
      file: includes/rest-api/class-example-rest-items-controller.php
      method: GET
      route: /example/v1/items
      route_registration_line: 26
      callback: get_items
      callback_line: 52
    permission:
      source: rest_controller
      callback: check_permission
      resolves_to: "current_user_can('manage_options')"
      confirmed: true
    return_type: "WP_REST_Response (wrapping array)"
    effort: S
    annotations: { readonly: true, destructive: false, idempotent: true }
    notes:
      - "get_items(WP_REST_Request $request) requires a WP_REST_Request; construct one in the ability execute_callback."
    risks: []
    use_case_fit: "Agent answers 'which items need attention right now?' in a single call without paging through a UI."
    side_effects: []
    seed_data_needs: "at least one item exists in any non-trashed status"
    reference_ability: true

  - name: example-plugin/close-item
    intent: "Close a single item — terminal state transition, non-reversible."
    backing:
      kind: service
      class: Example_Items_Service
      file: src/Service/class-items-service.php
      callback: close
      callback_line: 88
    permission:
      source: service
      callback: Example_Items_Service::assert_can_close
      resolves_to: "current_user_can('manage_options')"
      confirmed: true
    return_type: "WP_REST_Response (updated item object)"
    effort: M
    annotations: { readonly: false, destructive: true, idempotent: false }
    notes:
      - "Close is terminal — no reopen endpoint exists."
    risks:
      - "No idempotency key on the backing endpoint; duplicate POSTs may produce inconsistent audit trails."
    use_case_fit: "User or agent closes a stale item from a workflow that surfaces stale items (admin list view, daily-digest agent)."
    side_effects:
      - "fires action `example_plugin/item_closed` (downstream listeners may dispatch email)"
      - "writes audit-log row to `example_plugin_audit_log`"
    seed_data_needs: "one open item to close; the test must capture the item id before invocation"

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
overrides. Safe to treat `manage_options` as the single gate.
````

## Known limitations

Documented so downstream skills have an explicit contract:

- **`capability_gate` string-with-inline-comment form** loses data when parsed
  by strict YAML parsers (comments are dropped). The structured object form is
  preferred; string form is accepted for backwards compatibility.
- **Legacy compound-string `capability_gate`** — the `"<read_cap> / <write_cap>"`
  form predates the structured `{read, write}` object and is still accepted
  for backwards compatibility. Validators (e.g. `wp-abilities-verify`)
  emit WARN on this form to nudge migration to the structured shape;
  they do NOT FAIL. New audits should use the object form.
- **`return_type` is hint-only.** Prose for the human auditor; not
  machine-parseable. Downstream skills use runtime `is_wp_error(...)` and
  `instanceof WP_REST_Response` checks regardless of what this field says.
- **Line numbers drift.** `route_registration_line` and `callback_line` are
  captured at audit time and may bit-rot. Downstream skills re-locate routes
  by `(class, callback)` and do not rely on exact line numbers.
- **`inherited_from` + `null` line numbers** are the canonical way to
  represent routes/callbacks defined in a parent class that lives outside
  the plugin repo.
- **`backing: null` invariant.** Abilities with `backing: null` are intentional
  gaps and MUST also appear in `surfaced_gaps` by `name`. Validators FAIL
  audits where this invariant is violated (a `null` backing without a
  matching `surfaced_gaps` entry indicates inconsistent audit output).
- **Implementation-readiness fields added 2026-05-21.** `use_case_fit`,
  `side_effects`, and `seed_data_needs` are required in the per-ability
  schema as of this date. Audits authored against an earlier revision of
  this schema will be missing the three fields. Validators (e.g.
  `wp-abilities-verify`) emit WARN on missing implementation-readiness
  fields to nudge backfill the next time the audit is touched; they do
  NOT FAIL, mirroring the legacy `capability_gate` posture above. New
  audits MUST populate all three.
- **`backing.kind` and `permission.source` added 2026-05-21.** Both
  are optional with default `rest_controller` so older audits validate
  as-is. New audits SHOULD populate both explicitly — `backing.kind`
  to record whether the ability backs a REST controller, a shared
  service, a helper, or a data store (because the answer drives the
  delegate-vs-extract-service decision in `wp-abilities-api/references/
  shared-core-service.md`); `permission.source` to record where the
  canonical permission lives (REST callback is the common case, but
  admin actions, service methods, domain policies, and post-type cap
  maps each happen). Validators treat a missing field as the default,
  not as an error.
