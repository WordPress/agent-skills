# Plugin Check validation

Use Plugin Check (PCP) as a validation layer for plugin code reviews and completed changes. It complements the directory checklist, functional tests, and human review; it does not certify approval or correctness.

## 1. Identify the plugin and environment

- Inspect the plugin entrypoint, declared WordPress/PHP versions, project instructions, and available lint/build/test commands before reviewing or changing code.
- Identify the actual plugin slug or source path and a local WordPress installation containing the code being reviewed. Reuse the project's command runner (for example, its existing container wrapper) and configuration.
- Use a local development/test site, not production. Plugin Check runtime checks execute plugin code.
- Verify WP-CLI and WordPress are available, then inspect `wp help plugin check` to confirm supported options. Plugin Check supplies this command; it is not built into WP-CLI alone.

From the local WordPress root, these commands inspect prerequisites:

```sh
wp --info
wp core is-installed
wp plugin is-installed plugin-check
wp plugin is-active plugin-check
wp help plugin check
```

If local environment setup is within the task's authorization, install and activate PCP when missing:

```sh
wp plugin install plugin-check --activate
```

If already installed but inactive, use `wp plugin activate plugin-check`. Preserve an existing installation rather than reinstalling it. When running outside the WordPress root, add `--path=/actual/wordpress/root` or use the project's configured runner for every site command.

If tooling is unavailable, continue the source review and give concrete commands adapted to the known environment. Mark automated validation as **not run**, with the missing prerequisite. An unavailable check is not a pass.

Even when setup is excluded, include the complete follow-up sequence as instructions only: obtain WP-CLI and a local WordPress test site, make the target source available there, install/activate PCP if needed, inspect command help, then run the checks. Do not start at `wp plugin check` when its prerequisites are missing. For a future site with WP-CLI ready and PCP absent:

```sh
wp --path=/actual/wordpress/root core is-installed
wp --path=/actual/wordpress/root plugin install plugin-check --activate
wp --path=/actual/wordpress/root help plugin check
wp --path=/actual/wordpress/root plugin check /actual/path/to/plugin
```

Replace placeholders with known paths and the target plugin; label unknown paths explicitly. For an existing PCP installation use the inspection/activation steps above instead of reinstalling. Include the runtime loader below when runtime coverage is requested.

## 2. Run tests and checks

Run the relevant existing lint/tests and required asset builds. Then run Plugin Check against the actual changed plugin. Replace `<plugin-slug>` before executing:

```sh
wp plugin check <plugin-slug>
```

The article's `wp plugin check meu-plugin` uses `meu-plugin` as an example slug, not a fixed target. A source directory can also be checked with `wp plugin check /actual/path/to/plugin` within a working WordPress environment.

For structured findings, use `wp plugin check <plugin-slug> --format=json` when supported. Keep errors and warnings visible; do not add exclusions or ignore flags just to make validation pass. Record the command, target, scope, output, and execution failures.

WP-CLI runs **static checks by default**. To include runtime checks in a suitable local site, load PCP's actual `cli.php` before WordPress loads:

```sh
wp plugin check <plugin-slug> --require=/actual/path/to/plugin-check/cli.php
```

Resolve the installed Plugin Check directory instead of assuming the default content directory. If the loader is missing or runtime initialization fails, report that limitation; a static-only result must not be described as runtime validation.

## 3. Interpret findings before fixing

For each actionable finding, report:

- Rule/code, severity, and file/line when provided.
- Why the rule exists and what the source code actually does.
- Whether it applies, including evidence for any possible false positive.
- The smallest appropriate correction and any effect on plugin behavior.

Distinguish automated best-practice findings from directory-policy violations; cite the relevant guideline only when it applies. Do not mechanically remove warnings or trust a suggested fix without checking context.

For review-only requests, return the analysis and proposed fixes without modifying the plugin. When fixes are already authorized, apply relevant corrections within that scope without requiring another approval for each finding. Surface uncertain or out-of-scope changes for review.

### Optional AI review context

If the installed Plugin Check version includes a `prompts/` directory, read relevant prompts as supplementary review criteria alongside the plugin source and task context. Their availability varies; they do not replace the manual checklist or actual check results.

`wp plugin check <plugin-slug> --ai` is optional. Use it only when installed command help confirms support and the provider setup and use are already authorized. Otherwise, interpret the regular output in the current agent session. Treat AI suggestions about false positives as hypotheses requiring source evidence, not automatic grounds to dismiss findings.

## 4. Review, retest, and report

After fixes, inspect the diff, rerun affected tests, and repeat Plugin Check with the same target and coverage so results are comparable. Verify affected behavior locally, including permissions and data handling when relevant. Stop when relevant findings are resolved or remaining items have an explicit explanation or blocker; avoid repeated runs without a change or a new diagnostic purpose.

Report the target, actual commands, static/runtime coverage, test results, fixes, remaining findings with rule/code and file/line when available, and checks not performed. Separate a clean Plugin Check result from functional test results and manual policy conclusions. Leave sufficient evidence for human review.

## Sources

- [Plugin Check documentation](https://github.com/WordPress/plugin-check): setup, CLI usage, and static/runtime coverage.
- [Plugin Check CLI implementation](https://github.com/WordPress/plugin-check/blob/trunk/includes/CLI/Plugin_Check_Command.php): available options; verify against the installed version.
- [WordPress.org Plugin Check](https://wordpress.org/plugins/plugin-check/): purpose and limitations.
- [Guga Alves: reviewing plugins with Agent Skills and Plugin Check](https://gugaalves.net/wordpress/revisar-desenvolvimento-agent-skills-plugin-check/): inspiration for the development, validation, contextual review, and retesting cycle.
