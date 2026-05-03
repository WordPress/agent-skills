# Declaring model capabilities

A provider plugin's job is to make its models *describable*. The AI Client uses those descriptions to decide which model can fulfill a request — your declarations are what `is_supported_for_*()` and `using_model_preference()` check against.

## What gets declared

For each model the provider exposes:

- **Model ID** — stable string. Site owners and feature plugins reference models by ID, so renaming is a breaking change.
- **Display name** — for the Settings → Connectors UI and any admin model picker.
- **Modalities supported** — text, image, speech (TTS), speech (STT), video. Inputs and outputs may differ (e.g., a vision model takes image input but outputs text).
- **Capabilities** — structured output (JSON schema), system instructions, multi-turn (history), function calling, streaming, etc. The exact capability enum is defined in the PHP AI Client SDK.
- **Limits** — context window size, max output tokens, max input file size.
- **Recency hint** — whether this is a current-generation model, a legacy one, or a preview. Used to sort the model list so newer models appear first.

The exact PHP shape is in the SDK source — the existing flagship providers are the canonical examples. The shape may evolve, so always read against the current SDK version.

## Why ordering matters

`using_model_preference()` is a *preference*, not a constraint. If none of the preferred models are available on the site, the AI Client falls back to "the first compatible model in the registered order." That means **your provider's model ordering directly affects which model handles a request when no preference matches.**

The convention (followed by the three flagship providers): list newer models before older ones within a family. So `gpt-5.4` before `gpt-5.0` before `gpt-4.5-turbo`. A feature plugin that says "give me your best Anthropic model" gets `claude-opus-4-7` instead of a 2-year-old Claude 3.

## Modality declarations

A model can declare itself as supporting:

- **Text input** (almost all models)
- **Text output** (most generative models)
- **Image input** (vision models)
- **Image output** (image generation models — `gpt-image-2`, `imagen-4`, etc.)
- **Audio input** (speech-to-text)
- **Audio output** (text-to-speech, native speech generation)
- **Video output** (video generation models)
- **Multimodal output** — at least two output modalities for a single request

Be honest in declarations. A model that *technically* accepts image input but produces unreliable results should not declare image input support — site owners will configure features around it and end up with a broken UX.

## Capability declarations

The SDK defines a set of optional capabilities each model can opt into. Common ones:

- **`json_response`** — model can reliably return JSON matching a provided schema.
- **`system_instruction`** — model honors a separate system prompt.
- **`history`** — multi-turn conversation supported.
- **`function_calling`** — tool/function invocation supported (relevant for agentic workflows but not exposed via the WP wrapper directly yet).
- **`streaming`** — supports streaming responses (the WP wrapper doesn't currently expose streaming, but providers should still declare it for future use).

Feature plugins use these declarations indirectly — `is_supported_for_text_generation()` returns `false` if the builder requested a JSON schema and no available model declares `json_response`. Mis-declaring a capability cascades into hard-to-diagnose failures for downstream features.

## Logo and brand assets

Connector cards display a logo (`logo_url` in the connector array). Conventions to follow:

- **SVG preferred.** The card scales the logo; SVG stays sharp.
- **Square or near-square aspect.** Wide horizontal logos crop awkwardly.
- **Hosted on your provider's CDN, not WordPress.org.** The card just needs a URL; bundling the asset in the plugin is fine but `logo_url` should point to wherever the screen actually fetches from. Plugin-bundled assets work via `plugins_url()`.
- **Match the provider's official brand.** Don't invent a logo; use the upstream's asset.

## Versioning model declarations

Models change. New ones launch, old ones get deprecated, capabilities expand. Two patterns to handle this gracefully:

1. **Treat model IDs as a stable contract.** Don't rename `claude-sonnet-4-6` to `claude-sonnet-4.6` mid-release. If the upstream changes naming, add the new ID alongside the old one and mark the old one deprecated rather than removing it.
2. **Update the provider plugin frequently.** Site owners update plugins; that's how new model availability propagates. A provider plugin that hasn't updated in 18 months is offering site owners a stale menu.

## Cross-checking with feature detection

Build a small smoke test in your provider plugin that exercises every declared capability against a configured key, and surface results in your provider plugin's settings or admin notice. This catches declaration drift early — when a provider quietly removes a capability and your plugin still claims to support it, the smoke test catches it before site owners do.
