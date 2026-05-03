---
name: wp-ai-plugin
description: "Use when extending the canonical WordPress AI plugin (`wordpress.org/plugins/ai`, repo `WordPress/ai`, v0.8.0+) — adding a downstream Experiment via the `wpai_default_feature_classes` filter or `wpai_register_features` action, registering a paired Ability that consumes Guidelines automatically, customizing prompts/responses through documented filters, or respecting `wp_supports_ai()` and the `WPAI_*` constants. Use this — not `wp-ai-client` — when the user wants to add a feature *to the AI plugin itself* rather than build an independent AI feature in their own plugin."
compatibility: "Targets WordPress 7.0+ (PHP 7.4+) and the AI plugin v0.6.0+ (Abstract_Feature) or v0.8.0+ (wp_supports_ai, Guidelines, dashboard widgets). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WP AI Plugin

## When to use

Use this skill when the task involves:

- adding a new Experiment to the canonical AI plugin (a content-classification experiment, a new editorial workflow, a custom suggestion type),
- pairing the Experiment with a registered Ability so it's reachable via the Abilities API, REST, and MCP,
- opting into Guidelines so the Experiment respects site editorial standards,
- customizing the AI plugin's behavior in your own plugin via its hooks/filters (prompt overrides, response filtering, feature visibility),
- diagnosing "my Experiment doesn't appear in Settings → AI" or "the plugin works but my filter never fires".

If the task is to build an AI feature in your own plugin without involving the canonical AI plugin, route to `wp-ai-client` instead. If it's to write a provider plugin, route to `wp-ai-connectors`.

## Inputs required

- Repo root (run `wordpress-router` and `wp-project-triage` first).
- Confirmation that the canonical AI plugin (`WordPress/ai`, slug `ai`) is installed and active. v0.6.0+ exposes `Abstract_Feature` and the `WPAI_*` constants. v0.8.0+ adds `wp_supports_ai()`, the Guidelines service, and the AI Status / AI Capabilities dashboard widgets.
- Whether you're extending *upstream* (PR to `WordPress/ai`) or *downstream* (your own plugin that hooks into the AI plugin). The patterns differ.
- Target AI plugin version. The 0.x cycle has had renames; the source is the canonical reference.

## Procedure

### 0) Triage and confirm AI plugin context

1. Run triage: `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
2. Confirm the AI plugin is active and identify its version:
   - The `WPAI_*` constants (set in `ai.php` `constants()`): `WPAI_VERSION`, `WPAI_PLUGIN_FILE`, `WPAI_PLUGIN_DIR`, `WPAI_PLUGIN_URL`, `WPAI_DEFAULT_ABILITY_CATEGORY`.
   - The plugin slug `ai` in `wp-content/plugins/ai/`.
   - `Main` singleton at `WordPress\AI\Main::get_instance()`.
3. The canonical "copy this" reference is `includes/Experiments/Example_Experiment/Example_Experiment.php` in the AI plugin's source. Open it before writing your own.

If the project is the AI plugin itself, you're working *upstream*. Otherwise you're working *downstream* and your code should treat the AI plugin as an optional dependency — degrade gracefully if it's not active.

### 1) Gate on `wp_supports_ai()`

Any code that depends on the AI plugin should guard with `wp_supports_ai()`. The function is provided by Core (WP 7.0) or the bundled SDK — not by the AI plugin itself — so use `function_exists()`:

```php
if ( ! function_exists( 'wp_supports_ai' ) || ! wp_supports_ai() ) {
    return; // AI features not supported on this site.
}
```

The AI plugin itself uses this gate internally before initializing experiments (PR #268).

### 2) Subclass `Abstract_Feature` for the Experiment

Your Experiment class extends `WordPress\AI\Abstracts\Abstract_Feature` and implements three methods: `get_id()` (static), `load_metadata()` (returns label, description, category, optional stability and image), and `register()` (set up hooks). The constructor is `final` — don't override it.

Verbatim canonical example, from `includes/Experiments/Example_Experiment/Example_Experiment.php`:

```php
namespace WordPress\AI\Experiments\Example_Experiment;

use WordPress\AI\Abstracts\Abstract_Feature;
use WordPress\AI\Experiments\Experiment_Category;

class Example_Experiment extends Abstract_Feature {
    public static function get_id(): string {
        return 'example-experiment';
    }

    protected function load_metadata(): array {
        return array(
            'label'       => __( 'Example Experiment', 'ai' ),
            'description' => __( 'Demonstrates the AI experiment system with example hooks and functionality.', 'ai' ),
            'category'    => Experiment_Category::ADMIN,
        );
    }

    public function register(): void {
        add_action( 'wp_footer', array( $this, 'add_footer_content' ), 20 );
        add_filter( 'document_title_parts', array( $this, 'modify_title' ), 10, 1 );
        add_action( 'rest_api_init', array( $this, 'register_rest_route' ) );
    }

    // ... your hooks' callbacks ...
}
```

Categories: `Experiment_Category::EDITOR` (`'editor'`), `Experiment_Category::ADMIN` (`'admin'`), or `Feature_Category::OTHER` (`'other'`, the fallback). Stability values in `load_metadata()`: `'experimental'` (default), `'stable'`, `'deprecated'`. See `references/experiments-framework.md` for the contract details and the Loader/Registry flow.

### 3) Register the Experiment with the AI plugin

Two extension points exist; pick one. Both are documented in `includes/Features/Loader.php`.

**Filter (preferred for class-string registration):**

```php
add_filter( 'wpai_default_feature_classes', function ( array $classes ): array {
    if ( ! class_exists( '\\WordPress\\AI\\Abstracts\\Abstract_Feature' ) ) {
        return $classes; // AI plugin not active.
    }
    $classes[ My_Experiment::get_id() ] = My_Experiment::class;
    return $classes;
} );
```

The Loader instantiates the class for you (`new $class()`), validates that it implements `WordPress\AI\Contracts\Feature`, and adds it to the registry.

**Action (when you need custom instantiation):**

```php
add_action( 'wpai_register_features', function ( $registry ) {
    if ( ! class_exists( '\\WordPress\\AI\\Abstracts\\Abstract_Feature' ) ) {
        return;
    }
    $registry->register_feature( new My_Experiment( /* injected dependencies */ ) );
} );
```

The action receives the `WordPress\AI\Features\Registry` instance. `register_feature()` returns `false` if the ID is already registered (idempotent).

### 4) Pair with an Ability (recommended)

The canonical Experiment pattern registers an Ability inside its `register()` method, hooking on `wp_abilities_api_init`. The Ability is a separate class extending `WordPress\AI\Abstracts\Abstract_Ability`.

From `includes/Experiments/Title_Generation/Title_Generation.php`:

```php
public function register(): void {
    add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
    // ... other hooks ...
}

public function register_abilities(): void {
    wp_register_ability(
        'ai/' . $this->get_id(),
        array(
            'label'         => $this->get_label(),
            'description'   => $this->get_description(),
            'ability_class' => My_Internal_Linker_Ability::class,
        ),
    );
}
```

The `ability_class` key points to your `Abstract_Ability` subclass. That class implements the prompt logic (`input_schema()`, `output_schema()`, `execute_callback()`, `permission_callback()`). The Ability is what the Abilities API exposes; the Experiment is the Settings → AI integration.

Naming convention: ability IDs use the `ai/` prefix when registered by the AI plugin. Your downstream plugin can use its own prefix (e.g., `my-plugin/internal-links`).

### 5) Opt into Guidelines (if your Ability generates content)

Guidelines integration is automatic at the Ability level — set `guideline_categories()` on your `Abstract_Ability` subclass and `Abstract_Ability::load_system_instruction_from_file()` will append the formatted guidelines to your system instruction:

```php
class My_Internal_Linker_Ability extends \WordPress\AI\Abstracts\Abstract_Ability {

    protected function guideline_categories(): array {
        return array( 'site', 'copy' ); // Or any subset of: 'site', 'copy', 'images', 'additional'.
    }

    // ... input_schema, output_schema, execute_callback, permission_callback, meta ...
}
```

Returning an empty array (the default) skips Guidelines entirely. When `guideline_categories()` returns a non-empty array AND the Gutenberg `wp_guideline` CPT is registered, the system instruction is automatically appended with an XML-tagged `<guidelines>` block. See `references/guidelines-integration.md` for the full Guidelines service API and how to use it outside `Abstract_Ability` if needed.

### 6) Add a dashboard widget if useful (optional)

v0.8.0 ships two dashboard widgets: `wpai_status` and `wpai_capabilities`, both registered via standard `wp_add_dashboard_widget()` in `Dashboard_Widgets`. **There is no AI-plugin-specific widget framework** in v0.8.0 — to add your own, use standard WordPress:

```php
add_action( 'wp_dashboard_setup', function () {
    if ( ! current_user_can( 'manage_options' ) ) return;
    if ( ! function_exists( 'wp_supports_ai' ) || ! wp_supports_ai() ) return;

    wp_add_dashboard_widget(
        'my_plugin_ai_stats',
        __( 'My Plugin — AI activity', 'my-plugin' ),
        'my_plugin_render_ai_stats_widget'
    );
} );
```

See `references/dashboard-widgets.md` for design conventions matching the AI plugin's two widgets.

### 7) Customize via filters (downstream)

The plugin exposes filters at several layers. The most useful ones, by need:

- **Disable a specific feature**: `wpai_feature_{$id}_enabled` (returns bool, last value wins). `Abstract_Feature::is_enabled()` reads this.
- **Disable AI features globally**: `wpai_features_enabled` (default `true`, applied in `Loader::initialize_features()`).
- **Customize Guidelines max length**: `wpai_max_guideline_length` (default 5000 chars per category).
- **Disable Guidelines integration**: `wpai_use_guidelines` (default `true`).
- **Modify a system instruction before sending**: filters fire inside each Ability's `load_system_instruction_from_file()`. Search source for `apply_filters` near the Ability's `system-instruction.php` file.

For the full filter list at the version you're targeting, grep the source — see `references/hooks-and-filters.md`.

## Verification

- Settings → AI lists your Experiment with the correct label, description, and category.
- Toggling the Experiment on/off persists across reloads (writes to `wpai_feature_{$id}_enabled`).
- With the AI plugin deactivated, your downstream code does not produce fatals or PHP notices (the `function_exists( 'wp_supports_ai' )` and `class_exists` guards work).
- If your Ability declared `guideline_categories()`, edits to the site Guidelines (in Gutenberg's `wp_guideline` CPT) change the system instruction your Ability uses.
- Your Ability is discoverable through the Abilities API: `/wp-json/wp-abilities/v1/abilities` lists `ai/{your-id}` (or your custom prefix).

## Failure modes / debugging

- **Experiment doesn't show in Settings → AI**: filter or action hook is registered too late. The filter `wpai_default_feature_classes` runs inside `Loader::register_features()` which is called early in plugin bootstrap; register your hook on `plugins_loaded` priority 10 or earlier. Action `wpai_register_features` runs inside the same `register_features()` call — same timing constraint.
- **`Class not found: WP\AI\Features\Abstract_Feature`**: namespace is wrong. Correct path is `WordPress\AI\Abstracts\Abstract_Feature`. (Common error — earlier docs used `WP\AI`.)
- **Filter never fires**: spelled the filter name wrong. Real names are `wpai_default_feature_classes`, `wpai_register_features`, `wpai_features_enabled`, `wpai_features_initialized`. The legacy `ai_experiments_*` prefix was deprecated in 0.6.0 and exists only via `apply_filters_deprecated` for the per-feature toggle.
- **Guidelines do nothing**: either `guideline_categories()` returned empty, the Gutenberg `wp_guideline` CPT isn't registered, or `wpai_use_guidelines` filter returned false. Check `Guidelines::get_instance()->is_available()`.
- **Experiment registers but `register()` never runs**: the feature's `is_enabled()` returns false. Check the global toggle (`wpai_features_enabled` option, default off until admin enables it on Settings → AI), then the per-feature toggle.

## Escalation

For canonical detail before inventing patterns:

- **AI plugin source**: https://github.com/WordPress/ai (clone it; the source IS the canonical reference for everything in this skill)
- **Key files to read directly**:
  - `includes/Abstracts/Abstract_Feature.php` — Feature contract
  - `includes/Abstracts/Abstract_Ability.php` — Ability contract, including the Guidelines integration
  - `includes/Contracts/Feature.php` — the interface Feature classes implement
  - `includes/Features/Loader.php` — the registration mechanism (extension hooks documented inline)
  - `includes/Features/Registry.php` — the registry passed to `wpai_register_features`
  - `includes/Experiments/Example_Experiment/Example_Experiment.php` — canonical example to copy
  - `includes/Experiments/Title_Generation/Title_Generation.php` — Experiment + paired Ability registration
  - `includes/Services/Guidelines.php` — Guidelines service (v0.8.0+)
- **AI Team blog (release notes, roadmap)**: https://make.wordpress.org/ai/
- **Plugin lead's #core-ai channel** on WordPress Slack for live discussion

References:
- `references/experiments-framework.md`
- `references/dashboard-widgets.md`
- `references/guidelines-integration.md`
- `references/hooks-and-filters.md`
