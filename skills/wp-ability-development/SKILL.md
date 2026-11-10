---
name: wp-ability-development
description: "Use when designing, updating, or reviewing the schemas or behavior of a WordPress ability."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+)."
---

# WordPress Ability Development

## When to use

Use this skill when deciding what a WordPress ability accepts, returns, or does. For registration, exposure, and client usage, see [wp-abilities-api](../wp-abilities-api/SKILL.md).

## Context to gather

Identify who will call the ability, what they want to do, what information they already have, and what they need back. For example, a caller opening a note from a permalink may have its slug, while an editor loading a saved draft may already have its ID. The information available to each caller helps you choose the inputs the ability should support.

For an existing ability, read its schemas and callbacks to see what it accepts, returns, and changes. Check related abilities for shared object shapes and terminology. If the ability is published, look at its documentation, tests, and known call sites to identify what callers already rely on before changing the contract.

## Procedure

### Start with the caller’s task

Describe the request in the caller’s words. Use that vocabulary in the ability’s name, field descriptions, and result, then map those concepts to the implementation. In field descriptions, explain what each field controls and, where it matters, what omission means. A caller should be able to choose the ability and form a request from its name, description, and schemas.

For example, “Find published posts by this author” suggests `where.status` and `where.author`. The callback can translate those fields into WordPress query arguments.

### Keep the input small and precise

- Ask for what the caller needs to supply. Accept a reference when the ability can look up the rest. For example, take a product ID and quantity and calculate the price from stored data.
- Add a field when it serves a clear caller need. Each extra option adds combinations to validate and support.
- Start strict. Set `additionalProperties: false` on objects with a defined set of fields, including nested objects. Use types, allowed values, and bounds that match what the ability can handle. For example, rejecting a misspelled filter gives the caller a chance to correct the request before it matches a broader set of records. Broaden what the ability accepts when a use case calls for it, preserving the meaning of existing requests.

### Give related fields their own types

Group fields that describe one concept in a nested object with its own schema. A named object gives callers and developers a value they can validate, pass around, and reuse independently.

For example, an ability that exposes both raw and rendered content might group them as `content.raw` and `content.rendered`. If it also returns publication and modification dates in both site time and GMT, those dates might share a type with `site` and `gmt` fields.

Use nested objects for related input controls so each group can evolve on its own. Prefer one clear input form for a task. When there are distinct scenarios, model the choice inside the relevant object so common inputs only need one definition. Define what each branch requires and accepts so the schema rejects mixed or incomplete requests.

For example, if a lookup supports both ID and slug, its `selector` object can use `oneOf` to accept exactly one of those forms.

### Give each ability one predictable success shape

Choose a stable result type and structure for every successful call. A collection query returns a collection whether zero, one, or many records match, so the caller can iterate over the results in every case. A top-level `oneOf` that alternates between a single record and a collection makes callers check the shape before they can use it. Check that the intended clients support the schema features you use.

### Return what the caller needs

- Give callers enough detail to use the result directly. For example, an order summary can include product names alongside their IDs when the caller needs to display them.
- Return useful values the ability already computed. For example, a checkout ability can include the discounts and taxes it used to calculate the total. The caller can show the actual breakdown without having to reproduce the pricing rules.
- Report what a write changed. Return the relevant saved state and describe side effects the caller needs to know about, such as whether placing an order also created a customer account.
- Require fields that define a successful result. Use `null` for supporting values that can be unavailable, and explain what it means. Specify separately when a field may be omitted. For example, an order result can require the order ID and return `null` for the receipt URL while the receipt is being prepared.
- Keep the response focused. Include details the caller may see and can use. Weigh the cost of fetching, computing, and returning extra data against the work it saves the caller.

### Model errors and empty results

- Return `WP_Error` when the requested operation fails. Keep error codes and the shape of their data stable so callers can handle failures programmatically. Document the codes callers can act on. MCP clients receive only the message, not the code or data, so write each message to say what went wrong and what the caller can do next.
- Treat expected empty results as successful calls. A query with no matches returns its usual collection shape with an empty array of items. Choose empty values that match their declared types and describe what they mean.
- Check for errors from the data source before returning an empty result. Return `WP_Error` if a required database query, remote request, or other read fails. A caller may treat an empty collection as a reason to create a record, which can lead to a duplicate if the read failed.
- When a write fails partway, describe what changed and what you could not confirm. Include that information in the error message so the caller can check the outcome before retrying. Say that nothing changed only when you can establish that.
- When the main operation can succeed with an incomplete result, define an `errors` array alongside the result in the output schema. Give each entry a stable code and a message, with a path to the affected field or recovery data where useful. For example, an ability can return the saved order with an `errors` entry pointing to an unavailable inventory count. Return an empty `errors` array on full success.

### Keep CRUD abilities consistent

Prefer `{object}-{action}` within the namespace so related abilities sort together. Use separate `query` and `get` abilities for collections and single-record lookups. Use `create`, `update`, and `delete` for the corresponding writes.

- Use the same names, types, meanings, and nesting for shared fields across the family, including writable fields in `create` and `update`. For example, if `post-query` and `post-get` both expose raw content, use `content.raw` in both results.
- Group a list ability’s filters in one input object such as `where`. Describe how the filters combine so callers know whether all conditions must match, any can match, or another rule applies.
- Prefer partial updates for ordinary edits. Require the target and accept the fields the caller wants to change. For example, a title edit can send the post ID and new title. The caller can make the edit without sending back a copy of the body that may be stale.

  Apply only the supplied fields and define how to clear a value when clearing is supported. For nested values, say whether supplied fields edit individual members or replace the value as a unit. Require a complete value when replacement is the intended operation.

### Describe side effects with annotations

Set `readonly`, `destructive`, and `idempotent` in `meta.annotations` for each ability. Base the values on what happens during execution, including effects from hooks and services it calls.

- `readonly: true` means execution leaves its environment unchanged.
- `destructive: true` means execution may remove or overwrite existing state. Use `destructive: false` when any writes are purely additive.
- `idempotent: true` means repeating the call with the same input has no additional effect. For example, a title update that sends a notification every time has an additional effect even when the title already matches.

For help checking these claims against the implementation, see [wp-abilities-verify](../wp-abilities-verify/SKILL.md).

### Enforce permissions during execution

Use the permission callback for a preflight check that callers can run without executing the ability. Enforce authorization during execution before reading protected data or making changes. Share the authorization rules where both paths check the same thing.

Some checks depend on what the ability finds at runtime. For example, a query’s preflight can establish whether the caller may request a collection. During execution, check which of the matching records and fields the caller may see before returning them.

REST and MCP can expose permission error messages to callers. Keep protected data out of the message and any returned error details. When a record’s existence is sensitive, give the same response for missing and inaccessible records.

## Verification

- Exercise the normal invocation path with a representative request, invalid input, and denied access where applicable. Check the returned shape against the schema.
- For queries, check zero, one, and multiple matches. For partial updates, try a single-field change and check the stored values as well as the response. Verify how omission and explicit clearing behave.
- For changes to a published ability, check representative calls that rely on its existing contract. In a review, tie each finding to a caller-visible consequence and a concrete correction.

## Failure modes / debugging

- A partial update changes extra fields. Trace where the implementation fills in defaults or replaces a nested value, and compare that behavior with the intended edit.
- A client rejects a schema that WordPress accepts. Reproduce the failure through that client and check its support for the relevant schema keywords or result shape.

## Escalation

When an incompatible change to a published ability is needed, identify which calls would break and make the migration decision explicit.
