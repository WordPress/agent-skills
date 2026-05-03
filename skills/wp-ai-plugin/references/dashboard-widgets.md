# Dashboard widgets

The AI plugin v0.8.0 ships two dashboard widgets and uses standard WordPress for registration. **There is no AI-plugin-specific widget framework.** Earlier drafts of this skill claimed there was — they were wrong.

## What ships in v0.8.0

`includes/Admin/Dashboard/Dashboard_Widgets.php` registers two widgets via standard `wp_add_dashboard_widget()`, gated on `current_user_can( 'manage_options' )`:

- **`wpai_status`** — AI Status widget (`AI_Status_Widget` class). Onboarding state, configured connectors, available Features and Experiments.
- **`wpai_capabilities`** — AI Capabilities widget (`AI_Capabilities_Widget` class). Counts of available Abilities across the plugin and connected providers.

Both are constructed with the `Registry` instance and rendered via standard dashboard widget callbacks. Styles are enqueued via `Asset_Loader::enqueue_style( 'dashboard-widgets', 'admin/dashboard' )`.

## How to add your own widget

Standard WordPress. There's no AI-plugin-specific registration hook to use:

```php
add_action( 'wp_dashboard_setup', function () {
    // Match the AI plugin's gating: admin only, AI must be supported.
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    if ( ! function_exists( 'wp_supports_ai' ) || ! wp_supports_ai() ) {
        return;
    }

    wp_add_dashboard_widget(
        'my_plugin_ai_stats',
        __( 'My Plugin — AI activity', 'my-plugin' ),
        'my_plugin_render_ai_stats_widget'
    );
} );

function my_plugin_render_ai_stats_widget(): void {
    $stats = my_plugin_get_24h_stats();
    if ( empty( $stats ) ) {
        echo '<p>' . esc_html__( 'No activity yet.', 'my-plugin' ) . '</p>';
        return;
    }
    // Render compactly: counts, sparkline, status indicator.
}
```

Widget IDs prefixed with `wpai_` are reserved for the AI plugin itself. Use your own prefix.

## When a dashboard widget is the right surface

Dashboard widgets earn their place when:

- The data is *operational* — what's happening on the site right now, not what the user can do.
- The data is small — a few numbers, a short list, a status indicator.
- Site admins benefit from seeing it without navigating somewhere.

Examples that fit: AI request counts in the last 24h, pending suggestions awaiting review, recent provider errors. Examples that don't: a long log of every request, a configuration panel, anything needing real interaction beyond a click-through to detail.

## Design conventions matching the AI plugin's two widgets

To make your widget feel native alongside `wpai_status` and `wpai_capabilities`:

- **No expensive queries on dashboard load.** The dashboard is opened constantly. Cache aggressively (transients with short TTLs, or pre-compute via cron).
- **Compact markup.** Dashboard widgets are narrow. Use definition lists (`<dl>`) or short tables, not multi-column layouts.
- **No JavaScript dependencies unless absolutely necessary.** A widget that loads a 200KB React chunk to display a status indicator is the wrong tradeoff.
- **Respect color schemes and dark mode.** Use WordPress core CSS variables (`var(--wp-admin-theme-color)` etc.) rather than hardcoded colors.
- **Show a useful empty state.** "No activity yet" with a link to the relevant settings is much better than a blank widget.

A widget should be a teaser. If users want detail, link them to the full screen — Settings → AI for configuration, Settings → Connectors for credentials, your own admin page for deep data.

## Permissions

The AI plugin's widgets gate on `manage_options`. Match that for any widget that exposes operational AI data. If your widget shows data that requires a stricter capability (e.g., billing/spend), wrap rendering in a `current_user_can()` check and degrade gracefully.

If you need an editor-visible signal about AI features, the post editor sidebar is the right surface — not the dashboard. Dashboard widgets are for admins.

## Removing the AI plugin's built-in widgets

If you're managing a deployment that should hide the built-in widgets, use standard `remove_meta_box()` after they register:

```php
add_action( 'wp_dashboard_setup', function () {
    remove_meta_box( 'wpai_status', 'dashboard', 'normal' );
    remove_meta_box( 'wpai_capabilities', 'dashboard', 'normal' );
}, 20 ); // Priority 20 to run after AI plugin's priority 10.
```

The widget IDs (`wpai_status`, `wpai_capabilities`) are stable across the v0.8.x line.

## What might land later

The AI plugin's roadmap mentions an "AI Request Logging & Observability Dashboard" as planned (per the readme). If that ships with a registration framework for third-party widgets, this reference will need an update. As of v0.8.0, no such framework exists in source — confirmed by reading `includes/Admin/Dashboard/Dashboard_Widgets.php` end to end.

## Source

- `includes/Admin/Dashboard/Dashboard_Widgets.php` — the orchestrator (~80 lines)
- `includes/Admin/Dashboard/AI_Status_Widget.php` — Status widget renderer
- `includes/Admin/Dashboard/AI_Capabilities_Widget.php` — Capabilities widget renderer
