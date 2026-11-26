# MCP Verification

Verify what an MCP client actually sees and observes when WordPress
abilities are exposed over an MCP endpoint.

Static source inspection and direct `WP_Ability::execute()` / WP-CLI
calls test the registered PHP ability, not the exported MCP surface.
An MCP adapter or server can filter abilities, reshape names and
schemas, wrap operations inside a generic meta-tool, alter descriptions,
or omit annotation hints. Never mark MCP verification as passing without
inspecting and exercising the intended MCP endpoint itself.

## Preconditions

- Only exercise live `tools/call` checks against a disposable test
  environment (never against a site with real users or content).
- Identify the intended MCP endpoint (URL or stdio/bridge transport) and
  which abilities are expected to be exposed (for example,
  `meta.mcp.public => true`, custom MCP server configuration, or
  explicit client requirements).

## Step 1 — Inspect `tools/list` on the intended endpoint

Query `tools/list` from a clean MCP client session targeting the
intended endpoint. Record the tool list the client actually receives,
not what documentation or PHP source claims.

Verify for every expected operation:

1. **Discoverability and form** — the expected operations appear in the
   required shape. If clients need operations exposed as individual
   tools, verify each operation has its own tool rather than being hidden
   behind a generic executor.
2. **Name and description** — the exported `name` and `description`
   accurately state what the tool reads, changes, and any irreversible
   side effects (such as sending notifications or external webhooks),
   matching the registered ability contract.
3. **Input schema (`inputSchema`)** — required fields, types, enums, and
   `additionalProperties` match the ability's `input_schema` without
   dropping constraints or adding unexpected wrappers.
4. **Annotation hints (`annotations`)** — compare the exported hints
   against the ability's `meta.annotations`:
   - `readOnlyHint` matches `readonly`
   - `destructiveHint` matches `destructive`
   - `idempotentHint` matches `idempotent`
   - If the server/adapter emits `openWorldHint`, check it matches
     whether the tool interacts with external systems beyond the site;
     remember that `readonly` and open-world are independent (a public
     web search can be both `readOnlyHint: true` and
     `openWorldHint: true`) and that WordPress core does not yet ship
     `open_world` in `meta.annotations`
     ([Core #66799](https://core.trac.wordpress.org/ticket/66799)).
   - Flag omitted hints when MCP clients would fall back to stricter or
     broader defaults (`readOnlyHint: false`, `destructiveHint: true`,
     `openWorldHint: true`) that contradict the ability contract.

## Step 2 — Exercise representative `tools/call` invocations

Run representative calls through the MCP endpoint (`tools/call`) in the
test environment and compare both the response payload and the resulting
environment state against the tool's `description` and `annotations`:

1. **Read-only tools (`readOnlyHint: true`)** — call with valid
   representative inputs and confirm the response matches the contract
   and no persistent site or external state changes.
2. **Non-destructive writes (`destructiveHint: false`)** — seed or
   record existing state beforehand (e.g., an existing post, option, or
   record), execute an additive call (e.g., creating a new draft), and
   verify that pre-existing state is neither overwritten nor removed.
3. **Destructive writes (`destructiveHint: true`)** — verify the call
   affects only the intended target state as described, and confirm
   error handling on invalid or missing inputs.
4. **Denied calls (where permissions matter)** — invoke gated tools
   using an unauthenticated or lower-privileged MCP session (such as a
   subscriber lacking the required capability). Confirm the endpoint
   rejects the call, leaves state untouched, and keeps protected record
   details out of the error message.

## Step 3 — Report unrun MCP checks as unverified

Record every MCP check honestly in the `## MCP tool verification`
section of the report:

- If running in static mode, if no MCP endpoint is reachable, or if
  only direct PHP/WP-CLI ability calls were executed, mark the MCP
  checks as **`UNVERIFIED`** and explain why (e.g., `static-only run;
  tools/list and tools/call not executed` or `direct wp_get_ability()
  checks passed; live MCP endpoint not exercised`).
- If `tools/list` was inspected for all tools but `tools/call` was run
  only on a subset, report exercised tools with their verdict (`OK`,
  `WARN`, or `FAIL`) and keep unexercised tools as `UNVERIFIED`.
- If no abilities are exposed over MCP (and none are intended to be),
  record `N/A — no MCP-exposed abilities` and cite the checked
  registration / endpoint scope.

## Output format

```markdown
## MCP tool verification

Endpoint: `<endpoint-or-none>`

| Tool / Ability | `tools/list` contract | Call & state check | Denied-call check | Status |
|---|---|---|---|---|
| `my-plugin/list-notes` (`my-plugin/list-notes`) | OK — matches name, description, schema, `readOnlyHint: true` | OK — returned 2 notes; state unchanged | OK — subscriber denied; no data leaked | OK |
| `my-plugin/create-draft` (`my-plugin/create-draft`) | OK — `destructiveHint: false` | OK — created draft #42; existing note #41 untouched | OK — subscriber denied | OK |
| `my-plugin/delete-note` (`my-plugin/delete-note`) | UNVERIFIED — static mode only (no live MCP endpoint) | UNVERIFIED | UNVERIFIED | UNVERIFIED |
```
