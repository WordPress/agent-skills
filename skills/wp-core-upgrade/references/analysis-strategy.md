# Analysis Strategy

## Goal

Determine which changes in a WordPress release actually affect *this* codebase, and discard everything else. A clean, scoped finding list is more useful than an exhaustive dump of every dev note.

## Step 1: Categorize findings from release notes

After fetching the dev notes, sort every change into one of these buckets:

| Category | Examples |
|----------|---------|
| Breaking changes | Removed functions, changed function signatures, removed hooks, behavior changes |
| Deprecations | Functions/classes/hooks flagged for removal in a future version |
| Core API changes | New hooks, changed return values, modified globals |
| Editor / block API | Block registration changes, block.json schema, editor hooks |
| Frontend / templates | Template tag changes, query changes, markup changes |
| Performance | Asset loading changes, caching changes, script module system |
| Database / schema | New tables, changed column types, query behavior |
| Admin | Admin page changes, Settings API changes |
| Tooling | Build tool changes, test harness changes |

## Step 2: Match against the project

For each finding, decide if it's relevant by searching the codebase.

### Quick search commands

```bash
# Search for a specific function or hook name
grep -r "function_name" . --include="*.php" -l

# Search for a filter/action hook
grep -r "add_filter\|add_action" . --include="*.php" | grep "hook_name"

# Search for a class name
grep -r "ClassName" . --include="*.php" -l

# Search for a block.json field
grep -r "apiVersion" . --include="*.json"

# Search for script enqueue patterns
grep -r "wp_enqueue_script\|wp_enqueue_style" . --include="*.php" | grep "handle_name"
```

### Relevance decision rules

| Finding type | Relevant if... |
|-------------|----------------|
| Removed PHP function | Project calls it (grep for the function name) |
| Deprecated PHP function | Project calls it and will target the future version where it's removed |
| Hook removed/renamed | Project hooks into it (grep `add_filter` or `add_action` + hook name) |
| Changed function signature | Project calls it with the old signature |
| block.json schema change | Project has `block.json` files |
| Script module change | Project uses `wp_enqueue_script_module` or `viewScriptModule` |
| Database schema change | Project queries the affected table directly |
| Admin UI change | Project adds admin pages or Settings API fields |
| Template tag change | Theme uses the tag in templates |

## Step 3: Severity classification

Assign severity to each relevant finding:

- **High (must fix before upgrading)**: The code will throw a PHP fatal, produce incorrect output, or cause a security issue on the target version.
- **Medium (fix before the following major)**: The code uses a deprecated API that will be removed in the next major version. Works today, breaks later.
- **Low (optional improvement)**: A new API exists that could improve the code, but the old way still works.

## Step 4: Scope filtering by project type

Apply these filters before presenting findings to avoid noise:

| If project is... | Skip these categories |
|-----------------|----------------------|
| Simple shortcode plugin (no blocks) | Editor / block API, script modules |
| Classic theme (no JS interactivity) | Script modules, Interactivity API |
| Block theme (no PHP business logic) | Core PHP API, database |
| CLI-only plugin | Admin UI, frontend, editor |
| REST API endpoint plugin | Frontend, editor, template tags |

## Step 5: Output format

Structure findings as a markdown checklist, sorted by severity:

```markdown
## Breaking Changes (fix before upgrading)

- [ ] **[Function name removed]** — `old_function()` was removed. Found in `src/helpers.php:12`.
  Replace with `new_function()`.
  Source: https://make.wordpress.org/core/...

## Deprecations (fix before next major)

- [ ] **[Hook renamed]** — `old_hook` is deprecated in favour of `new_hook`. Found in `plugin.php:45`.
  Source: https://make.wordpress.org/core/...

## Not applicable

The following release note areas were reviewed and found not to affect this project:
- Database schema changes (project does not query `wp_*` tables directly)
- Script module changes (project does not use `viewScriptModule`)
```

The "Not applicable" section is important: it shows you read the notes and made an active decision, rather than silently skipping them.

## Handling uncertainty

- If you find a function call but cannot confirm it maps to the changed WP function (e.g., same name in a third-party library), note the ambiguity.
- If the dev note describes behavioral change without a clear search pattern, note this as "requires manual review" rather than asserting it applies or doesn't.
- Never mark something "not applicable" without at least one grep to confirm absence.
