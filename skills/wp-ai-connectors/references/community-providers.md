# Community provider patterns

The three flagship provider plugins (Anthropic, Google, OpenAI) ship from the WordPress project itself. Several community provider plugins emerged during the WP 7.0 cycle, exercising patterns the flagships don't. Worth studying before writing a new one.

Source: the [Call for Testing: Community AI Connector Plugins](https://make.wordpress.org/ai/2026/03/25/call-for-testing-community-ai-connector-plugins/) post lists the providers under active community development. Patterns below are drawn from that surface.

## OpenRouter — the aggregator pattern

OpenRouter is itself a router across many upstream providers (Anthropic, OpenAI, Google, Mistral, etc.). One plugin, many models. The pattern is interesting because:

- A single provider declaration lists hundreds of models, drawn from OpenRouter's `/models` endpoint.
- The models list shouldn't be hardcoded — fetch and cache (transient with a 24-hour expiry is a reasonable default).
- Capabilities for each model are also exposed via OpenRouter's API, so the declarations can be data-driven rather than maintained by hand.
- Model IDs follow OpenRouter's `provider/model` convention (e.g., `anthropic/claude-sonnet-4.6`) which is distinct from the flagship plugins. Site owners using both an aggregator and a direct provider will see overlapping models with different IDs.

When to choose this pattern: aggregator services, multi-model gateways, internal LLM routers. Fetch-and-cache the catalog rather than enumerating it in PHP.

## Ollama — the local provider pattern

Ollama runs models on the user's own machine. Authentication method is `none`. Distinctives:

- No API key. The connector card should show a "no authentication required" state, not "missing key."
- The base URL (default `http://localhost:11434`) is the actual configuration that matters. Ollama users on non-default ports or remote installs need a way to set this.
- The model list is whatever the user has pulled locally (`ollama list`). The provider plugin must query Ollama at runtime to know what's available — there's no cloud catalog.
- Connection failures (Ollama not running, port wrong) need clear surfaced errors. Site owners may not realize they need to start the daemon.

When to choose this pattern: any local-first or self-hosted backend (Ollama, llama.cpp servers, vLLM, LocalAI). Treat `none` auth as a UX prompt to configure the *endpoint* instead.

## Mistral — the direct API pattern

Mistral is a closer parallel to the three flagships: API key auth, hosted models, a stable model catalog. The interesting bit is licensing — Mistral has both proprietary and Apache-licensed open-weight models. A community provider plugin can:

- Expose only the hosted models for simplicity, or
- Expose both hosted and self-hostable models, with a configuration toggle for the endpoint.

When to choose this pattern: any provider with a stable hosted API that mostly looks like the flagships. The declaration work is straightforward; the differentiator is curation (which models to expose) and brand fit.

## Patterns worth borrowing

Across these and other community providers, some patterns have emerged that aren't documented in the dev notes:

### Cache the model catalog, refresh on demand

```php
function my_provider_get_models(): array {
    $cached = get_transient( 'my_provider_models' );
    if ( false !== $cached ) {
        return $cached;
    }
    $models = my_provider_fetch_catalog();
    if ( is_wp_error( $models ) ) {
        return array(); // Fail open — no models means feature detection returns false.
    }
    set_transient( 'my_provider_models', $models, DAY_IN_SECONDS );
    return $models;
}
```

Add a "Refresh model list" button on your provider's settings screen for admins who just upgraded their plan or pulled a new local model.

### Declare a "verify connection" admin action

Site owners need a way to confirm their key works without setting up a feature plugin first. A simple admin button that runs a one-token "ping" prompt and reports success/failure is dramatically more usable than letting them discover the failure when their first AI feature breaks.

### Surface latency and pricing if you have the data

The connector card itself doesn't show this in WP 7.0, but `getProviderMetadata()` and `getModelMetadata()` from `GenerativeAiResult` can carry it. Feature plugins that show their users "this took 1.2s and used 340 tokens" are noticeably better — and they can only do that if the provider populates the metadata.

### Don't reimplement Settings → Connectors

If your authentication needs are met by `api_key` or `none`, let the core screen handle the UX. Adding a duplicate settings screen inside your provider plugin fragments the admin experience. If you genuinely need a custom UI (OAuth, multi-tenant, model selection per role), build it as a *complement* to the connector card rather than a replacement.

## What to avoid

- **Declaring capabilities you can't reliably support.** A model that "kind of" supports JSON output isn't supporting it from the AI Client's perspective — feature plugins will request strict schema conformance and get garbage.
- **Hardcoded API endpoints.** Even if the provider only has one URL today, expose it as a constant or filterable so on-prem and proxy setups can override.
- **Storing keys in custom options.** The Connectors API already handles env / constant / database. Adding a custom `my_provider_secret_key` option on top creates two sources of truth and confuses site owners.
- **Skipping deprecation announcements.** When upstream deprecates a model, log a `_doing_it_wrong()`-style notice rather than silently failing requests. Site owners need a chance to update before the model goes away.
