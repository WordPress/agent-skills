# Error code vocabulary

Every `WP_Error` returned from an ability's execute callback should use a code drawn from this small vocabulary. A consistent vocabulary lets the agent (or the caller in your automation) build retry and recovery logic that matches on codes instead of parsing error messages.

## Why standardized codes matter

Agents that orchestrate multiple abilities need to know: "did this fail because of my input, or because something downstream is unreachable?" The answer drives retry strategy:

- Bootstrap failures → surface to the human, don't retry.
- Input shape errors → fix the input and retry the same call.
- Transient backend errors → retry with backoff; may succeed on its own.
- Upstream third-party errors → may need a different strategy entirely.

Without a convention, every plugin invents its own codes and agents can't reason uniformly across them. The categories below cover 95% of real-world ability errors; sticking to them means an agent that learned the retry logic for one plugin can reuse it for the next.

## Vocabulary

Substitute `<plugin>` with the plugin's slug in lowercase, underscores only. This matches WordPress error-code conventions. If the plugin already has a house style — for example, a single-word slug that deliberately omits underscores between elided words — mirror that. Consistency within a plugin trumps consistency across the vocabulary.

| Code | When to use | Agent behavior |
|---|---|---|
| `<plugin>_not_initialized` | Plugin class missing, shared service accessor returns null, required dependency isn't resolvable. | Not retriable from the agent side. Usually a config or bootstrap-ordering problem. Escalate. |
| `<plugin>_missing_<field>` | A required input field is missing or empty (your execute callback's own check, not the schema-validator's). | Agent should add the field and retry. |
| `<plugin>_invalid_<field>` | Field is present but semantically wrong (bad enum value, malformed date, wrong type). | Agent should correct the value and retry. |
| `<plugin>_<resource>_data_unavailable` | Backing service returned a transient error (cache miss + remote failure, upstream 5xx, stale-while-revalidate failed). | Agent can retry, probably with backoff. |
| `ability_invalid_input` | The Abilities API's own schema-validator rejected the input before the execute callback ran. | Equivalent to `<plugin>_missing_<field>` or `<plugin>_invalid_<field>`, just thrown earlier in the pipeline. Agent should fix input. |

### `ability_invalid_input` — the earlier path

When an ability is invoked via the Abilities API REST bridge, the registered `input_schema` runs first. Missing required fields or type mismatches produce `WP_Error( 'ability_invalid_input' )` BEFORE the execute callback fires. Direct invocation (unit tests, non-REST wrappers) bypasses schema validation and hits your execute callback's own checks instead, producing `<plugin>_missing_<field>` / `<plugin>_invalid_<field>`.

Both paths are acceptable — end-agent-facing behavior is equivalent (deterministic validation error, no side effects). Document the observation in the ability's PR description or "notes for reviewers" so reviewers know both codes are expected in different harness runs.

## Worked examples

```php
// Bootstrap incomplete — plugin class missing or accessor returned null.
return new \WP_Error(
    '<plugin>_not_initialized',
    __( '<Plugin> is not initialized.', '<text-domain>' )
);

// Required field missing (execute-callback check, schema was bypassed).
return new \WP_Error(
    '<plugin>_missing_<field>',
    __( 'A <field> is required to <do the thing>.', '<text-domain>' )
);

// Field present but malformed.
return new \WP_Error(
    '<plugin>_invalid_<field>',
    sprintf(
        /* translators: %s: input parameter name. */
        __( 'The "%s" parameter must be an ISO 8601 date-time string.', '<text-domain>' ),
        $key
    )
);

// Transient backend error.
return new \WP_Error(
    '<plugin>_<resource>_data_unavailable',
    __( 'Unable to retrieve <resource> data. The cache may be stale or the remote service returned an error.', '<text-domain>' )
);
```

## Upstream codes can bubble through — and usually should

If the backing controller talks to a third-party API (Stripe, WPCOM, another SaaS), its own error codes may surface verbatim in `WP_Error::get_error_code()` the ability returns. Typical examples:

- `resource_missing` — Stripe's "object ID not found" code. Tells an agent the specific ID was wrong.
- `rate_limited` — upstream throttling. Tells an agent to slow down.

**Let these through rather than re-wrapping.** A re-wrapped `<plugin>_<resource>_not_found` loses the information that would help the agent act. Document the upstream codes you've observed in the ability's `description` or PR notes so reviewers know they're expected.

## Code naming rules

1. **Lowercase, underscores only.** `<plugin>_missing_order_id`, not `<plugin>-missingOrderId` or `<Plugin>-MissingOrderId`.
2. **Plugin prefix first.** Multi-word slugs should normalize to a single-word prefix where the plugin already does (e.g. `woopayments` rather than `woo_payments`).
3. **Action second.** Use one of `missing`, `invalid`, `not_initialized`, `<resource>_data_unavailable`.
4. **Field or resource name last.** `<plugin>_missing_dispute_id`, not `<plugin>_dispute_id_missing`. This matches English phrasing ("a dispute_id is required") and is faster to skim in error logs.

## Internationalization

Error MESSAGES are translatable via `__()` or `sprintf(__())`. Error CODES are not — they're stable machine identifiers.

```php
// WRONG — don't translate the code.
return new \WP_Error( __( '<plugin>_missing_order_id', '<text-domain>' ), ... );

// RIGHT — code is a literal, message is translatable.
return new \WP_Error(
    '<plugin>_missing_order_id',
    __( 'An order_id is required.', '<text-domain>' )
);
```

When a message interpolates a parameter name or value, include a translator comment:

```php
return new \WP_Error(
    '<plugin>_invalid_date',
    sprintf(
        /* translators: %s: input parameter name. */
        __( 'The "%s" parameter must be an ISO 8601 date-time string.', '<text-domain>' ),
        $key
    )
);
```

## Don't over-specify

The goal is consistent codes across all of a plugin's abilities, not ultra-fine granularity. `<plugin>_missing_dispute_id` is the right level. `<plugin>_missing_dispute_id_in_submit_evidence_context` is not — the ability name belongs in `WP_Error::get_error_data()` or in the agent's calling context, not in the code.

## Summary — the four questions

When writing an execute callback, ask in order:

1. Can the plugin even service this call? → `<plugin>_not_initialized`.
2. Is the required input present? → `<plugin>_missing_<field>`.
3. Is the required input the right shape? → `<plugin>_invalid_<field>`.
4. Did the backing service choke? → `<plugin>_<resource>_data_unavailable`, or let the upstream code bubble through.

Four categories, one consistent code vocabulary per plugin. That's enough for agents to build reliable retry logic on top.
