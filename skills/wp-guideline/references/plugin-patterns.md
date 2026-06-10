# Plugin implementation patterns

## Availability guard

Ordinary plugins should prefer the existing Guidelines surface from WordPress core, the Gutenberg plugin, WordPress.com, or a site platform. If it is missing, degrade gracefully or show setup guidance unless the plugin explicitly owns a compatibility polyfill.

```php
function my_plugin_guidelines_available(): bool {
	return post_type_exists( 'wp_guideline' ) && taxonomy_exists( 'wp_guideline_type' );
}
```

If a product requires a polyfill, keep it no-op when the post type already exists and match the shared names: `wp_guideline`, `wp_guideline_type`, `/wp/v2/guidelines`.

## Register known type labels

When the target surface exposes the `wp_guideline_types` filter, use it to declare labels for types your plugin understands. This does not replace taxonomy terms; it only lets the site map known slugs to human-readable labels when terms are created.

```php
add_filter(
	'wp_guideline_types',
	static function ( array $types ): array {
		$types['skill'] = array(
			'title' => __( 'Skill', 'my-plugin' ),
		);

		return $types;
	}
);
```

## Resolve or create a type term

Create terms idempotently and store term ids, not raw strings, when assigning hierarchical taxonomy terms.

```php
function my_plugin_get_guideline_type_term_id( string $slug, string $name ) {
	$term = term_exists( $slug, 'wp_guideline_type' );

	if ( ! $term ) {
		$term = wp_insert_term(
			$name,
			'wp_guideline_type',
			array( 'slug' => $slug )
		);
	}

	if ( is_wp_error( $term ) ) {
		return $term;
	}

	return (int) $term['term_id'];
}
```

## Seed a plugin-provided skill

Seed default skills idempotently. Do not overwrite user-edited content after install. Use a stable `post_name` and a plugin-specific meta key to detect untouched seed rows.

```php
function my_plugin_seed_transcribe_guideline(): void {
	if ( ! my_plugin_guidelines_available() ) {
		return;
	}

	$term_id = my_plugin_get_guideline_type_term_id( 'skill', __( 'Skill', 'my-plugin' ) );
	if ( is_wp_error( $term_id ) ) {
		return;
	}

	$slug     = 'my-plugin-transcribe';
	$content  = "Use site-specific spelling.\nRemove filler words when confidence is high.";
	$hash     = hash( 'sha256', $content );
	$existing = get_page_by_path( $slug, OBJECT, 'wp_guideline' );

	if ( $existing instanceof WP_Post ) {
		$seed_hash   = get_post_meta( $existing->ID, '_my_plugin_seed_hash', true );
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
			'post_type'    => 'wp_guideline',
			'post_status'  => current_user_can( 'publish_guidelines' ) ? 'publish' : 'private',
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

	wp_set_object_terms( $post_id, array( $term_id ), 'wp_guideline_type' );
	update_post_meta( $post_id, '_my_plugin_seed_hash', $hash );
}
```

Run seeders from an administrator-controlled setup path, not on every request. For plugin deactivation or uninstall, leave user-editable guidelines in place unless the user explicitly asked the plugin to remove them.

## Query server-side guidelines

Use normal post queries plus capability checks. Do not read private rows with direct SQL.

```php
function my_plugin_get_readable_guidelines_by_term( int $term_id ): array {
	$query = new WP_Query(
		array(
			'post_type'      => 'wp_guideline',
			'post_status'    => array( 'private', 'publish' ),
			'posts_per_page' => 20,
			'no_found_rows'  => true,
			'tax_query'      => array(
				array(
					'taxonomy' => 'wp_guideline_type',
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

## Plugin integration checklist

- Avoid storing agent skills or instructions in plugin-only options when the site supports Guidelines.
- Keep slugs stable so other clients can discover plugin-provided rows.
- Keep excerpts short and task-oriented; agents use them for discovery.
- Treat content as user-editable after creation.
- Preserve revisions by updating posts through WordPress APIs.
- Test Contributor, Author, Editor, and Administrator access if your plugin writes private rows.
