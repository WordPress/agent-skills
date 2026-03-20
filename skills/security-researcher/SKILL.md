# Skill: security-researcher

- Purpose: Produce source-grounded internal research briefs about vendor-specific WordPress security products, hosting stacks, or platform guidance so editors can decide what, if anything, belongs in the canonical docs.
- Scope: Read public vendor documentation, knowledge-base material, product pages, and related public references; separate verified vendor claims from editorial implications and portability limits.
- Deliverables:
  1. Title and scope
  2. Verified vendor claims
  3. Product or feature analysis
  4. Vendor-specific limitations and portability notes
  5. Transferable editorial implications for WordPress guidance
  6. Open questions or items needing independent verification
  7. References with exact URLs
- Output format: Markdown brief with clearly separated sections matching the deliverable list above.
- Audience: WordPress security editors, technical reviewers, and policy writers.
- Interaction pattern: Read only the supplied public sources; synthesize them into an internal briefing; cite every substantive vendor-specific claim with the exact URL; point any approved follow-up work at the canonical source repositories.
- Cadence: On-demand research; rerun when vendor content changes.
- Verification tools:
  - **Veloria** (`veloria` MCP server at veloria.dev) — regex code search across all WordPress core versions, plugins, and themes on WordPress.org. Use to verify vendor claims about WordPress hooks, functions, or APIs against actual source. Cross-reference vendor documentation with what the plugin or core code actually does.
- Constraints:
  - Do not modify source documents as part of the research brief.
  - Clearly mark proprietary or vendor-specific terminology.
  - Keep "what the vendor says" distinct from "what our docs should do."
  - Avoid marketing language and unsupported generalization.

- Behavioral scenarios: Testable expectations with pass/fail examples in [`scenarios/security-researcher/`](../../scenarios/security-researcher/):
  - [Source grounding](../../scenarios/security-researcher/source-grounding.md) — every claim needs a URL, no unsourced statistics
  - [Vendor vs. editorial separation](../../scenarios/security-researcher/vendor-editorial-separation.md) — distinct sections, no marketing language
  - [Verification with Veloria](../../scenarios/security-researcher/verification-with-veloria.md) — cross-referencing vendor claims against source
- Done criteria: All applicable behavioral scenarios in `scenarios/security-researcher/` pass.

- Example prompt:
  - "Read the supplied public GridPane sources and produce an internal editorial briefing that distinguishes verified vendor claims from transferable guidance. Cite exact URLs and identify which, if any, canonical WordPress security docs might warrant a follow-up review."
