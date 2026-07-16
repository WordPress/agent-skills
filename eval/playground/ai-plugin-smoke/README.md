# AI plugin smoke test (Playground)

Verifies `skills/wp-ai-plugin`'s core claims against a **live** WordPress with
the canonical AI plugin (latest from wordpress.org), using WordPress
Playground — no server setup required.

```bash
./run.sh
```

What it exercises, in one boot:

1. The documented downstream registration chain: a mu-plugin adds an
   Experiment class via the `wpai_default_feature_classes` filter, guarded on
   `class_exists( Abstract_Feature )`; the blueprint enables the global
   (`wpai_features_enabled`) and per-feature toggles so the Loader calls
   `register()`; the Experiment registers a `smoke/echo` ability on
   `wp_abilities_api_init`; the check then executes it (`"hi"` round-trip,
   with `permission_callback` satisfied via `wp_set_current_user`).
2. Presence of the plugin's read abilities (`core/read-content`,
   `core/read-users`, `core/read-settings`) and the Suggest Reply ability
   (`ai/suggest-reply`, enabled via its toggle).

The mu-plugin (`mu-plugins/wpai-skill-smoke.php`) is intentionally written
exactly as the skill instructs — if the skill's guidance drifts from the
plugin's real extension surface, this run fails.

Network-heavy (downloads WP + plugin zip per run), so it is not part of
`eval/harness/run.mjs` / CI-on-push. Run manually after a `wp-ai-plugin`
re-sync, or wire into a scheduled workflow alongside the upstream-sync
refresh.

Last verified: AI plugin 1.2.0, Playground CLI latest, 2026-07-16.
