# Token-budget measurement for ability sets

A registered ability set competes for a finite resource: the agent's tool-list context window. Even an annotation-correct, schema-clean, runtime-passing ability set can be unshippable if its serialized form burns through the agent's context before it gets to do useful work. This reference is the conceptual primer on why measurement matters and how it relates to the projection-layer redesign axis. The actual measurement tool ships separately.

> **Tool status.** The measurement skill (`wp-abilities-measure`) is in active development and is not yet published. This reference is educational — it captures current findings, the provisional budget, and a manual workflow for ad-hoc measurement until the skill lands. Once it ships, `wp-abilities-verify` will gain a measurement check that consumes it; this file will be updated with that integration.

## Why measure

Two empirical observations drive this:

1. **Agent accuracy collapses as registered tool count grows.** Research summarized in [Architecting Tools for AI Agents at Scale](https://gziolo.pl/2026/04/09/research-architecting-tools-for-ai-agents-at-scale/) reports a drop from ~96% to under 15% accuracy as tool counts climb into the dozens.
2. **Every registered ability consumes tokens on every agent turn that includes the tool list.** A plugin with 9 atomized abilities and full output schemas can serialize to over 50,000 tokens in `tools/list`. That is most of a context window before the agent has read the user's first message.

A verifier that only checks correctness will green-light an ability set that is both correct and unusable. Measurement closes that gap.

## Provisional budget

The project is using a working budget of approximately **2,000 tokens per plugin** in the agent's `tools/list` view. This is provisional — the final budget is expected to tier (small, medium, large plugins) once measurements span a wider range of plugins. Treat the 2,000-token target as a smoke threshold: above it, the registration almost certainly needs redesigning before it ships.

## Current findings

Excerpt of the project's measurements to date, anonymized:

| Set | Pattern | Abilities | Tokens | Verdict |
|---|---|---|---|---|
| Plugin X — large surface | atomized, full schemas | 9 | 51,684 | FAIL |
| Plugin X — large surface | semantic-grouping | 4 | 1,311 | GREEN |
| Plugin X — large surface | single-tool facade | 1 | 308 | GREEN |
| Plugin X — large surface | nested-discovery (3 meta-tools) | 3 | 562 | GREEN (per-intent describe adds ~800-1,100 in real implementations) |
| Plugin Y — narrow surface | semantic (current) | 3 | 785 | PASS |
| Plugin Y — narrow surface | hypothetical atomized | 14 | 1,044 | FAIL (ability-count budget) |

Two readings worth highlighting:

- The same domain capabilities can be 51,684 tokens or 308 tokens depending on projection. The registration cost is not fixed; it is a design choice.
- Even when a projection passes the token budget, an ability-count budget can still apply — the Plugin Y hypothetical-atomized row passes on tokens but fails on count, because agent accuracy degrades on raw count independently of total token cost.

The measurements above are taken with `count_tokens` against a current Anthropic model. Numbers move as model tokenizers change; the verdict typically does not.

## Tool status

The measurement tool exists as a work-in-progress skill named `wp-abilities-measure`. It is currently developed against an internal tracking issue and has not yet been published to `WordPress/agent-skills`. Until it lands, treat the budget figures and findings on this page as the project's working numbers.

## Eventual integration with `wp-abilities-verify`

When `wp-abilities-measure` ships, `wp-abilities-verify` will gain a measurement check that:

1. Enumerates the registered abilities for the target plugin.
2. Calls `wp-abilities-measure` against the resulting `tools/list` payload.
3. Compares the result to the per-plugin budget.
4. Reports a per-ability token breakdown so a redesign can target the heaviest contributors.

That check will be a *distinct* verification axis — independent of annotation-correctness, schema lints, and runtime smoke. An ability set can pass every existing check and still fail measurement, because measurement is a projection-shape problem, not a correctness problem. Until the measurement skill ships, `wp-abilities-verify` does not run any token-budget check; the verdict it produces is silent on this axis.

## What to do until the skill ships

Manual measurement is feasible:

- Serialize your plugin's `tools/list` payload (e.g., via the MCP debug tooling or by enumerating `wp_get_abilities()` and rendering the same shape an MCP server would return).
- Run the result through Anthropic's `count_tokens` API for the model your agent uses.
- Compare to the 2,000-token smoke threshold above.

If you are over budget, redesign at the **projection** layer first — see `./domain-vs-projection.md` for why projection is the right axis. Common moves: collapse atomized abilities into semantic-grouped abilities; introduce a single-tool facade; introduce nested-discovery meta-tools that defer schema cost to per-intent describe calls. The set of registered domain capabilities does not need to change; only the consumer-facing projection does.

## Open items for when `wp-abilities-measure` ships

- Replace the "Tool status" section with the concrete invocation (skill name, prompt template, expected output shape).
- Add a canonical budget table covering small / medium / large plugin tiers (the 2,000-token figure is a single-tier smoke threshold).
- Document how `wp-abilities-verify` integrates the measurement check (a distinct verification axis, not folded into the existing PASS/FAIL aggregation).
- Add a worked example: measure → fail → redesign at projection layer → re-measure → pass.
- Refresh the Plugin X / Plugin Y numbers if model tokenizers have shifted enough to change verdicts.

## Related references

- `./domain-vs-projection.md` — the axis along which to redesign when measurement comes back over budget.
- `./grouping-heuristic.md` — within-domain decisions that affect baseline token cost.
- `../../wp-abilities-verify/references/static-enumeration.md` — how the verify skill discovers an ability set when the measurement check eventually integrates there.
