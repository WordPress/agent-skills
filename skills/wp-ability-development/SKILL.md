---
name: wp-ability-development
description: "Use when designing, updating, or reviewing the schemas or behavior of a WordPress ability."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+)."
---

# WordPress Ability Development

## When to use

Use this skill when deciding what a WordPress ability accepts, returns, or does. For registration, exposure, and client usage, see [wp-abilities-api](../wp-abilities-api/SKILL.md).

## Inputs required

- The task the caller wants to perform and the information they can supply.
- The existing ability and related object schemas, when available. For changes to a published ability, identify the callers that rely on its contract.

## Procedure

### Start with the caller’s task

Describe the request in the caller’s words. Use that vocabulary in the ability’s name, field descriptions, and result, then map those concepts to the implementation.

For example, “Find published posts by this author” suggests `where.status` and `where.author`. The callback can translate those fields into WordPress query arguments.

### Keep the input small and precise

- Ask for what the caller needs to supply. Accept a reference when the ability can look up the rest. For example, take a product ID and quantity and calculate the price from stored data.
- Add a field when it serves a clear caller need. Each extra option adds combinations to validate and support.
- Start strict. Set `additionalProperties: false` on objects with a defined set of fields, including nested objects. Use types, allowed values, and bounds that match what the ability can handle. Broaden what it accepts when a use case calls for it, preserving the meaning of existing requests.

### Give related fields their own types

Group fields that describe one concept in a nested object with its own schema. A named object gives callers and developers a value they can validate, pass around, and reuse independently.

For example, an ability that exposes both raw and rendered content might group them as `content.raw` and `content.rendered`. If it also returns publication and modification dates in both site time and GMT, those dates might share a type with `site` and `gmt` fields.

Use nested objects for related input controls so each group can evolve on its own. Prefer one clear input form for a task. When there are distinct scenarios, model the choice inside the relevant object so common inputs only need one definition. Define what each branch requires and accepts so the schema rejects mixed or incomplete requests.

For example, if a lookup supports both ID and slug, its `selector` object can use `oneOf` to accept exactly one of those forms.

### Give each ability one predictable success shape

Choose a stable result type and structure for every successful call. A collection query returns a collection whether zero, one, or many records match. Avoid top-level output unions such as a `oneOf` between a single record and a collection. Check that the intended clients support the schema features you use.

### Return what the caller needs

- Give callers enough detail to use the result directly. For example, an order summary can include product names alongside their IDs when the caller needs to display them.
- Return useful values the ability already computed. For example, a checkout ability can include the discounts and taxes it used to calculate the total.
- Report what a write changed. Return the relevant saved state and describe side effects the caller needs to know about, such as whether placing an order also created a customer account.
- Require fields that define a successful result. Use `null` for supporting values that can be unavailable, and explain what it means. Specify separately when a field may be omitted.
- Keep the response focused. Include details the caller may see and can use. Weigh the cost of fetching, computing, and returning extra data against the work it saves the caller.

### Model errors and empty results

- Return `WP_Error` when the requested operation fails. Keep error codes and the shape of their data stable so callers can handle failures programmatically. Document the codes callers can act on, and use messages to explain what happened.
- Treat expected empty results as successful calls. A query with no matches returns its usual collection shape with an empty array of items. Choose empty values that match their declared types and describe what they mean.
- When the main operation can succeed with an incomplete result, define an `errors` array alongside the result in the output schema. Give each entry a stable code and a message, with a path to the affected field or recovery data where useful. Return an empty `errors` array on full success.

### Keep CRUD abilities consistent

Prefer `{object}-{action}` within the namespace so related abilities sort together. Use separate `query` and `get` abilities for collections and single-record lookups. Use `create`, `update`, and `delete` for the corresponding writes.

- Use the same names, types, meanings, and nesting for shared fields across the family, including writable fields in `create` and `update`. For example, if `post-query` and `post-get` both expose raw content, use `content.raw` in both results.
- Group a list ability’s filters in one input object such as `where`. Describe how the filters combine so callers know whether all conditions must match, any can match, or another rule applies.
- Prefer partial updates for ordinary edits. Require the target and accept the fields the caller wants to change. Apply only the supplied fields and define how to clear a value when clearing is supported. For nested values, say whether supplied fields edit individual members or replace the value as a unit. Require a complete value when replacement is the intended operation. Judge idempotency by the effects of repeating the call.

### Enforce permissions during execution

Use the permission callback for a preflight check that callers can run without executing the ability. Enforce authorization during execution before reading protected data or making changes. Share the authorization rules where both paths check the same thing, and check the specific resources and fields as they are resolved.

## Verification

- Exercise the normal invocation path with a representative request, invalid input, and denied access where applicable. Check the returned shape against the schema.
- For queries, check zero, one, and multiple matches. For partial updates, try a single-field change and verify how omission and explicit clearing behave.
- For changes to a published ability, check representative calls that rely on its existing contract. In a review, tie each finding to a caller-visible consequence and a concrete correction.

## Failure modes / debugging

- A partial update changes extra fields. Trace where the implementation fills in defaults or replaces a nested value, and compare that behavior with the intended edit.
- A client rejects a schema that WordPress accepts. Reproduce the failure through that client and check its support for the relevant schema keywords or result shape.

## Escalation

When an incompatible change to a published ability is needed, identify which calls would break and make the migration decision explicit.
