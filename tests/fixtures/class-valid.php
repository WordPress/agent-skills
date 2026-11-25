<?php
// Safe: the request can only pick a class the plugin owns.
check_admin_referer( 'myplugin_run_export' );
$exporters = array(
	'csv'  => 'Myplugin_Csv_Exporter',
	'json' => 'Myplugin_Json_Exporter',
);
$format    = sanitize_key( wp_unslash( $_POST['format'] ?? '' ) );
if ( ! isset( $exporters[ $format ] ) ) {
	wp_send_json_error( null, 400 );
}
if ( ! current_user_can( 'manage_options' ) ) {
	wp_send_json_error( null, 403 );
}
$class_name = $exporters[ $format ];
$exporter   = new $class_name();
$exporter->export();

class Myplugin_Csv_Exporter {
	public function export() {
		return 'csv';
	}
}

class Myplugin_Json_Exporter {
	public function export() {
		return 'json';
	}
}
