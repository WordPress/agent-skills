# Autoloaded options

Autoloaded options are loaded on *every request*, so large autoload payloads can hurt performance site-wide.

## Quick checks

Measure what WordPress actually loads, via `wp_load_alloptions()`:

- Total autoload bytes:
  - `wp eval 'echo array_sum( array_map( "strlen", wp_load_alloptions() ) );'`
- Find biggest autoloaded options (bytes, then name):
  - `wp eval '$o = array_map( "strlen", wp_load_alloptions() ); arsort( $o ); foreach ( array_slice( $o, 0, 20, true ) as $k => $v ) { echo "$v\t$k\n"; }'`

Do not use `wp option list --autoload=on` for this. It matches only the `on` and `yes` autoload values, so it undercounts on WordPress 6.6+, which also autoloads options stored as `auto` (the default for new options) and `auto-on`. Options stored as `no`, `off` or `auto-off` are not autoloaded.

`wp doctor check autoload-options-size` runs the same `wp option list` query, so treat its figure as a lower bound.

Docs:

- `wp_load_alloptions()`: https://developer.wordpress.org/reference/functions/wp_load_alloptions/
- `wp option list`: https://wpcli.dev/docs/option/list
- `wp doctor` includes an `autoload-options-size` check:
  - https://make.wordpress.org/cli/handbook/doctor-default-checks/

## Fix patterns

- Stop autoloading large blobs:
  - store large data in non-autoload options (autoload=off)
  - move large computed data to transients/object cache
- Remove stale options left behind by removed plugins/themes (careful: confirm usage before deleting).

