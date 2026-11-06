# Autoloaded options

Autoloaded options are loaded on *every request*, so large autoload payloads can hurt performance site-wide.

## Quick checks

- Total autoload bytes:
  - `wp eval 'echo array_sum( array_map( "strlen", wp_load_alloptions() ) );'`
- Find biggest autoloaded options:
  - `wp eval '$options = wp_load_alloptions(); uasort( $options, static fn( $a, $b ) => strlen( $b ) <=> strlen( $a ) ); foreach ( array_slice( $options, 0, 10, true ) as $name => $value ) { echo $name . "\t" . strlen( $value ) . PHP_EOL; }'`

`wp_load_alloptions()` measures what WordPress actually loads, including options stored with `yes`, `on`, `auto`, and `auto-on` on WordPress 6.6+. Values `no`, `off`, and `auto-off` are not autoloaded. The autoload values can be filtered, so use the function instead of hard-coding the values in a query.

`wp option list --autoload=on` and the `wp doctor check autoload-options-size` check count only `yes` and `on`, so they can undercount on WordPress 6.6+. Use the `wp eval` total above to confirm the size; treat the doctor result as a quick signal only.

Docs:

- `wp option list`: https://wpcli.dev/docs/option/list
- `wp_load_alloptions()`: https://developer.wordpress.org/reference/functions/wp_load_alloptions/
- `wp_autoload_values_to_autoload()`: https://developer.wordpress.org/reference/functions/wp_autoload_values_to_autoload/
- `wp doctor` includes an `autoload-options-size` check:
  - https://make.wordpress.org/cli/handbook/doctor-default-checks/

## Fix patterns

- Stop autoloading large blobs:
  - store large data in non-autoload options (autoload=off)
  - move large computed data to transients/object cache
- Remove stale options left behind by removed plugins/themes (careful: confirm usage before deleting).

