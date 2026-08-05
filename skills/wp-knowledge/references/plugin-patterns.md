# Plugin implementation patterns

## Availability guard

Require the complete Knowledge surface from WordPress core or Gutenberg. For current pre-Core work, make Gutenberg 23.6+ with the Guidelines experiment an explicit dependency when your feature needs Knowledge.

```php
function my_plugin_has_knowledge(): bool {
	return post_type_exists( 'wp_knowledge' ) && taxonomy_exists( 'wp_knowledge_type' );
}

function my_plugin_require_knowledge(): bool {
	if ( my_plugin_has_knowledge() ) {
		return true;
	}

	if ( is_admin() ) {
		add_action(
			'admin_notices',
			static function (): void {
				printf(
					'<div class="notice notice-warning"><p>%s</p></div>',
					esc_html__( 'This feature requires the WordPress Knowledge API. Enable the Gutenberg 23.6+ Guidelines experiment or use a WordPress version that includes Knowledge.', 'my-plugin' )
				);
			}
		);
	}

	return false;
}
```

Do not register partial combinations or alternate storage. If `wp_knowledge` is unavailable, skip the Knowledge path and surface the dependency clearly.

## Register known type labels

When the target surface exposes the type registry, use it to declare labels for custom types your plugin understands. This does not replace taxonomy terms; it only lets the site map known slugs to human-readable labels when terms are created.

```php
function my_plugin_register_knowledge_type_labels(): void {
	add_filter(
		'wp_knowledge_types',
		static function ( array $types ): array {
			$types['skill'] = array(
				'title' => __( 'Skill', 'my-plugin' ),
			);

			return $types;
		}
	);
}
```

`guideline`, `memory`, and `note` are built in. Register or verify custom terms such as `skill` before relying on them.

## Resolve or create a type term

Create terms idempotently and store term ids, not raw strings, when assigning hierarchical taxonomy terms.

```php
function my_plugin_get_knowledge_type_term_id( string $slug, string $name ) {
	$term = term_exists( $slug, 'wp_knowledge_type' );

	if ( ! $term ) {
		$term = wp_insert_term(
			$name,
			'wp_knowledge_type',
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

Seed persistent skills idempotently. Do not overwrite user-edited content after install. Use a stable `post_name` and a plugin-specific meta key to detect untouched seed rows.

```php
function my_plugin_seed_transcribe_skill(): void {
	if ( ! my_plugin_require_knowledge() ) {
		return;
	}

	$term_id = my_plugin_get_knowledge_type_term_id( 'skill', __( 'Skill', 'my-plugin' ) );
	if ( is_wp_error( $term_id ) ) {
		return;
	}

	$slug     = 'my-plugin-transcribe';
	$content  = "Use site-specific spelling.\nRemove filler words when confidence is high.";
	$hash     = hash( 'sha256', $content );
	$existing = get_page_by_path( $slug, OBJECT, 'wp_knowledge' );

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
			'post_type'    => 'wp_knowledge',
			'post_status'  => current_user_can( 'publish_knowledge_items' ) ? 'publish' : 'private',
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

	wp_set_object_terms( $post_id, array( $term_id ), 'wp_knowledge_type' );
	update_post_meta( $post_id, '_my_plugin_seed_hash', $hash );
	update_post_meta( $post_id, '_my_plugin_seed_source', 'https://example.com/my-plugin/transcribe' );
}
```

Run seeders from an administrator-controlled setup path, not on every request. For plugin deactivation or uninstall, leave user-editable rows in place unless the user explicitly asked the plugin to remove them.

## Query server-side rows

Use normal post queries plus capability checks. Do not read private rows with direct SQL.

```php
function my_plugin_get_readable_knowledge_by_term( int $term_id ): array {
	if ( ! my_plugin_has_knowledge() ) {
		return array();
	}

	$query = new WP_Query(
		array(
			'post_type'      => 'wp_knowledge',
			'post_status'    => array( 'private', 'publish' ),
			'posts_per_page' => 20,
			'no_found_rows'  => true,
			'tax_query'      => array(
				array(
					'taxonomy' => 'wp_knowledge_type',
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

## Agent discovery pattern

Use title and excerpt for discovery before loading full bodies.

```php
function my_plugin_prepare_knowledge_discovery_item( WP_Post $post ): array {
	return array(
		'id'       => $post->ID,
		'slug'     => $post->post_name,
		'title'    => get_the_title( $post ),
		'excerpt'  => get_the_excerpt( $post ),
		'modified' => get_post_modified_time( DATE_ATOM, false, $post ),
		'types'    => wp_get_object_terms( $post->ID, 'wp_knowledge_type', array( 'fields' => 'slugs' ) ),
	);
}
```

Only load `post_content` after the agent or user has selected relevant rows for the current task.

## Plugin integration checklist

- Require `wp_knowledge` and `wp_knowledge_type` before integrating.
- Avoid storing agent skills, memories, or notes in plugin-only options when the site supports Knowledge.
- Register or verify custom Knowledge types before writing rows.
- Keep slugs stable so other clients can discover plugin-provided rows.
- Keep excerpts short and task-oriented; agents use them for discovery.
- Treat content as user-editable after creation.
- Preserve revisions by updating posts through WordPress APIs.
- Test Contributor, Author, Editor, and Administrator access if your plugin writes private rows.
