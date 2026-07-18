<?php
/**
 * Plugin Name: WPAI Skill Smoke
 * Description: Downstream Experiment + Ability registration exactly as skills/wp-ai-plugin documents.
 */

add_action( 'plugins_loaded', function () {
	if ( ! class_exists( 'WordPress\AI\Abstracts\Abstract_Feature' ) ) {
		return; // AI plugin not active — degrade gracefully.
	}

	if ( ! class_exists( 'Smoke_Experiment' ) ) {
		class Smoke_Experiment extends \WordPress\AI\Abstracts\Abstract_Feature {
			public static function get_id(): string {
				return 'smoke-experiment';
			}

			protected function load_metadata(): array {
				return array(
					'label'       => 'Smoke Experiment',
					'description' => 'Downstream registration smoke test.',
					'category'    => \WordPress\AI\Experiments\Experiment_Category::ADMIN,
				);
			}

			public function register(): void {
				add_action( 'wp_abilities_api_init', function () {
					wp_register_ability(
						'smoke/echo',
						array(
							'label'               => 'Echo',
							'description'         => 'Echoes the msg input back.',
							'category'            => defined( 'WPAI_DEFAULT_ABILITY_CATEGORY' ) ? WPAI_DEFAULT_ABILITY_CATEGORY : 'ai-experiments',
							'input_schema'        => array(
								'type'       => 'object',
								'properties' => array( 'msg' => array( 'type' => 'string' ) ),
							),
							'output_schema'       => array( 'type' => 'string' ),
							'execute_callback'    => function ( $input ) {
								return isset( $input['msg'] ) ? (string) $input['msg'] : '';
							},
							'permission_callback' => function () {
								return current_user_can( 'read' );
							},
						)
					);
				} );
			}
		}
	}

	add_filter( 'wpai_default_feature_classes', function ( array $classes ): array {
		$classes[ Smoke_Experiment::get_id() ] = Smoke_Experiment::class;
		return $classes;
	} );
} );
