# Runtime Harness

The runtime-mode procedure. Everything static-mode does, plus six canonical
checks that need a live `wp_get_abilities()` call.

Static mode catches structural problems (annotation lies, schema lint
failures, audit mismatches). Runtime mode catches the class of bug that
only surfaces against a booted WordPress: missing constructor arguments,
bootstrap-ordering issues, schema-validator paths, capability-roundtrip
failures, and idempotency violations at the response-byte level.

## Harness rule: stop on first fatal

If any step below produces a PHP fatal, STOP. Later steps won't produce
meaningful output. Capture the failure, escalate to the plugin's
implementer to fix, then re-run from step 1.

A `WP_Error` return is acceptable — any `<plugin>_*` or upstream-prefixed
error means the execute callback handled the error path gracefully. Only
PHP fatals block.

## Step 0 — identify the env-up command

Read the plugin's `AGENTS.md` for the canonical env bring-up command. Do
NOT assume `npm run wp-env start` works for every plugin. Observed
patterns:

- **Woo-family (WooPayments, WooCommerce extensions)** — `npm run wp-env start`
  (runs `@wordpress/env` with the plugin's `.wp-env.json`).
- **Jetpack-family** — `jetpack docker up` or a package-local
  `composer install && composer test-php --setup-only`.
- **Plain wp-env plugin** — `npx wp-env start`.
- **Dev Docker stack** — a plugin-specific `docker-compose up -d`.

If `AGENTS.md` doesn't document it, ask the user rather than guessing.
Record the env-up command + the corresponding wp-cli invocation (e.g.
`npx wp-env run cli wp`, `jetpack docker cli wp`) and use them uniformly
for the rest of the harness.

In this file, `<env-cli>` is shorthand for whatever wp-cli invocation the
plugin uses.

## Step 1 — bring up the env and sanity-check

```bash
<env-up-command>
<env-cli> wp core version
<env-cli> wp plugin list --status=active
<env-cli> wp eval 'var_export( function_exists( "wp_get_abilities" ) );'
```

Confirm:

- WordPress version >= 6.9 (abilities API available in core).
- The plugin being verified is active.
- `wp_get_abilities` exists (true if WP >= 6.9, else abilities API plugin
  must be active).

Any "no" answer halts the harness.

## Check 1 — ability names match source-expected list

Enumerate runtime abilities and diff against the static inventory from
`static-enumeration.md`:

```bash
<env-cli> wp --user=admin eval '
$names = array_filter(
    array_keys( (array) wp_get_abilities() ),
    fn( $n ) => str_starts_with( $n, "<plugin-slug>/" )
);
sort( $names );
echo "count=" . count( $names ) . PHP_EOL;
echo implode( PHP_EOL, $names ) . PHP_EOL;
'
```

Compare against the static inventory:

- Source contains ability, runtime missing → FAIL. Registration hook
  isn't firing; check init hook timing and plugin activation.
- Runtime contains ability, source missing → WARN. Dynamic registration
  path the enumerator couldn't follow. Document but don't block.
- Counts match → OK.

## Check 2 — annotations read back as declared

```bash
<env-cli> wp --user=admin eval '
$names = array_filter(
    array_keys( (array) wp_get_abilities() ),
    fn( $n ) => str_starts_with( $n, "<plugin-slug>/" )
);
sort( $names );
foreach ( $names as $name ) {
    $a = wp_get_ability( $name );
    $m = $a->get_meta();
    printf(
        "%s | readonly=%s | destructive=%s | idempotent=%s | category=%s" . PHP_EOL,
        $name,
        var_export( $m["annotations"]["readonly"], true ),
        var_export( $m["annotations"]["destructive"], true ),
        var_export( $m["annotations"]["idempotent"], true ),
        $a->get_category()
    );
}'
```

Cross-reference each annotation against the audit's declared value (if an
audit was provided) AND against the static inventory's declared value.
Mismatch on either axis → FAIL.

This check complements the static adversarial check from
`annotation-correctness.md`: static checks the callback's actual
behavior; runtime checks what the registration hook resolved to at boot
time. Both must agree for the annotations to be trustworthy.

## Check 3 — each read ability's `execute([])` returns OK or a standard-vocabulary WP_Error

```bash
<env-cli> wp --user=admin eval '
$reads = [
    "<plugin-slug>/<read-ability-1>",
    "<plugin-slug>/<read-ability-2>",
    // ...
];
foreach ( $reads as $name ) {
    $r = wp_get_ability( $name )->execute( [] );
    echo $name . ": " . ( is_wp_error( $r ) ? "WP_Error(" . $r->get_error_code() . ")" : "OK" ) . PHP_EOL;
}'
```

Acceptable outcomes:

- `OK` — the ability returned an array.
- `WP_Error(<plugin>_not_initialized)` — bootstrap guard fired (e.g.
  un-bootstrapped account). Happy error path.
- `WP_Error(<plugin>_<resource>_data_unavailable)` — transient backend
  error. Acceptable.
- `WP_Error(<upstream_code>)` — upstream error bubbled through (e.g.
  Stripe's `resource_missing`). Document, don't block.

Unacceptable:

- PHP fatal → stop the harness.
- `WP_Error` with a non-vocabulary code → WARN. Cross-reference
  `../wp-abilities-api/references/error-code-vocabulary.md`.

Abilities with required input get invoked separately with a
synthetic-but-plausible value:

```bash
<env-cli> wp --user=admin eval '
$r = wp_get_ability( "<plugin>/<ability-with-required-input>" )
    ->execute([ "<field>" => "<synthetic-id>" ]);
echo "<ability>: " . ( is_wp_error( $r ) ? "WP_Error(" . $r->get_error_code() . ")" : "OK" ) . PHP_EOL;
'
```

A synthetic ID on a fresh store typically triggers upstream
`resource_missing` or `<plugin>_<resource>_data_unavailable`. Both are
acceptable.

## Check 4 — each write ability's missing-input returns `ability_invalid_input` or `<plugin>_missing_<field>`

```bash
<env-cli> wp --user=admin eval '
$a = wp_get_ability( "<plugin>/<write-ability>" );

$r1 = $a->execute( [] );
echo "missing: " . ( is_wp_error( $r1 ) ? "WP_Error(" . $r1->get_error_code() . ")" : "UNEXPECTED_OK" ) . PHP_EOL;

$r2 = $a->execute( [ "<required_field>" => 123 ] );
echo "non-string: " . ( is_wp_error( $r2 ) ? "WP_Error(" . $r2->get_error_code() . ")" : "UNEXPECTED_OK" ) . PHP_EOL;
'
```

Acceptable codes, per
`../wp-abilities-api/references/error-code-vocabulary.md`:

- `ability_invalid_input` — the Abilities API's schema validator fired
  first (normal REST-bridge path).
- `<plugin>_missing_<field>` — the execute callback's own guard fired
  (direct-invocation path).
- `<plugin>_invalid_<field>` — same, for the wrong-type case.

`UNEXPECTED_OK` → FAIL. Validation is missing; the ability accepted
no-input and proceeded to do something it shouldn't have.

## Check 5 — permission gate denies subscriber, allows admin

```bash
<env-cli> wp --user=admin eval '
// Admin path.
wp_set_current_user( 1 );
$ability = wp_get_ability( "<plugin>/<any-ability>" );
echo "admin: " . var_export( $ability->user_can_execute(), true ) . PHP_EOL;

// Subscriber path.
$sub = wp_create_user( "verify_sub_" . time(), "x", "verify_sub_" . time() . "@example.test" );
$user = get_user_by( "id", $sub );
$user->set_role( "subscriber" );
wp_set_current_user( $sub );
echo "subscriber: " . var_export( $ability->user_can_execute(), true ) . PHP_EOL;
'
```

Expected:

```
admin: true
subscriber: false
```

Any inversion is a bug in the registered `permission_callback`. See
`permission-roundtrip.md` for the deeper cross-checks (audit's declared
capability → registered callback → resolved `current_user_can(...)`).

Public abilities (deliberately ungated) expect `subscriber: true` AND
`admin: true`. Verify that the ability's `permission_callback` is
`'__return_true'` in source before accepting this outcome.

## Check 6 — idempotent reads return byte-for-byte identical results on twin invocations

Per `annotation-correctness.md` step "Runtime check complement":

```bash
<env-cli> wp --user=admin eval '
$a = wp_get_ability( "<plugin>/<idempotent-read-ability>" );
$r1 = $a->execute( [ /* same input */ ] );
$r2 = $a->execute( [ /* same input */ ] );
$h1 = md5( serialize( $r1 ) );
$h2 = md5( serialize( $r2 ) );
echo "match=" . var_export( $h1 === $h2, true ) . PHP_EOL;
echo "h1=$h1" . PHP_EOL;
echo "h2=$h2" . PHP_EOL;
'
```

Expected: `match=true` and two identical hashes.

Twin-invocation differ on an `idempotent: true` ability → FAIL. Common
causes:

- Response embeds `time()` or `current_time()`.
- Response embeds a nonce.
- Response embeds a non-deterministic queue state.

Either remove the nondeterministic field (preferred) or change the
annotation to `idempotent: false`. Don't loosen the check.

## Output format

The runtime harness writes a dedicated section in the run report:

```markdown
## Runtime harness

**Env:** wp-env (Docker), WordPress 6.9, <plugin> <version>
**Captured:** <YYYY-MM-DD HH:MM>

### Check 1 — enumeration

count=7 (expected 7 from static inventory)
<sorted list>

### Check 2 — annotations

| Ability | readonly | destructive | idempotent | Matches source? |
|---|---|---|---|---|

### Check 3 — read execution

| Ability | Result |
|---|---|

### Check 4 — write input validation

| Ability | Missing-input code | Wrong-type code |
|---|---|---|

### Check 5 — permission gate

| Ability | admin | subscriber | Expected |
|---|---|---|---|

### Check 6 — idempotency

| Ability | match | h1 | h2 |
|---|---|---|---|

### Notes / surprises

<Anything unexpected that didn't block.>
```

## When the harness catches a bug

Observed pattern (from the canonical harness-output example):

1. Harness surfaces a PHP fatal (e.g. `ArgumentCountError: Too few
   arguments to function <controller>::__construct`).
2. Implementer fixes the bug in a focused commit.
3. Harness re-runs; write the post-fix output as the headline status.
4. Preserve the pre-fix trace in the report under a "Pre-fix status"
   section so reviewers can see what verify caught.

The canonical example is
`/Users/rtiodev/rtiodev_vault/plans/2026-04-20-abilities-everywhere-woopayments-harness-output.md`
— exactly this class of ArgumentCountError was caught by a runtime
harness run and fixed in a dedicated small commit.
