# Capability-Gate Tracing

How to resolve the actual capability (or capabilities) a plugin's REST
controllers gate on. The audit's `capability_gate` field and each ability's
`permission.resolves_to` field need to reflect reality, not what the
controller docblock says.

Two common mechanisms cover most plugins. Document both explicitly so the
auditor doesn't hard-code one plugin family's assumptions.

## Mechanism A — Direct (`check_permission()` returning a single cap)

The base REST controller declares a `check_permission()` (or
`permissions_check()`) method that calls `current_user_can('<some_cap>')`
once. Every route in the controller uses that method as
`permission_callback`.

### Identifying signs

- The base controller has a method like:
  ```php
  public function check_permission() {
      return current_user_can( 'manage_options' );
  }
  ```
- Controllers extend the plugin's own base, not a WordPress core
  post-type-backed class.
- The grep `grep -n 'current_user_can' <base-controller>.php` yields one hit.

### How to trace

```bash
# Locate the base controller (usually the parent of every REST controller).
grep -rn 'extends .*REST_Controller' includes/ | head

# Read its permission_callback implementation.
grep -n 'check_permission\|permissions_check' <base-controller>.php
```

Trace once: the single `current_user_can()` call is the plugin's gate.

### How to represent in the audit

```yaml
capability_gate: manage_options  # confirmed at includes/admin/class-<plugin>-rest-controller.php line 64
```

Plugin-specific capabilities (e.g. WooCommerce's `manage_woocommerce` for
shop-aware contexts, Jetpack Forms' `edit_pages`) substitute for
`manage_options` cleanly — the shape stays the same.

## Mechanism B — Post-type-backed (core CPT capability machinery)

The controller extends a WordPress core post-type-backed class that
dispatches to the post-type capability map. There is no local
`check_permission()` — the permission callback resolves dynamically at
request time based on the request context (read vs write) and the post
type's `cap` object.

### Identifying signs

- The controller's base class is one of:
  - `WP_REST_Posts_Controller` — the core post-type REST base.
  - A subclass of it, in or out of this plugin's repo.
- No local `check_permission()` — permission callbacks are inherited.
- The post type is registered with `capability_type => '<cpt_or_shadow>'`,
  and the cap map is resolved by core's `map_meta_cap()`.

### How to trace

```bash
# Find the post-type registration.
grep -rn "register_post_type\s*(\s*['\"]<cpt_name>['\"]" .

# Read the registration block. The relevant fields are:
#   - capability_type: the type whose cap map this post type uses.
#     A custom post type can either declare its own caps or shadow another
#     type's (e.g. capability_type => 'page' to reuse Pages' caps).
#   - capabilities: optional explicit cap-string overrides.
#   - map_meta_cap: whether meta caps (read_post, edit_post) get mapped to
#     primitive caps (read_private_<type>s, edit_others_<type>s).
```

Dynamic resolution typically lands at:

- **Read context** (GET list / GET item): `current_user_can('read_private_<type>s')` or `current_user_can('read_<type>', $id)`.
- **Write context** (POST / PUT / DELETE): `current_user_can('edit_<type>s')`, `current_user_can('edit_others_<type>s')`, or `current_user_can('delete_<type>s', $id)`.

The two often differ — post-type-backed plugins routinely have distinct read
and write caps.

### How to represent in the audit

Use the structured `{read, write}` form from `audit-schema.md`:

```yaml
capability_gate:
  read: read_private_pages
  write: edit_others_pages
  confirmed: true
  verified_at: "custom_post_type capability_type='page' → core map_meta_cap (wp-includes/post.php) → primitive page caps"
```

In each ability's `permission` block, spell out both calls:

```yaml
permission:
  callback: get_items_permissions_check
  resolves_to: "WP_REST_Posts_Controller::get_items_permissions_check (inherited) → current_user_can('read_private_pages')"
  confirmed: true
```

Example A — generic plugin shadowing core Pages caps. A custom post type
registered with `capability_type='page'` inherits the Pages cap map, so
reads gate on `read_private_pages` and writes gate on `edit_others_pages`.

Example B — WooCommerce-style sidebar. WooCommerce's `shop_subscription` is
registered with `capability_type='shop_order'`, so reads gate on
`read_private_shop_orders` and writes gate on `edit_shop_orders`.
Mechanically identical to Example A; the cap names are project-specific.
WooCommerce also exposes a helper `wc_rest_check_post_permissions()` that
wraps the same core machinery — the helper is convenience; the underlying
mechanism is core's `map_meta_cap()`.

## Compound-string form (accepted, not preferred)

Some earlier audits encoded compound gates as a single string with a `/`
separator:

```yaml
capability_gate: read_private_pages / edit_others_pages
```

This is accepted for backwards compatibility, but:

- Downstream consumers have to heuristically split on `/`.
- YAML comments after the string are silently dropped by strict parsers, so
  provenance gets lost.
- The `{read, write}` object form is machine-parseable and carries
  `confirmed` and `verified_at` in-band.

Prefer the structured form for any new audit.

## Procedure — trace the permission source for each proposed behavior

The ability's permission should match the plugin's intended gate for the
proposed *behavior*, not necessarily the REST route. Often the REST
controller's `permission_callback` is the right source of truth, but in
some plugins the canonical permission lives elsewhere — an admin-action
handler with its own `check_admin_referer` + `current_user_can` block, a
service / helper method that performs the check before doing the work, a
domain-policy / authorization layer, or a post-type cap shadow resolved
through core's `map_meta_cap`. The audit should preserve where the
permission canonically lives so the implementer doesn't silently drift
to whichever source the REST layer happens to expose.

For each proposed ability, walk the chain once:

1. Identify the *behavior* the ability surfaces, then locate where the
   plugin enforces the cap for that behavior. Check the REST controller's
   `permission_callback` first; if the REST callback is `'__return_true'`,
   delegates entirely, or doesn't match the behavior's intended gate,
   look for the canonical source in an admin handler, a shared service
   method, a domain-policy class, or a post-type cap map.
2. Record where the gate lives in the ability's `permission.source` field
   per `audit-schema.md`: one of `rest_controller`, `admin_action`,
   `service`, `domain_policy`, `post_type_map`, `none`. Default
   `rest_controller`; pick another value when the canonical source is
   elsewhere.
3. Determine whether the gate is Mechanism A (local method, single cap)
   or Mechanism B (inherited, post-type-backed, dynamic).
4. Resolve to the actual `current_user_can()` call(s). For Mechanism B,
   resolve BOTH read and write if the ability crosses contexts.
5. Record in the ability's `permission.resolves_to` field verbatim — the
   string should read as an actual trace, not a best-guess summary.
6. Add a risk note when the canonical permission source diverges from
   the REST controller's callback: the ability's `permission_callback`
   must consult the canonical source (or replicate its check), not
   copy the REST callback by reflex.
7. If every behavior in the plugin resolves to the same cap (or same
   `{read, write}` pair) at the same source, hoist it into the top-level
   `capability_gate`. If any behavior diverges in cap OR in source,
   record the divergence in "Notes and Surprises".

## Common pitfall — `permission_callback => '__return_true'`

Zero-arg public endpoints sometimes declare `permission_callback =>
'__return_true'` at the REST layer (e.g. status lookups, enumerated lists
that are safe to expose). The audit still needs a gate:

- Record the REST-layer value as-is (`resolves_to:
  "__return_true (public)"`) so the auditor isn't hiding reality.
- Add a risk note: the **ability** registration must NOT copy
  `'__return_true'` — the ability's own `permission_callback` must match
  the plugin's intended user gate (e.g. `manage_options`, `edit_pages`, or
  whatever your plugin uses). The ability layer is the agent-facing surface
  and needs that gate even when the underlying REST route is public.
