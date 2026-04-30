# Shared core service — keeping abilities in lockstep with REST and UI

When an ability mirrors something a human can already do through a supported UI or workflow, the ability MUST consume the same code path as that UI or workflow — same permissions, same validation, same business rules. Three call sites for the same operation (UI, REST, ability — possibly CLI too) drift apart over time unless they all delegate to a shared service. This reference covers when to delegate to an existing REST controller (the delegation pattern), when to extract a service class instead, and the side effects on the existing REST path that often force the second choice.

Read `domain-vs-projection.md` first — abilities are use-case contracts at the domain layer; UI/REST/CLI/MCP are projections. This reference is the implementation mechanism that keeps those projections honest.

## Why this matters

A registered ability that re-implements logic instead of calling into existing code paths is a drift hazard. The drift surfaces in predictable ways:

- A new filter added to the UI listing doesn't propagate to the ability.
- A permission tightened on the REST controller leaves the ability under-gated.
- A validation rule added to the admin form is missing from the ability.
- A status transition gains a side-effect (audit log, webhook) that fires on UI-driven writes but not ability-driven writes.

None of these break the ability immediately. They become discoverable only when an agent invokes the ability and the result quietly diverges from what the same operation in the UI would produce. By that point the ability is in production and the divergence is hard to detect without a contract test you almost certainly do not have.

The fix is to keep one source of business logic and treat ability/REST/UI/CLI as adapters over it.

## Three shapes for the ability execute callback

| Shape | Example | Verdict |
|---|---|---|
| **Re-implement** the logic in the execute callback. | The callback runs its own SQL, applies its own permission checks, builds its own response. | **Avoid.** Guaranteed drift the first time the original code path changes. |
| **Delegate to the existing REST controller** via `WP_REST_Request`. | The ability builds a `WP_REST_Request` from its input, dispatches via `rest_do_request()`, and returns the response data. The dispatched request flows through the registered controller's permission check, validation, and handler. | **OK for low-stakes reads** — but read "Side effects on the existing REST path" below first. |
| **Extract a service class** that ability + REST controller + UI handler all consume. | `My_Plugin::get_things_service()->list( $args )` called from the ability, the REST controller, and an admin-side handler. | **Recommended** for writes and for any read whose backing endpoint records usage metrics. |

The middle row is fine when the backing endpoint is light, read-only, and metric-neutral. The third row is what removes drift entirely; it is also more invasive because it usually means refactoring the existing REST controller to call the service rather than embed the logic.

## What the delegation pattern looks like

The middle row of the table — "delegate to the existing REST controller" — is a pattern, not a single canonical helper. The minimal shape is small enough to inline in an ability's `execute_callback`:

```php
public static function execute_get_things( $input = null ) {
    $request = new WP_REST_Request( 'GET', '/my-plugin/v1/things' );
    $request->set_query_params( (array) $input );

    $response = rest_do_request( $request );
    if ( $response->is_error() ) {
        return $response->as_error();
    }

    return $response->get_data();
}
```

The five moves: construct the `WP_REST_Request` with the right HTTP method and route; copy the ability's `$input` onto the request as query params (or body params for writes); dispatch via `rest_do_request()`, which routes through the registered controller including its `permission_callback` and any side effects; convert an error response back to a `WP_Error` so the ability's caller sees a normal error; otherwise return the data.

In a real codebase you would usually extract this into a small private helper so multiple ability callbacks can share the boilerplate. The shape of that helper is out of scope for this reference — the point here is that the delegation pattern is mechanically simple and does not depend on any particular framework helper to be in place.

## Side effects on the existing REST path

A delegating ability re-uses the REST controller's full code path, including any side effects the controller emits on every call:

- **Usage telemetry / analytics events** — the ability inflates dashboards with agent traffic and the human-vs-agent provenance signal is lost. Metric double-counting is the silent failure mode — the system "works" while the dashboards drift.
- **Audit logs** — entries get attributed to a "REST" actor that is actually an agent. Forensics gets noisier.
- **Custom-event hooks** (`do_action(...)`) — listeners on those hooks now fire on every ability invocation, with surprise side-effects in unrelated subsystems.
- **Email / notification dispatch** — agent-driven calls trigger user-visible notifications that should not have been sent.
- **Cache invalidation, schedule rescheduling, lock acquisition** — harmless when intended; harmful when fired by traffic the original handler did not anticipate.

The fix is the third row of the table above:

- Extract the business logic into a service class.
- Have the REST controller call the service AND emit its side effects as a thin adapter.
- Have the ability call the service directly, NOT the REST controller. The ability emits its own ability-tagged side effects, or none.

This way side effects stay scoped to the surface that triggers them, and the ability still consumes the same business logic as the UI.

If the existing REST endpoint is a pure data-fetch with no side effects, the delegation pattern is a fine shortcut.

## MCP exposure rule

Do not expose REST AND ability for the same operation to the same MCP client. Pick one.

The ability is the agent contract: schema-typed, permission-gated, semantic-intent-named. The REST endpoint stays in place for non-agent integrations (UI, third-party clients that already exist, internal services that consume the JSON contract). The MCP layer surfaces the ability and elides the REST endpoint.

Exposing both produces a "which surface should I use?" question for any LLM that sees both — and the answer affects metrics, logging, and error handling. Pick the ability.

## The `AGENTS.md` rule

Add a line to the plugin's `AGENTS.md` (under whichever H2 covers "when changing code in this area"):

> When you change the code path behind a registered ability, check whether the ability needs to update too. A new filter on the underlying listing usually means the ability should expose the same filter. A permission change means the ability's gate likely needs to follow. A new side-effect on a write may change what we promise the ability does.

This shifts the burden from "remember to update the ability" to "be reminded by the LLM working on the change." It costs nothing at write time and prevents the most common source of drift.

## Worked example — extracting a service

Generic plugin with a `Things` resource. Before extraction, the REST controller embeds the listing logic and the ability re-runs the same filter/sort/paginate code:

```php
// includes/admin/class-rest-things-controller.php
class My_Plugin_REST_Things_Controller {
    public function get_things( WP_REST_Request $request ) {
        $args = self::sanitize_query_args( $request->get_params() );
        $rows = $this->repo->find( $args );

        // Side effects (audit log, hooks, notifications) live on the REST adapter.
        do_action( 'my_plugin/things_listed', $rows );

        return rest_ensure_response( array_map( [ $this, 'format' ], $rows ) );
    }
}

// src/Internal/Abilities/Abilities_Registrar.php
public static function execute_get_things( $input = null ) {
    // PROBLEM: re-implements sanitization, repo call, formatting.
    // Drifts the first time the controller's get_things() changes.
    $args = MyPlugin\Sanitize::query_args( (array) $input );
    $rows = ( new MyPlugin\Things_Repo() )->find( $args );
    return array_map( [ MyPlugin\Things_Formatter::class, 'format' ], $rows );
}
```

After extraction, both paths consume `Things_Service::list()`:

```php
// src/Service/class-things-service.php
class Things_Service {
    public function list_things( array $args ) {
        $clean = Sanitize::query_args( $args );
        $rows  = $this->repo->find( $clean );
        return array_map( array( Things_Formatter::class, 'format' ), $rows );
    }
}

// includes/admin/class-rest-things-controller.php
class My_Plugin_REST_Things_Controller {
    public function get_things( WP_REST_Request $request ) {
        $rows = $this->service->list_things( $request->get_params() );

        // Side effects (audit log, hooks, notifications) stay on the REST adapter — clean.
        do_action( 'my_plugin/things_listed', $rows );

        return rest_ensure_response( $rows );
    }
}

// src/Internal/Abilities/Abilities_Registrar.php
public static function execute_get_things( $input = null ) {
    if ( ! class_exists( '\MyPlugin\Things_Service' ) ) {
        return new WP_Error( 'myplugin_not_initialized', __( 'My Plugin is not initialized.', 'my-plugin' ) );
    }
    return MyPlugin::get_things_service()->list_things( (array) $input );
}
```

The ability and the REST endpoint now share business logic. Side effects (audit, hooks, notifications, any telemetry) stay on the REST adapter and do not fire on agent-driven invocations. The next person to add a filter parameter changes one place — the service — and both call sites pick it up.

## Rule of thumb

- **Read with no side effects on the REST path, light logic** → route the ability through the existing REST handler via the delegation pattern. Cheapest. Drift risk is bounded because the REST controller is one short hop away.
- **Read where the REST handler does more than data-fetch** (audit, hooks, notifications, telemetry) → extract a service. Don't fire UI-scoped side effects on agent invocations.
- **Write of any kind** → extract a service. Drift is most damaging on writes (lost validation, missing audit hooks).
- **No existing REST endpoint** → start at the service. The first ability you ship is also the right time to add the structure that a future REST endpoint will consume.

The side-effect and write rules **override** the lighter "if the
backing takes a `WP_REST_Request`, just delegate" heuristic. The
signature test is sufficient only when the REST handler is a pure
data-fetch and the operation is a read. If the handler emits side
effects or the operation writes, extract a service even when
delegating would otherwise be the easy path.

## Escape hatch — when re-implementation is OK

Two narrow cases:

1. **The ability is read-only and the backing has no extractable shape.** Sometimes the "logic" is one line — `get_option( 'something' )` — and a service class is overkill. Inline it.
2. **The plugin is single-purpose and will not grow surfaces.** A 200-line plugin with one ability and no REST surface to drift against can keep logic in the execute callback. The drift risk only shows up at 2+ adapters.

In both cases, leave a `// TODO: extract to service if a REST/UI surface gets added` comment so the next person sees the trigger condition.

## Related references

- `domain-vs-projection.md` — the layer model that puts shared services at the domain layer and projections (REST / MCP / CLI / UI) above.
- `grouping-heuristic.md` — orthogonal: this reference covers "same code path"; that one covers "how many abilities."
