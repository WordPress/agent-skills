# Measurement loop — token-budget evaluation for ability sets

A registered ability set competes for a finite resource: the agent's tool-list context window. Even an annotation-correct, schema-clean, runtime-passing ability set can be unshippable if its serialized form burns through the agent's context before it gets to do useful work. This reference covers why measurement matters as a verification axis distinct from correctness, the provisional budget the project is using today, and the planned integration with the rest of the verify skill once the measurement tool itself is publishable.

> **Stub status.** The measurement skill (`wp-abilities-measure`) referenced below is in active development and is not yet published. This reference captures current findings and the integration plan; the TODO block at the end lists what needs to land when the skill ships.

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

## Skill status

The measurement tool exists as a work-in-progress skill named `wp-abilities-measure`. It is currently developed against an internal tracking issue and has not yet been published to `WordPress/agent-skills`. When it ships, this reference will be replaced with:

- The skill's exact name and invocation.
- The integration point with `wp-abilities-verify` (see "Planned integration" below).
- The canonical budget table (small / medium / large plugin tiers).
- A worked example of measure → fail → redesign → re-measure.

Until then, treat this reference as a placeholder that captures the problem framing.

## Planned integration with `wp-abilities-verify`

`wp-abilities-verify` will gain a measurement check that:

1. Enumerates the registered abilities for the target plugin.
2. Calls `wp-abilities-measure` against the resulting `tools/list` payload.
3. Compares the result to the per-plugin budget.
4. Fails (or warns, depending on flag) if the result is over budget.
5. Emits a per-ability token breakdown so the redesign can target the heaviest contributors.

The measurement check is independent of the existing static, runtime, and schema-lint checks. An ability set can pass annotation correctness and runtime smoke and still fail measurement — that combination indicates a projection problem, not a correctness problem.

## What to do until the skill ships

Manual measurement is feasible:

- Serialize your plugin's `tools/list` payload (e.g., via the MCP debug tooling or by enumerating `wp_get_abilities()` and rendering the same shape an MCP server would return).
- Run the result through Anthropic's `count_tokens` API for the model your agent uses.
- Compare to the 2,000-token smoke threshold above.

If you are over budget, redesign at the **projection** layer first — see `../../wp-abilities-api/references/domain-vs-projection.md` for why projection is the right axis. Common moves: collapse atomized abilities into semantic-grouped abilities; introduce a single-tool facade; introduce nested-discovery meta-tools that defer schema cost to per-intent describe calls. The set of registered domain capabilities does not need to change; only the consumer-facing projection does.

## TODO — replace this stub when `wp-abilities-measure` is published

- Replace the "Skill status" section with the concrete invocation (skill name, prompt template, expected output shape).
- Add the canonical budget table covering small / medium / large plugin tiers.
- Document the `--measure` (or equivalent) flag in `wp-abilities-verify` and how it integrates with CI.
- Add a worked example: measure → fail → redesign at projection layer → re-measure → pass.
- Move the Plugin X / Plugin Y numbers to a "case studies" subsection if they still apply, or refresh them against the current state.

## Related references

- `../../wp-abilities-api/references/domain-vs-projection.md` — the axis along which to redesign when the measurement check fails.
- `../../wp-abilities-api/references/grouping-heuristic.md` — the within-domain decisions that affect baseline token cost.
- `static-enumeration.md` — how this skill discovers the ability set whose tokens to measure.
