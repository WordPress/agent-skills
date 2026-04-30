# Controller Enumeration

How to produce an exhaustive list of a plugin's REST controllers — the first
step of every audit. Plugin family classification is handled separately by
`wp-project-triage`; this reference covers the mechanics of finding controller
classes inside whatever layout the plugin happens to use.

## Two enumeration paths

Observed across the plugins audited to date, there are exactly two paths that
together cover every layout seen in the wild:

| Path | When it works | How it works |
|---|---|---|
| **Glob** | Plugins that follow the standard `includes/admin/class-*-rest-*-controller.php` layout (WooCommerce core extensions, classic WooPayments). | Fast, deterministic, easy to script. Returns a complete list in one shell call. |
| **Grep** | Any non-standard layout — `includes/api/`, `includes/rest-api/`, `src/rest/`, monorepo package directories, or anything else. | Universal fallback: grep every PHP file under the plugin root for `register_rest_route(` call sites, then collect the enclosing class for each hit. |

### Default order

1. **Try glob first** — it's faster and produces a cleaner inventory.
2. **Fall back to grep** if glob returns zero hits (or clearly undercounts
   against what you see in the plugin's public documentation / admin UI).

Running both and de-duplicating is legal; it catches monorepos that have
*some* controllers under the standard layout and *others* under a package
directory.

## Glob — standard layout

```bash
# From the plugin root:
ls includes/admin/class-*-rest-*-controller.php 2>/dev/null
ls includes/reports/class-*-rest-*-controller.php 2>/dev/null
```

What you'll see in repos that match this convention:

- WooPayments (`Automattic/woocommerce-payments`) — every controller under
  `includes/admin/class-wc-rest-payments-*-controller.php` plus some under
  `includes/reports/`.
- WooCommerce core's internal REST controllers use the same pattern.

If glob returns 5+ hits, it's almost always the complete inventory. If it
returns 0-2, fall through to grep.

## Grep — universal fallback

```bash
# From the plugin root:
grep -rn --include='*.php' 'register_rest_route(' .
```

For each hit:

1. Open the file.
2. Walk up to the enclosing class declaration.
3. Record `(class, file, route, callback, permission_callback)`.

This path matters because it's the only one that finds controllers in
non-standard locations:

- **WooCommerce Subscriptions** — controllers live under `includes/api/` and
  `includes/api/legacy/`. The standard WooPayments glob returns zero; grep is
  mandatory.
- **Jetpack Forms** (and most Jetpack packages) — controllers live under
  `projects/packages/<name>/src/` with no conventional filename. Grep is
  again mandatory.
- **Custom plugin layouts** — anything with `src/Rest/`, `lib/rest/`,
  `api/v1/`, etc. Grep catches them all.

## Inherited routes

A controller can extend a base class in a different repo — typically the
parent plugin (for extensions built on top of another plugin) or WordPress
core itself (for plugins extending `WP_REST_Posts_Controller` or other core
REST bases). The `parent::register_routes()` dispatch appears in the
extending plugin's source, but the literal `register_rest_route(` call lives
in the parent. WooCommerce extensions extending
`WC_REST_Orders_Controller`, plugins built on Jetpack package REST classes,
and CPT plugins inheriting from `WP_REST_Posts_Controller` all hit this
pattern.

Handling:

- Record the route on the child class (that's where the plugin's REST surface
  actually exposes it).
- Set `backing.route_registration_line: null` and
  `backing.callback_line: null` in the audit schema.
- Add `backing.inherited_from: "<parent FQCN>"` so downstream skills can tell
  the inheritance case from a plain missing line number.
- Consider running grep against the parent repo too when you need to confirm
  the callback's request handling — inherited callbacks behave as whatever
  the parent defines, not what the plugin repo documents.

See `audit-schema.md` for the exact field shapes.

## Exhaustiveness is the goal

The "Controller Inventory" table in the audit doc must list every controller
the enumeration found — not just ones backing proposed abilities. A reviewer
asking "why isn't controller X in the MVP?" should be able to point at the
inventory and see the explicit answer (usually: "excluded from MVP because…"
or "surfaced as a gap because…").

If your inventory has 3 entries and the plugin clearly exposes more, either
the enumeration is incomplete (re-run grep with broader patterns) or you're
filtering the inventory instead of the proposal list. Fix the inventory
first; filter after.

## Escalation

If neither glob nor grep produces a complete inventory — for example a
plugin that registers routes dynamically from config or via a factory that
does not contain a literal `register_rest_route(` string — document the
enumeration gap in "Notes and Surprises", and extend this reference with the
new pattern once understood.
