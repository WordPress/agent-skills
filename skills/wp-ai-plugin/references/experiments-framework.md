# Experiments framework

The conceptual model and lifecycle for AI plugin Experiments, anchored to `WordPress/ai` v0.8.0 source.

## What an Experiment is

An "Experiment" in the AI plugin is a class that extends `WordPress\AI\Abstracts\Abstract_Feature`, which implements `WordPress\AI\Contracts\Feature`. The same `Abstract_Feature` is used for all features — Experiments are simply Features with `stability` set to `'experimental'`.

Three stability levels exist (declared in `load_metadata()` or defaulted):

- **`'experimental'`** — opt-in, may change shape, may be dropped, may be promoted (default if unspecified)
- **`'stable'`** — graduated through testing and contributor consensus
- **`'deprecated'`** — slated for removal

Image Generation was promoted from `'experimental'` to `'stable'` in v0.8.0 (#418). Title Generation has been stable for several releases. Refine from Notes is currently experimental (added v0.8.0, #289). The path is experimental → stable → potentially core.

## The contract (`Abstract_Feature`)

From `includes/Abstracts/Abstract_Feature.php`:

- **`final public function __construct()`** — do not override. Calls `static::get_id()` and `$this->load_metadata()` to populate properties.
- **`abstract public static function get_id(): string`** — return a unique slug-style ID. Called statically.
- **`abstract protected function load_metadata(): array`** — return `['label', 'description', 'category', 'stability'?, 'image'?]`. `label` and `description` are required; missing them throws `InvalidArgumentException`. `category` defaults to `Feature_Category::OTHER` if empty. `stability` defaults to `'experimental'`.
- **`abstract public function register(): void`** — set up hooks. Called by `Loader::initialize_features()` only if `is_enabled()` returns true.
- **`final public function is_enabled(): bool`** — checks the global features toggle (`wpai_features_enabled` option) AND the per-feature toggle (`wpai_feature_{$id}_enabled` option), runs the `wpai_feature_{$id}_enabled` filter, caches the result. Cannot be overridden.
- **`public function register_settings(): void`** — optional override. Use `register_setting()` for custom feature settings.
- **`public function get_settings_fields(): array`** — optional override. Return field definitions for the DataForm UI on the AI settings page.
- **`final protected function get_field_option_name( string $name ): string`** — generates `wpai_feature_{$id}_field_{$name}`. Use for namespaced option storage.

The interface (`Contracts\Feature`) lists eight public methods total: `get_id` (static), `get_label`, `get_description`, `get_category`, `get_stability`, `register`, `is_enabled`, `get_settings_fields_metadata`, plus `get_image` (added v0.8.0).

## The canonical example

`includes/Experiments/Example_Experiment/Example_Experiment.php` is shipped specifically as a copy-this reference. It demonstrates:

- subclassing `Abstract_Feature`,
- implementing `get_id`, `load_metadata`, `register`,
- using `Experiment_Category::ADMIN`,
- registering hooks (`wp_footer`, `document_title_parts`, `rest_api_init`) inside `register()`,
- a paired REST endpoint with permission_callback.

Read it before writing your own; that's what it's there for.

## Registration: the two extension points

From `includes/Features/Loader.php`. Both fire inside `Loader::register_features()`, which runs early in the plugin's bootstrap (after the Loader is constructed in `Main`).

### `wpai_default_feature_classes` filter

```php
$items = apply_filters( 'wpai_default_feature_classes', $feature_classes );
```

Filter receives an array of `[ feature_id => fully_qualified_class_string ]`. The Loader then:

1. Validates each item is a class string (logs `_doing_it_wrong` and skips otherwise),
2. Validates the class implements `Feature` interface (logs `_doing_it_wrong` and skips otherwise),
3. Instantiates with `new $class()` inside try/catch (skips with `_doing_it_wrong` if construction throws),
4. Adds the resulting instance to the registry.

Use this filter when you can register by class string alone.

### `wpai_register_features` action

```php
do_action( 'wpai_register_features', $this->registry );
```

Action receives the `Registry` instance. Call `$registry->register_feature( $instance )` with an already-instantiated Feature. Returns `false` if the ID is already registered.

Use this action when you need custom construction (dependency injection, factory pattern, conditional registration based on runtime state).

### Built-in Experiments

The plugin's own Experiments are registered via `Experiments::register_default_experiment_classes()` hooked to `wpai_default_feature_classes` at priority 9. The current list (v0.8.0):

```
Abilities_Explorer, Content_Classification, Content_Resizing, Excerpt_Generation,
Alt_Text_Generation, Meta_Description, Review_Notes, Refine_Notes,
Summarization, Title_Generation
```

Plus the internal `Image_Generation` Feature (registered separately as a stable Feature in `Loader::get_default_features()`).

## The enabled-state model

`Abstract_Feature::is_enabled()` is layered:

1. **Global toggle** — `wpai_features_enabled` option. Settings → AI's master switch. Returns false immediately if off.
2. **Per-feature toggle** — `wpai_feature_{$id}_enabled` option. The Settings → AI screen renders one toggle per registered Feature.
3. **Per-feature filter** — `wpai_feature_{$id}_enabled` filter (same name as the option). Last filter value wins. Use this in mu-plugins or hosting controls to force-enable or force-disable specific features.
4. **Deprecated legacy filter** — `ai_experiments_experiment_{$id}_enabled` runs through `apply_filters_deprecated` for compat with code written before the 0.6.0 rename.

Result is cached on the instance. Filters firing after the first `is_enabled()` call have no effect on that instance — important for testing.

## Pairing with an Ability

Most Experiments register one or more Abilities inside their `register()` method. The pattern (from `Title_Generation`):

```php
public function register(): void {
    add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
    // Other hooks for editor UI, REST endpoints, etc.
}

public function register_abilities(): void {
    wp_register_ability(
        'ai/' . $this->get_id(),
        array(
            'label'         => $this->get_label(),
            'description'   => $this->get_description(),
            'ability_class' => My_Ability::class,
        ),
    );
}
```

The `ability_class` key is the AI plugin's convention — it points to a class extending `WordPress\AI\Abstracts\Abstract_Ability` (which itself extends WordPress core's `WP_Ability`). The Ability class implements:

- `input_schema(): array`
- `output_schema(): array`
- `execute_callback( $input ): mixed`
- `permission_callback( $input ): mixed`
- `meta(): array`
- `category(): string` (defaults to `WPAI_DEFAULT_ABILITY_CATEGORY`)
- `guideline_categories(): array` (optional, for Guidelines integration)

The Ability is what the Abilities API exposes (and therefore what's reachable via REST and MCP). The Experiment is the Settings → AI surface.

## Promotion path

The 0.5.0 release notes referenced "Finalize requirements to elevate an Experiment to a Feature." Working criteria (per contributor discussions):

- Stable user-facing UX with documented behavior
- At least one fully-tested provider integration
- No outstanding critical accessibility issues
- Plugin lead approval after contributor review

If you're building an Experiment with the explicit goal of seeing it graduate, work the contributor channels (`#core-ai` Slack, GitHub Discussions) early. Promotion is a community decision.

## Where to put your Experiment

- **Upstream contribution to `WordPress/ai`**: PR adding `includes/Experiments/My_Experiment/My_Experiment.php` and `includes/Abilities/My_Experiment/My_Experiment.php`. Follow the contributor guide (`CONTRIBUTING.md`); AI-authored code requires explicit disclosure per the AI Authorship guidelines.
- **Downstream plugin extending the AI plugin**: your own plugin hooks `wpai_default_feature_classes` to add your class. Faster to ship, good for testing demand. Treat the AI plugin as an optional dependency; gate every entry point.

The downstream pattern is what most agencies and hosts will use. Upstream contribution is for Experiments general enough to belong in the canonical plugin.
