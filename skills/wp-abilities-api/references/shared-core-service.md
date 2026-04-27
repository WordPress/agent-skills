# Shared core service — keeping abilities in lockstep with REST and UI

When an ability mirrors something a human can already do in the admin, the ability MUST consume the same code path as the UI — same permissions, same validation, same business rules. Three call sites for the same operation (UI, REST, ability — possibly CLI too) drift apart over time unless they all delegate to a shared service. This reference covers when to delegate to an existing REST controller (the `delegate_to_rest_controller` route), when to extract a service class instead, and the metric trap that makes that distinction matter.

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
| **Delegate to the existing REST controller** via `WP_REST_Request`. | `delegate_to_rest_controller( '...REST_Things_Controller', 'get_things', '/myplugin/v1/things', $input )`. | **OK for low-stakes reads** — but read "the metric trap" below first. |
| **Extract a service class** that ability + REST controller + UI handler all consume. | `My_Plugin::get_things_service()->list( $args )` called from the ability, the REST controller, and an admin-side handler. | **Recommended** for writes and for any read whose backing endpoint records usage metrics. |

The middle row is fine when the backing endpoint is light, read-only, and metric-neutral. The third row is what removes drift entirely; it is also more invasive because it usually means refactoring the existing REST controller to call the service rather than embed the logic.

## The metric trap

Most production REST endpoints in real plugins emit usage telemetry — analytics events, structured log emitters, custom event hooks. These metrics drive product decisions (which endpoints are hot, which are abandoned, which are slow).

Routing an ability through `delegate_to_rest_controller` re-uses the REST controller's full code path, including its telemetry emission. Every agent invocation now counts as a UI-driven REST call. The metric is no longer a measure of human-driven usage; it is contaminated by agent traffic, and the contamination has no provenance label distinguishing the two.

The fix is the third row of the table above:

- Extract the business logic into a service class.
- Have the REST controller call the service AND emit telemetry as a thin adapter.
- Have the ability call the service directly, NOT the REST controller. The ability either emits its own ability-tagged telemetry or emits none.

This way the dashboards stay clean and the ability still consumes the same business logic as the UI.

If the existing REST endpoint emits no metrics, `delegate_to_rest_controller` is a fine shortcut.

## MCP exposure rule

Do not expose REST AND ability for the same operation to the same MCP client. Pick one.

The ability is the agent contract: schema-typed, permission-gated, semantic-intent-named. The REST endpoint stays in place for non-agent integrations (UI, third-party clients that already exist, internal services that consume the JSON contract). The MCP layer surfaces the ability and elides the REST endpoint.

Exposing both produces a "which surface should I use?" question for any LLM that sees both — and the answer affects metrics, logging, and error handling. Pick the ability.

## The `agents.md` rule

Add a line to the plugin's `agents.md` (under whichever H2 covers "when changing code in this area"):

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

        // Telemetry: emitted on every UI-driven call.
        my_plugin_track_event( 'things_listed', [ 'count' => count( $rows ) ] );

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
    public function list( array $args ) : array {
        $clean = Sanitize::query_args( $args );
        $rows  = $this->repo->find( $clean );
        return array_map( [ Things_Formatter::class, 'format' ], $rows );
    }
}

// includes/admin/class-rest-things-controller.php
class My_Plugin_REST_Things_Controller {
    public function get_things( WP_REST_Request $request ) {
        $rows = $this->service->list( $request->get_params() );

        // Telemetry stays on the REST adapter — clean.
        my_plugin_track_event( 'things_listed', [ 'count' => count( $rows ), 'source' => 'rest' ] );

        return rest_ensure_response( $rows );
    }
}

// src/Internal/Abilities/Abilities_Registrar.php
public static function execute_get_things( $input = null ) {
    if ( ! class_exists( '\MyPlugin\Things_Service' ) ) {
        return new WP_Error( 'myplugin_not_initialized', __( 'My Plugin is not initialized.', 'my-plugin' ) );
    }
    return MyPlugin::get_things_service()->list( (array) $input );
}
```

The ability and the REST endpoint now share business logic. Telemetry stays on the REST adapter and does not double-count agent traffic. The next person to add a filter parameter changes one place — the service — and both call sites pick it up.

## Rule of thumb

- **Read with no telemetry, light logic** → `delegate_to_rest_controller` (see `delegate-helper-pattern.md`).
- **Read with telemetry on the REST handler** → extract a service. Don't contaminate metrics.
- **Write of any kind** → extract a service. Drift is most damaging on writes (lost validation, missing audit hooks).
- **No existing REST endpoint** → start at the service. The first ability you ship is also the right time to add the structure that a future REST endpoint will consume.

## Escape hatch — when re-implementation is OK

Two narrow cases:

1. **The ability is read-only and the backing has no extractable shape.** Sometimes the "logic" is one line — `get_option( 'something' )` — and a service class is overkill. Inline it.
2. **The plugin is single-purpose and will not grow surfaces.** A 200-line plugin with one ability and no REST surface to drift against can keep logic in the execute callback. The drift risk only shows up at 2+ adapters.

In both cases, leave a `// TODO: extract to service if a REST/UI surface gets added` comment so the next person sees the trigger condition.

## Related references

- `delegate-helper-pattern.md` — when REST-as-transport is the right route, this is the helper.
- `domain-vs-projection.md` — the layer model that puts shared services at the domain layer and projections (REST/MCP/CLI/UI) above.
- `grouping-heuristic.md` — orthogonal: this reference is "same code path"; that one is "how many abilities."
- `error-code-vocabulary.md` — the `<plugin>_not_initialized` code shown above.
