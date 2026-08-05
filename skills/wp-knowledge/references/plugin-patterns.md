# Plugin implementation patterns

## Availability guard

Prefer the active shared surface from WordPress core, Gutenberg, WordPress.com, or a site platform. Knowledge is preferred; legacy Guidelines is a fallback or compatibility read surface.

```php
function my_plugin_guidelines_backend(): ?array {
	if ( post_type_exists( 'wp_knowledge' ) && taxonomy_exists( 'wp_knowledge_type' ) ) {
		return array(
			'post_type'   => 'wp_knowledge',
			'taxonomy'    => 'wp_knowledge_type',
			'rest_base'   => 'knowledge',
			'types_hook'  => 'wp_knowledge_types',
			'publish_cap' => 'publish_knowledge_items',
		);
	}

	if ( post_type_exists( 'wp_guideline' ) && taxonomy_exists( 'wp_guideline_type' ) ) {
		return array(
			'post_type'   => 'wp_guideline',
			'taxonomy'    => 'wp_guideline_type',
			'rest_base'   => 'guidelines',
			'types_hook'  => 'wp_guideline_types',
			'publish_cap' => 'publish_guidelines',
		);
	}

	return null;
}
```

If a product requires a polyfill, keep it no-op when a complete shared backend already exists. Do not register partial combinations such as `wp_knowledge` with `wp_guideline_type`.

## Register known type labels

When the target surface exposes a type registry filter, use it to declare labels for types your plugin understands. This does not replace taxonomy terms; it only lets the site map known slugs to human-readable labels when terms are created.

```php
function my_plugin_register_guideline_type_labels(): void {
	foreach ( array( 'wp_knowledge_types', 'wp_guideline_types' ) as $hook ) {
		add_filter(
			$hook,
			static function ( array $types ): array {
				$types['skill'] = array(
					'title' => __( 'Skill', 'my-plugin' ),
				);

				return $types;
			}
		);
	}
}
```

On pure Gutenberg/Core Knowledge, `guideline`, `memory`, and `note` are built in. Register or verify custom terms such as `skill`, `plan`, `instruction`, or `artifact` before relying on them.

## Resolve or create a type term

Create terms idempotently and store term ids, not raw strings, when assigning hierarchical taxonomy terms.

```php
function my_plugin_get_guideline_type_term_id( array $backend, string $slug, string $name ) {
	$term = term_exists( $slug, $backend['taxonomy'] );

	if ( ! $term ) {
		$term = wp_insert_term(
			$name,
			$backend['taxonomy'],
			array( 'slug' => $slug )
		);
	}

	if ( is_wp_error( $term ) ) {
		return $term;
	}

	return (int) $term['term_id'];
}
```

## Prefer code-defined defaults when available

On WordPress.com, use code-defined defaults when bundled knowledge should appear in agent read paths without creating database rows on every site.

```php
function my_plugin_register_default_transcribe_skill(): void {
	if ( ! function_exists( 'wpcom_ai_register_default_guideline' ) ) {
		return;
	}

	wpcom_ai_register_default_guideline(
		'skill',
		'my-plugin-transcribe',
		array(
			'title'          => __( 'Transcribe', 'my-plugin' ),
			'description'    => __( 'Transcription cleanup and formatting rules.', 'my-plugin' ),
			'content'        => "Use site-specific spelling.\nRemove filler words when confidence is high.",
			'source'         => 'https://example.com/my-plugin/transcribe',
			'allow_override' => true,
		)
	);
}
```

Use persistent posts only when users need local editable copies, revisions, ownership, or export/import for that row.

## Seed a plugin-provided skill

Seed persistent skills idempotently. Do not overwrite user-edited content after install. Use a stable `post_name` and a plugin-specific meta key to detect untouched seed rows.

```php
function my_plugin_seed_transcribe_guideline(): void {
	$backend = my_plugin_guidelines_backend();
	if ( null === $backend ) {
		return;
	}

	$term_id = my_plugin_get_guideline_type_term_id( $backend, 'skill', __( 'Skill', 'my-plugin' ) );
	if ( is_wp_error( $term_id ) ) {
		return;
	}

	$slug     = 'my-plugin-transcribe';
	$content  = "Use site-specific spelling.\nRemove filler words when confidence is high.";
	$hash     = hash( 'sha256', $content );
	$existing = get_page_by_path( $slug, OBJECT, $backend['post_type'] );

	if ( $existing instanceof WP_Post ) {
		$seed_hash    = get_post_meta( $existing->ID, '_my_plugin_seed_hash', true );
		$current_hash = hash( 'sha256', (string) get_post_field( 'post_content', $existing, 'raw' ) );

		if ( ! $seed_hash || $current_hash !== $seed_hash ) {
			return;
		}

		wp_update_post(
			array(
				'ID'           => $existing->ID,
				'post_title'   => __( 'Transcribe', 'my-plugin' ),
				'post_excerpt' => __( 'Transcription cleanup and formatting rules.', 'my-plugin' ),
				'post_content' => $content,
			)
		);
		update_post_meta( $existing->ID, '_my_plugin_seed_hash', $hash );
		return;
	}

	$post_id = wp_insert_post(
		array(
			'post_type'    => $backend['post_type'],
			'post_status'  => current_user_can( $backend['publish_cap'] ) ? 'publish' : 'private',
			'post_name'    => $slug,
			'post_title'   => __( 'Transcribe', 'my-plugin' ),
			'post_excerpt' => __( 'Transcription cleanup and formatting rules.', 'my-plugin' ),
			'post_content' => $content,
		),
		true
	);

	if ( is_wp_error( $post_id ) ) {
		return;
	}

	wp_set_object_terms( $post_id, array( $term_id ), $backend['taxonomy'] );
	update_post_meta( $post_id, '_my_plugin_seed_hash', $hash );

	if ( ! metadata_exists( 'post', $post_id, 'guideline_source' ) ) {
		update_post_meta( $post_id, 'guideline_source', 'https://example.com/my-plugin/transcribe' );
	}
}
```

Run seeders from an administrator-controlled setup path, not on every request. For plugin deactivation or uninstall, leave user-editable rows in place unless the user explicitly asked the plugin to remove them.

## Query server-side rows

Use normal post queries plus capability checks. Do not read private rows with direct SQL.

```php
function my_plugin_get_readable_guidelines_by_term( int $term_id ): array {
	$backend = my_plugin_guidelines_backend();
	if ( null === $backend ) {
		return array();
	}

	$query = new WP_Query(
		array(
			'post_type'      => $backend['post_type'],
			'post_status'    => array( 'private', 'publish' ),
			'posts_per_page' => 20,
			'no_found_rows'  => true,
			'tax_query'      => array(
				array(
					'taxonomy' => $backend['taxonomy'],
					'field'    => 'term_id',
					'terms'    => array( $term_id ),
				),
			),
		)
	);

	$posts = array_values(
		array_filter(
			$query->posts,
			static function ( WP_Post $post ): bool {
				return current_user_can( 'read_post', $post->ID );
			}
		)
	);

	wp_reset_postdata();

	return $posts;
}
```

If the WordPress.com `wpcom/guidelines` ability is available and the caller is an agent workflow, prefer the ability for list/get/search/create/update/delete because it applies the product-specific type, status, default-guideline, and compatibility behavior.

## Plugin integration checklist

- Prefer `wp_knowledge` over legacy `wp_guideline` for new writes when Knowledge is complete.
- Avoid storing agent skills or instructions in plugin-only options when the site supports a shared backend.
- Keep slugs stable so other clients can discover plugin-provided rows.
- Keep excerpts short and task-oriented; agents use them for discovery.
- Treat content as user-editable after creation.
- Preserve revisions by updating posts through WordPress APIs.
- Test Contributor, Author, Editor, and Administrator access if your plugin writes private rows.
- Test both Knowledge and legacy fallback paths when the product promises compatibility.
