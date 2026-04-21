# Capability-Gate Tracing

How to resolve the actual capability (or capabilities) a plugin's REST
controllers gate on. The audit's `capability_gate` field and each ability's
`permission.resolves_to` field need to reflect reality, not what the
controller docblock says.

Validation runs against multiple plugins surfaced two common mechanisms —
document both explicitly so the auditor doesn't hard-code WooPayments-style
assumptions.

## Mechanism A — Direct (`check_permission()` returning a single cap)

The base REST controller declares a `check_permission()` (or
`permissions_check()`) method that calls `current_user_can('<some_cap>')`
once. Every route in the controller uses that method as
`permission_callback`.

### Identifying signs

- The base controller has a method like:
  ```php
  public function check_permission() {
      return current_user_can( 'manage_woocommerce' );
  }
  ```
- Controllers extend the plugin's own base, not a WooCommerce/WordPress core
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
capability_gate: manage_woocommerce  # confirmed at includes/admin/class-<plugin>-rest-controller.php line 64
```

Example: WooPayments — every controller inherits
`WC_Payments_REST_Controller::check_permission()` which resolves to
`current_user_can('manage_woocommerce')`. One gate for the whole plugin.

## Mechanism B — Post-type-backed (`wc_rest_check_post_permissions()`)

The controller extends a WooCommerce/WordPress core class that dispatches to
the post-type capability map. There is no local `check_permission()` — the
permission callback resolves dynamically at request time based on the
request context (read vs write) and the post type's `cap` object.

### Identifying signs

- The controller's base class is one of:
  - `WC_REST_Orders_Controller` (WooCommerce core)
  - `WC_REST_Posts_Controller`
  - `WP_REST_Posts_Controller`
  - Similar post-type-backed bases.
- No local `check_permission()` — permission callbacks are inherited.
- The post type is registered with `capability_type => '<cpt_name>'` and
  meta caps are mapped (usually by `map_meta_cap` in core).

### How to trace

```bash
# Find the post-type registration.
grep -rn "register_post_type\s*(\s*['\"]<cpt_name>['\"]" .

# Check the capability_type and meta caps configuration.
# The caps bag typically looks like:
#   capability_type => '<shadow_type>' (e.g. 'shop_order' for shop_subscription)
# which means the post type inherits the caps of the shadow type, which in
# turn are registered by the plugin's Install class (grep for 'get_core_capabilities').
```

Dynamic resolution typically lands at:

- **Read context** (GET list / GET item): `current_user_can('read_private_<type>s')` or `current_user_can('read_<type>', $id)`.
- **Write context** (POST / PUT / DELETE): `current_user_can('edit_<type>s')` or `current_user_can('delete_<type>s', $id)`.

The two often differ — post-type-backed plugins routinely have distinct read
and write caps.

### How to represent in the audit

Use the structured `{read, write}` form from `audit-schema.md`:

```yaml
capability_gate:
  read: read_private_shop_orders
  write: edit_shop_orders
  confirmed: true
  verified_at: "shop_subscription capability_type='shop_order' → WC core wc_rest_check_post_permissions() at includes/wc-rest-functions.php line 229"
```

In each ability's `permission` block, spell out both calls:

```yaml
permission:
  callback: get_items_permissions_check
  resolves_to: "wc_rest_check_post_permissions('shop_subscription', 'read') → current_user_can('read_private_shop_orders')"
  confirmed: true
```

Example: WooCommerce Subscriptions — `shop_subscription` is registered with
`capability_type='shop_order'`, so reads gate on `read_private_shop_orders`
and writes gate on `edit_shop_orders`. The audit captures both.

## Compound-string form (accepted, not preferred)

Some earlier audits encoded compound gates as a single string with a `/`
separator:

```yaml
capability_gate: read_private_shop_orders / edit_shop_orders
```

This is accepted for backwards compatibility, but:

- Downstream consumers have to heuristically split on `/`.
- YAML comments after the string are silently dropped by strict parsers, so
  provenance gets lost.
- The `{read, write}` object form is machine-parseable and carries
  `confirmed` and `verified_at` in-band.

Prefer the structured form for any new audit.

## Procedure — trace every route you'll back

For each proposed ability, walk the chain once:

1. Find the route's `permission_callback` in the controller.
2. Determine whether it's Mechanism A (local method, single cap) or
   Mechanism B (inherited, post-type-backed, dynamic).
3. Resolve to the actual `current_user_can()` call(s). For B, resolve BOTH
   read and write if the ability crosses contexts.
4. Record in the ability's `permission.resolves_to` field verbatim — the
   string should read as an actual trace, not a best-guess summary.
5. If every route in the plugin resolves to the same cap (or same
   `{read, write}` pair), hoist it into the top-level `capability_gate`. If
   any route diverges, record the divergence in "Notes and Surprises".

## Common pitfall — `permission_callback => '__return_true'`

Zero-arg public endpoints sometimes declare `permission_callback =>
'__return_true'` at the REST layer (e.g. status lookups, enumerated lists
that are safe to expose). The audit still needs a gate:

- Record the REST-layer value as-is (`resolves_to:
  "__return_true (public)"`) so the auditor isn't hiding reality.
- Add a risk note: the **ability** registration must NOT copy
  `'__return_true'` — the ability's own `permission_callback` must match the
  plugin's merchant gate (`manage_woocommerce`, `edit_pages`, etc.). The
  ability layer is the agent-facing surface and needs that gate even when
  the underlying REST route is public.
