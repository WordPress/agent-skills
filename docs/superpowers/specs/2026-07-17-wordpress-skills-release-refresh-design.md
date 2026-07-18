# WordPress Skills Release Refresh Design

## Goal

Bring the WordPress agent-skills package into conformance with the stable WordPress ecosystem releases available on July 17, 2026, correct every issue identified in the release audit, and add deterministic checks that prevent the same unsafe examples and stale release claims from returning. Apply the current Agent Skills authoring, description, evaluation, and scripting guidance while making those corrections.

## Compatibility contract

The repository's existing two-floor policy remains authoritative:

- Skills describing APIs available in WordPress 6.9 continue to target WordPress 6.9+ and PHP 7.2.24+.
- Skills that require WordPress 7.0 APIs continue to target WordPress 7.0+ and PHP 7.4+.
- Current tooling may require a newer development runtime than the target site's PHP floor. Skills must state that distinction where it affects installation or execution.
- Stable releases are the baseline. Beta, release-candidate, nightly, and trunk behavior may be mentioned only when clearly labeled and must not replace stable guidance.

The release snapshot for this change is:

- WordPress core 7.0.2, with 6.9.5 as the maintained 6.9 branch.
- Gutenberg 23.5.3.
- WordPress Playground CLI 3.1.45 and the live Blueprint V1/V2 schema.
- WP-CLI 2.12.0.
- MCP Adapter 0.5.0.
- WordPress AI plugin 1.2.0, PHP AI Client 1.4.0 standalone, PHP AI Client 1.3.1 bundled by WordPress 7.0.2, and WP AI Client 0.4.0.
- Plugin Check 2.0.0.
- PHPStan 2.2.5, szepeviktor/phpstan-wordpress 2.0.3, and php-stubs/wordpress-stubs 7.0.1.

## Scope

### In scope

- Correct the nine skills identified by the audit.
- Make the WPDS skill useful when its optional MCP dependency is absent.
- Refresh and harden shared WordPress/Gutenberg release indexes.
- Add regression coverage for each concrete audit failure.
- Update existing evaluation scenarios or add focused scenarios where a future agent must apply new version-conditional guidance.
- Bring the repository's authoring guide, scaffold, description checks, scenario validation, and evaluation artifacts into line with the current Agent Skills guidance.
- Preserve unaffected procedures and the repository's existing writing style.

### Out of scope

- Raising the repository-wide WordPress or PHP compatibility floors.
- Rewriting all twenty skills from scratch.
- Editing generated copies in external Codex/plugin caches; the source repository remains the authority.
- Adding guidance for unreleased WordPress 7.1 behavior.
- Automatically rewriting skill prose from live upstream data without human review.

## Design

### 1. Deterministic release-conformance layer

The existing `eval/harness/run.mjs` validates frontmatter and triage output but does not check reference correctness. Add `eval/harness/release-conformance.mjs`, invoke it from the existing harness, and have it read the skill and reference files to enforce repository contracts.

The checks will assert both positive requirements and dangerous-string exclusions. Examples include:

- Blueprint guidance identifies both V1 and V2 and does not describe object-form V1 login credentials as optional defaults.
- Playground guidance names 3.1.45, uses `start` for the normal local workflow, uses `--xdebug`, `--workers`, and `--wordpress-install-mode`, and excludes removed or ignored flags.
- MCP guidance requires `meta.mcp.public` for default-server exposure and contains the released 0.5.0 class namespaces.
- Client-side Abilities examples do not call an undefined `currentUserCan()` and explicitly enqueue the required package.
- AI Client error examples branch on `is_wp_error()` and never call result metadata methods on `WP_Error`.
- Block-development guidance describes the conditional WordPress 7.0 iframe behavior.
- Plugin Directory guidance treats `License URI` as optional while retaining the GPL-compatible-license requirement.
- AI, Interactivity API, and theme.json references contain their WordPress 7.0/current-release additions.
- WPDS includes a documented no-MCP fallback based on canonical WordPress developer sources.

These checks are offline and deterministic. Live freshness remains the responsibility of the upstream-index script and scheduled automation; the harness proves that checked-in guidance is internally consistent with the checked-in release snapshot.

### 2. Blueprint and Playground

`blueprint` becomes V2-first for new work while retaining a clearly separated V1 compatibility reference. It will document the V2 top-level model, version-specific networking behavior, supported PHP releases through 8.5, and the exact V1 `login` union behavior. Examples must declare their Blueprint version or be explicitly labeled V1.

`wp-playground` will align commands and troubleshooting with CLI 3.1.45. The normal local workflow will use `start`; `server` remains documented as the advanced server command. Removed aliases and deprecated/ignored worker switches will be replaced with their current equivalents. Snapshot and Blueprint workflows will retain their current commands when confirmed by CLI help.

### 3. Abilities API and MCP Adapter

The default MCP server section will distinguish public discovery from custom-server explicit exposure:

- Default discovery/get/execute tools operate only on abilities marked `meta.mcp.public === true`.
- Custom servers may explicitly include selected abilities and are not described as a shortcut around permission callbacks.
- The custom-server example will use the exact MCP Adapter 0.5.0 namespaces and retain the verified thirteen-parameter `create_server()` shape.
- The parent Abilities skill keeps its PHP 7.2.24 floor, but the optional MCP decision point must state that Adapter 0.5.0 requires PHP `^7.4 || ^8.0` and stop on PHP 7.2/7.3 until the runtime is upgraded.
- Multi-plugin installation must use `automattic/jetpack-autoloader` and bootstrap `vendor/autoload_packages.php`; the main skill must explicitly load the MCP reference before emitting install, bootstrap, or server code.

Client-side guidance will use a runnable permission callback. It will distinguish registering scripts from enqueueing them and instruct plugins to explicitly enqueue `@wordpress/core-abilities` on the admin surfaces where it is needed. The skill will retain the package-store import pattern that avoids hard-coded store-name differences.

### 4. AI Client and AI plugin

`wp-ai-client` will separate error-result and successful-result inspection. `WP_Error` paths use `get_error_code()`, `get_error_message()`, and `get_error_data()`; provider and model metadata methods are shown only after success. The skill will distinguish the standalone PHP AI Client release from the version bundled in WordPress core so agents do not assume Composer-latest behavior is present in core.

`wp-ai-plugin` will target the canonical 1.2.0 release. Its feature inventory will include Type Ahead, Key Encryption, and Suggest Reply, while retaining the verified twelve-method Feature contract and two standard dashboard widgets. References will cover the new read-content/read-users abilities, advanced settings, default-timeout filter, and current extension hooks without deleting still-supported 1.0-era behavior.

### 5. Blocks, themes, and Interactivity API

`wp-block-development` will state the released WordPress 7.0 iframe rule precisely: the post editor remains iframed only while every inserted block uses API version 3 or later; inserting an older block disables the iframe for backward compatibility. API version 3 remains the required recommendation for new blocks.

`wp-block-themes` will retain theme.json version 3 and add WordPress 7.0 dimension width/height controls, relevant presets, and button pseudo-element styling.

`wp-interactivity-api` will add the released `watch()` lifecycle and cleanup pattern, `core/router` URL state, and deprecations for `navigation.hasStarted` and `navigation.hasFinished`. Existing WordPress 6.9 directive guidance remains intact and version-labeled.

### 6. Plugin Directory Guidelines

The license review contract will require a declared GPL-compatible license but treat `License URI` as optional in both plugin headers and readme metadata. Checklists and examples will distinguish recommended metadata from submission-blocking requirements. The guidance will continue to use current Plugin Check and the eighteen detailed directory guidelines as primary references.

### 7. WPDS dependency behavior

`wpds` will keep the WPDS MCP server as the preferred canonical component/token source when available. Its procedure will first test service availability. If unavailable, the skill will use official WordPress Design System, Components, Storybook, and package documentation for read-only research, explicitly note that MCP-only resources could not be queried, and avoid inventing component APIs or token names. This turns a hard operational block into a bounded fallback without weakening source requirements.

### 8. Shared upstream indexes

Refresh `wordpress-core-versions.json` and `gutenberg-releases.json` from their canonical APIs. Repair the WordPress/Gutenberg version-map extraction so a changed documentation layout cannot silently produce an accepted empty table.

Move the HTML mapping parser into `shared/scripts/upstream-index-lib.mjs` and export it for offline testing. The index updater will fail with an actionable error when required data cannot be parsed instead of writing `table-not-found` with zero rows. `eval/harness/release-conformance.mjs` will exercise successful and missing-data parser fixtures without network access. Documentation will explain the failure contract and the commands used for live refresh.

### 9. Agent Skill quality contract

The repository will encode the current Agent Skills creator guidance from the official best-practices, description-optimization, evaluation, and script-authoring documents.

- Every description uses the repository's imperative `Use when ...` convention, describes user intent and activation boundaries rather than summarizing the workflow, and remains below the 1,024-character specification limit. The three descriptions that currently fail this contract (`wp-abilities-audit`, `wp-abilities-verify`, and `wp-playground`) receive focused trigger evaluation rather than broad, unmeasured rewrites of all twenty descriptions.
- Each `SKILL.md` remains below 500 lines. Deep reference material stays in one-hop `references/` files with explicit load conditions so progressive disclosure is useful rather than merely structural.
- Every skill is covered by at least one valid JSON output scenario. Skill scenarios require a non-empty known-skill list; repository-maintenance scenarios use the explicit `repository-infrastructure` kind and an empty skill list. The harness validates both forms, non-empty behavioral expectations, and the absence of obsolete Markdown scenario files.
- Each changed description gets a fixed trigger-eval corpus of twelve training queries and eight validation queries, each split evenly between realistic should-trigger cases and near-miss should-not-trigger cases. Six fresh holdout queries are added only after selecting the description. Validation and holdout results must not be used to tune wording.
- Output-quality checks use three risk-based representative pairs—Blueprint V2, Abilities/MCP, and Interactivity watcher lifecycle—comparing the candidate with the pre-change snapshot in clean copied workspaces. Assertions must be observable, passes require evidence, runner timing/token telemetry is retained when emitted, and human review covers qualities that cannot be reduced safely to assertions. This sample is not presented as exhaustive output benchmarking of every edited skill.
- New or modified command-line scripts are non-interactive, provide concise successful `--help`, reject ambiguous input, emit actionable errors and meaningful exit codes, keep stdout predictable, and avoid partial or destructive writes. Stateful or destructive behavior requires a dry-run/check mode when applicable.
- Generic static budget bands are review signals, not substitutes for the official progressive-disclosure contract or observed usage. A static deferred total may aggregate references and executable source that are never loaded together; it blocks release only when it identifies a concrete loading defect or an observed benchmark confirms harmful cost.

Add `eval/harness/skill-quality.mjs` for the deterministic portion of this contract. Repair `shared/scripts/scaffold-skill.mjs` so it creates repository-standard JSON scenarios from a required realistic prompt instead of obsolete Markdown, and make the scaffold's help/error behavior testable without touching the repository checkout.

## Testing strategy

Each affected area follows red-green verification:

1. Add a focused assertion or parser test reproducing the current defect.
2. Run it against the unmodified skill content and confirm the expected failure.
3. Apply the smallest coherent skill/reference change.
4. Re-run the focused check before moving to the next affected skill.
5. Run the full harness after all focused checks are green.

Skill behavior also follows a baseline/current comparison:

1. Define realistic prompts and success criteria before changing skill instructions or descriptions.
2. Capture the current-skill or no-skill baseline in a clean context.
3. Apply only changes justified by the release defect or observed evaluation failure.
4. Re-run with the changed skill, grade assertions with concrete evidence, and review the actual output.
5. Keep fixed validation prompts out of the wording-tuning loop and use fresh holdouts for the final description sanity check.

The final verification set will include:

- Release-conformance tests covering all audited findings.
- Upstream-index parser unit tests, including changed/missing-table failure behavior.
- Agent Skill quality checks covering description form, `SKILL.md` size, JSON scenario schema and complete skill coverage, fixed trigger-eval splits, and scaffold CLI behavior.
- Existing prompt scenarios for affected skills plus new scenarios where version-conditional application matters.
- Three clean-context baseline/current evaluations for representative high-risk changed behavior, with evidence-bearing assertion grades, runner telemetry, and targeted human review.
- `node eval/harness/run.mjs`.
- Frontmatter/reference integrity checks.
- `git diff --check` and a clean review of the complete intended diff.
- Live upstream-index refresh followed by verification that generated files match canonical current stable releases.

## Acceptance criteria

- Every audit finding has a corresponding source change and regression check.
- All twenty skills retain valid frontmatter and their intended compatibility floor.
- No example recommends a removed CLI flag, invalid PHP class, undefined JavaScript helper, or invalid result method.
- New Blueprint work is V2-first while V1 remains accurately supported.
- Default MCP exposure and client-side enqueue behavior match released WordPress/MCP source.
- Current AI plugin, Interactivity API, block-editor iframe, theme.json, and Plugin Directory behavior is represented.
- WPDS remains canonical-source-driven and can proceed safely without the MCP server.
- Shared release indexes contain current non-empty data, and parser failure cannot silently overwrite good data with an empty mapping.
- All descriptions meet the activation contract; all `SKILL.md` files stay within the progressive-disclosure line budget; every skill has a valid JSON scenario.
- The three corrected descriptions have balanced fixed train/validation corpora plus untouched fresh holdouts, and their final wording passes the selected activation checks without overfitting.
- The retained behavioral-evidence artifact records three clean candidate/baseline comparisons, successful workspace-local skill reads, observable assertion grades, telemetry, human dispositions, and the explicit limitation that trigger rates were not measured.
- The scaffold produces a valid JSON scenario from a realistic prompt, supports `--help`, and fails ambiguous invocation without leaving partial output.
- Static analysis has no unresolved correctness, broken-link, unsafe-script, or measured-regression finding; comparative budget signals and the intentional repository `compatibility` key are documented rather than hidden.
- The full deterministic verification suite passes with no unintended workspace changes.
