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
NOT assume `npm run wp-env start` works for every plugin. Common patterns
seen in real plugin trees:

- `npm run wp-env start` — projects using `@wordpress/env` with a checked-in
  `.wp-env.json`.
- `npx wp-env start` — projects using `@wordpress/env` without a custom
  npm script wrapper.
- `composer install && composer test-php --setup-only` — package-local
  test bootstraps that don't run a full WordPress install.
- `docker-compose up -d` — plugin-specific dev Docker stacks.

Plugin families with their own dev tooling will have their own bring-up
command in `AGENTS.md`; follow it as documented.

If `AGENTS.md` doesn't document it, ask the user rather than guessing.
Record the env-up command + the corresponding wp-cli invocation (e.g.
`npx wp-env run cli wp`) and use them uniformly for the rest of the
harness.

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

- WordPress version >= 6.9 (Abilities API available in core).
- The plugin being verified is active.
- `wp_get_abilities` exists (true if WP >= 6.9, else the Abilities API
  feature plugin/package must be active).

Any "no" answer halts the harness.

## Check 1 — ability names match source-expected list

Enumerate runtime abilities and diff against the static inventory from
`static-enumeration.md`:

```bash
<env-cli> wp --user=admin eval '
$names = array_filter(
    array_keys( (array) wp_get_abilities() ),
    function ( $n ) {
        return strpos( $n, "<plugin-slug>/" ) === 0;
    }
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
    function ( $n ) {
        return strpos( $n, "<plugin-slug>/" ) === 0;
    }
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
}
'
```

Cross-reference each annotation against the audit's declared value (if an
audit was provided) AND against the static inventory's declared value.
Mismatch on either axis → FAIL.

This check complements the static adversarial check from
`annotation-correctness.md`: static checks the callback's actual
behavior; runtime checks what the registration hook resolved to at boot
time. Both must agree for the annotations to be trustworthy.

## Check 3 — each read ability's `execute()` behaves as the contract claims

Two verification levels. The smoke level catches bootstrap and gross-error
regressions; the high-confidence level is the one that actually exercises
the ability against the data shape it will see in production. Run both
when the audit doc provides `seed_data_needs`; run the smoke level alone
when it doesn't.

### Level 1 — smoke execution (synthetic inputs)

Confirm each read returns `OK` or a vocabulary `WP_Error`. Catches PHP
fatals, un-bootstrapped services, registration failures.

```bash
<env-cli> wp --user=admin eval '
$reads = array(
    "<plugin-slug>/<read-ability-1>",
    "<plugin-slug>/<read-ability-2>",
    // ...
);
foreach ( $reads as $name ) {
    $r = wp_get_ability( $name )->execute();
    echo $name . ": " . ( is_wp_error( $r ) ? "WP_Error(" . $r->get_error_code() . ")" : "OK" ) . PHP_EOL;
}
'
```

Acceptable outcomes:

- `OK` — the ability returned without error.
- `WP_Error(<plugin>_not_initialized)` — bootstrap guard fired (e.g.
  un-bootstrapped service). Happy error path.
- `WP_Error(<plugin>_<resource>_data_unavailable)` — transient backend
  error. Acceptable.
- `WP_Error(<upstream_code>)` — upstream third-party error bubbled
  through. Document, don't block.

Unacceptable:

- PHP fatal → stop the harness.
- `WP_Error` with a non-vocabulary code → WARN. Cross-reference
  `../../wp-abilities-api/references/error-code-vocabulary.md`.

Abilities with required input get invoked separately with a
synthetic-but-plausible value:

```bash
<env-cli> wp --user=admin eval '
$r = wp_get_ability( "<plugin>/<ability-with-required-input>" )
    ->execute( array( "<field>" => "<synthetic-id>" ) );
echo "<ability>: " . ( is_wp_error( $r ) ? "WP_Error(" . $r->get_error_code() . ")" : "OK" ) . PHP_EOL;
'
```

A synthetic ID on a fresh install typically triggers
`<plugin>_<resource>_data_unavailable` or an upstream-equivalent code.
Both are acceptable for Level 1 — they mean "ability dispatched cleanly,
the backing reported no data," which is the smoke signal.

### Level 2 — high-confidence verification (representative seeded data)

Synthetic inputs catch fatals and gross errors. They do NOT catch wrong
IDs returning the wrong record, cached sentinel values being served
instead of fresh data, permission gates appearing correct against a
synthetic ID but not against a real one, filtered labels diverging from
the unfiltered claim, missing capabilities surfacing only when a real
record is in scope, or curated output drift (a new field added to the
controller that the ability inherits and now leaks). These are the
failure modes that matter and they only fall out when the ability runs
against the data shape it will see in production.

For each ability whose audit entry declares a non-null `seed_data_needs`,
seed the environment per that field, then call the ability with
representative inputs (a real id, a real slug — not a synthetic
placeholder), and assert the output shape AND the privacy contract:

```bash
<env-cli> wp --user=admin eval '
// Seed once at the top of the harness run, per the audit doc:
// e.g. wp post create, wp user create, wp option update, factory helpers.

$ability = wp_get_ability( "<plugin>/<read-ability>" );
$result  = $ability->execute( array( "<field>" => "<real-id-from-the-seeded-data>" ) );

if ( is_wp_error( $result ) ) {
    echo "FAIL: " . $result->get_error_code() . PHP_EOL;
    exit;
}

// Assert the documented output shape — keys present, types correct.
$expected_keys = array( "id", "label", "status" );  // from the ability schema or audit return_type
foreach ( $expected_keys as $k ) {
    if ( ! array_key_exists( $k, (array) $result ) ) {
        echo "FAIL: missing output key " . $k . PHP_EOL;
        exit;
    }
}

// Assert the privacy contract: sensitive fields the contract does NOT
// promise must not appear (e.g. full PAN, full bank account, raw token,
// internal-only debug fields).
$forbidden_keys = array( "full_pan", "card_number", "bank_account_number", "iban" );
foreach ( $forbidden_keys as $k ) {
    if ( array_key_exists( $k, (array) $result ) ) {
        echo "FAIL: privacy leak — " . $k . " present in output." . PHP_EOL;
        exit;
    }
}

echo "PASS: shape OK, privacy OK." . PHP_EOL;
'
```

Adapt `$expected_keys` and `$forbidden_keys` to each ability. The audit
doc's `return_type` field hints at the shape; the privacy keys depend on
the plugin's domain. For payments-family plugins, full PANs / bank
numbers / raw tokens are the canonical forbidden set; other families
substitute appropriately. The plugin's in-tree contract tests (the
overlay's `test-the-public-contract.md` for WooCommerce extensions) are
the durable home for these assertions on every CI run — this Level 2
check is the one-off harness run that produces the PR artifact.

When the audit doc declares `seed_data_needs: null`, Level 2 is not yet
runnable: the auditor has not identified the seed shape. The harness
reports `LEVEL 2: pending (seed_data_needs is null — ask the
implementer)` and proceeds. When `seed_data_needs` is a string, the
harness operator seeds per that description before running the
representative-input block above.

## Check 4 — each write ability's missing-input returns `ability_invalid_input` or `<plugin>_missing_<field>`

```bash
<env-cli> wp --user=admin eval '
$a = wp_get_ability( "<plugin>/<write-ability>" );

$r1 = $a->execute( array() );
echo "missing: " . ( is_wp_error( $r1 ) ? "WP_Error(" . $r1->get_error_code() . ")" : "UNEXPECTED_OK" ) . PHP_EOL;

$r2 = $a->execute( array( "<required_field>" => 123 ) );
echo "non-string: " . ( is_wp_error( $r2 ) ? "WP_Error(" . $r2->get_error_code() . ")" : "UNEXPECTED_OK" ) . PHP_EOL;
'
```

Acceptable codes, per
`../../wp-abilities-api/references/error-code-vocabulary.md`:

- `ability_invalid_input` — the Abilities API's schema validator fired
  first (normal REST-bridge path; emitted by
  `WP_Ability::validate_input()` in core).
- `<plugin>_missing_<field>` — the execute callback's own guard fired
  (direct-invocation path).
- `<plugin>_invalid_<field>` — same, for the wrong-type case.

`UNEXPECTED_OK` → FAIL. Validation is missing; the ability accepted
no-input and proceeded to do something it shouldn't have.

## Check 5 — permission gate denies subscriber, allows admin

```bash
<env-cli> wp --user=admin eval '
$ability = wp_get_ability( "<plugin>/<any-ability>" );
$input   = array(); // representative input; substitute for non-object root schemas.

// Admin path.
wp_set_current_user( 1 );
$admin_result = $ability->check_permissions( $input );

// Subscriber path.
$sub_login = "verify_sub_" . time();
$sub_id    = wp_create_user( $sub_login, "x", $sub_login . "@example.com" );
if ( ! is_wp_error( $sub_id ) ) {
    $user = get_user_by( "id", $sub_id );
    $user->set_role( "subscriber" );
    wp_set_current_user( $sub_id );
    $sub_result = $ability->check_permissions( $input );
} else {
    $sub_result = $sub_id; // surface the create_user error in the report
}

foreach ( array( "admin" => $admin_result, "subscriber" => $sub_result ) as $context => $r ) {
    if ( true === $r ) {
        $printable = "true";
    } elseif ( is_wp_error( $r ) ) {
        $printable = "WP_Error(" . $r->get_error_code() . ")";
    } else {
        $printable = var_export( $r, true );
    }
    echo $context . ": " . $printable . PHP_EOL;
}

// Cleanup the test subscriber so repeated harness runs don't accumulate users
// on shared dev environments. Switch back to admin first since we last ran as
// the subscriber and that role doesn't hold delete_users. On multisite,
// wp_delete_user() only removes the user from the current site's membership —
// wpmu_delete_user() in wp-admin/includes/ms.php is the network-wide delete.
if ( isset( $sub_id ) && ! is_wp_error( $sub_id ) ) {
    wp_set_current_user( 1 );
    if ( is_multisite() ) {
        require_once ABSPATH . "wp-admin/includes/ms.php";
        wpmu_delete_user( $sub_id );
    } else {
        require_once ABSPATH . "wp-admin/includes/user.php";
        wp_delete_user( $sub_id );
    }
}
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

`check_permissions()` returns `bool|WP_Error` per `WP_Ability::check_permissions()`
in WordPress core. A `WP_Error` with code `ability_invalid_permission_callback`
means the registration didn't supply a valid callable — a hard FAIL. A
`WP_Error` with code `ability_callback_exception` means the callback
threw — also a hard FAIL.

## Check 6 — twin-invocation heuristic for idempotent abilities

Only apply this to abilities annotated `idempotent: true` whose `execute()`
returned without error in Check 3. Per `annotation-correctness.md` step
"Runtime check complement", this is a *heuristic*: idempotent in core
means "no additional effect on the environment" (per the `idempotent`
annotation's docblock in `class-wp-ability.php`), not "byte-identical
return values."

```bash
<env-cli> wp --user=admin eval '
$a  = wp_get_ability( "<plugin>/<idempotent-ability>" );
$r1 = $a->execute();
$r2 = $a->execute();

if ( is_wp_error( $r1 ) || is_wp_error( $r2 ) ) {
    echo "skipped: one or both invocations returned WP_Error" . PHP_EOL;
    if ( is_wp_error( $r1 ) ) { echo "r1=" . $r1->get_error_code() . PHP_EOL; }
    if ( is_wp_error( $r2 ) ) { echo "r2=" . $r2->get_error_code() . PHP_EOL; }
} else {
    $h1 = md5( serialize( $r1 ) );
    $h2 = md5( serialize( $r2 ) );
    echo "match=" . var_export( $h1 === $h2, true ) . PHP_EOL;
    echo "h1=" . $h1 . PHP_EOL;
    echo "h2=" . $h2 . PHP_EOL;
}
'
```

Interpretation:

- `match=true` → cheap PASS. Same input produced the same response, and
  any environmental writes (write abilities) were the same on both calls.
- `match=false` → inspect what changed before deciding:
  - Response embeds a per-call timestamp, nonce, or random ID →
    environment unchanged. Still idempotent under core's reading.
    Optionally remove the field if the agent doesn't need it; the
    annotation stays `idempotent: true`.
  - Response reflects a counter or sequence that grew between calls →
    real environmental change. FAIL: drop the `idempotent: true`
    annotation or fix the underlying write to be input-determined.

For ambiguous cases (response varies but no obvious counter), supplement
with a state diff: snapshot a representative table or option before call
1, snapshot after call 2, diff. If state changed by more than the input
writes would explain, the ability is non-idempotent.

## Output format

The runtime harness writes a dedicated section in the run report:

```markdown
## Runtime harness

**Env:** wp-env (Docker), WordPress 7.0, <plugin> <version>
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

Observed pattern:

1. Harness surfaces a PHP fatal (e.g. `ArgumentCountError: Too few
   arguments to function <controller>::__construct`).
2. Implementer fixes the bug in a focused commit.
3. Harness re-runs; write the post-fix output as the headline status.
4. Preserve the pre-fix trace in the report under a "Pre-fix status"
   section so reviewers can see what verify caught.

This is the highest-leverage signal the runtime harness produces:
bootstrap-ordering and missing-dependency bugs that pass static review
because the source declares the right shape — they only manifest when
the registration runs against a booted WordPress.
