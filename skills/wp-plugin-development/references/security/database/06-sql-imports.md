# Database Operations: Raw SQL Imports

**Prohibited**

This directive is an exception to the prohibitions on concatenating user input into SQL and executing SQL taken from request parameters. These still apply to imports:

- Running an import file that was not produced by the plugin, verified against its recorded hash, or supplied by an administrator.
- Using `unserialize()` or `maybe_unserialize()` on the contents of an import file. Use JSON (`wp_json_encode()` / `json_decode()`) for data that crosses a trust boundary.
- Setting backup or import files to world-writable permissions (`0777`, `0666`). Let WordPress defaults apply (`wp_mkdir_p()`, `FS_CHMOD_DIR` / `FS_CHMOD_FILE`).
- Storing backups where they can be downloaded or modified by anyone other than the plugin.

**Required**

An import is allowed only under the exception below, and every import must:

- Check a nonce and a capability (for example `manage_options`) before reading the file, and stop the request if either check fails.
- For a file the plugin produced: record a keyed hash at export (`hash_hmac()`), and verify it with `hash_equals()` before running any statement.
- For a file an administrator supplies: accept it through `wp_handle_upload()` with a type allowlist, and delete it after reading.
- Check the return values of the file read, the upload, and the hash comparison, and stop the request when any of them fails.
- Store backups where they cannot be downloaded or modified by anyone other than the plugin.

**Exceptions**

- Raw SQL imports for backup or migration features, limited to files the plugin itself produced, verified against a keyed hash recorded at export (`hash_hmac()` compared with `hash_equals()`), or an administrator explicitly supplied, behind a capability check and nonce.

## Code

```php
// Unsafe: any visitor can post SQL, and it runs with the site's database privileges.
add_action( 'wp_ajax_nopriv_myplugin_import', static function () {
	global $wpdb;
	$wpdb->query( wp_unslash( $_POST['sql'] ?? '' ) );
} );

// Unsafe: the nonce and capability are checked, but the file in uploads is trusted as it is.
// Anyone who can write to that folder can replace it with their own SQL.
add_action( 'admin_post_myplugin_import', static function () {
	check_admin_referer( 'myplugin_import' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Operation not allowed.', 'myplugin' ), '', array( 'response' => 403 ) );
	}

	$uploads = wp_upload_dir();
	$sql     = file_get_contents( trailingslashit( $uploads['basedir'] ) . 'myplugin/backup.sql' );

	global $wpdb;
	foreach ( myplugin_split_statements( $sql ) as $statement ) {
		$wpdb->query( $statement );
	}
} );

// Safe, at export time: record a keyed hash of the SQL the plugin just wrote.
update_option( 'myplugin_backup_hmac', hash_hmac( 'sha256', $sql, wp_salt( 'auth' ) ), false );

// Safe, at import time: an administrator action, checked for a nonce and capability,
// that runs only a file whose signature matches the one recorded at export.
// myplugin_split_statements() is a hypothetical parser for the verified SQL.
add_action( 'admin_post_myplugin_import', static function () {
	check_admin_referer( 'myplugin_import' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Operation not allowed.', 'myplugin' ), '', array( 'response' => 403 ) );
	}

	$uploads = wp_upload_dir();
	$file    = trailingslashit( $uploads['basedir'] ) . 'myplugin/backup.sql';
	$sql     = is_readable( $file ) ? file_get_contents( $file ) : false;
	if ( false === $sql ) {
		wp_die( esc_html__( 'No backup file found.', 'myplugin' ), '', array( 'response' => 404 ) );
	}

	// A swapped or edited file fails the keyed hash recorded at export time.
	$expected = (string) get_option( 'myplugin_backup_hmac', '' );
	if ( ! hash_equals( $expected, hash_hmac( 'sha256', $sql, wp_salt( 'auth' ) ) ) ) {
		wp_die( esc_html__( 'Operation not allowed.', 'myplugin' ), '', array( 'response' => 403 ) );
	}

	global $wpdb;
	foreach ( myplugin_split_statements( $sql ) as $statement ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Plugin-generated backup, administrator only.
		$wpdb->query( $statement );
	}
} );
```

Shows: an import file the administrator supplies. The administrator vouches for it, so there is no signature to check, but WordPress handles the upload, only an SQL file is accepted, and the file is deleted after the import.

```php
// Unsafe: any logged-in user can upload, and the temporary file is read as it arrives, whatever its type.
add_action( 'admin_post_myplugin_upload_import', static function () {
	global $wpdb;
	$sql = file_get_contents( $_FILES['import']['tmp_name'] );
	foreach ( myplugin_split_statements( $sql ) as $statement ) {
		$wpdb->query( $statement );
	}
} );

// Safe: nonce and capability first, then wp_handle_upload() with a type allowlist.
add_action( 'admin_post_myplugin_upload_import', static function () {
	check_admin_referer( 'myplugin_upload_import' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Operation not allowed.', 'myplugin' ), '', array( 'response' => 403 ) );
	}
	if ( ! isset( $_FILES['import'] ) ) {
		wp_die( esc_html__( 'No file uploaded.', 'myplugin' ), '', array( 'response' => 400 ) );
	}

	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- wp_handle_upload() validates the upload.
	$upload = wp_handle_upload(
		$_FILES['import'],
		array(
			'test_form' => false,
			'mimes'     => array( 'sql' => 'text/plain' ),
		)
	);
	if ( isset( $upload['error'] ) ) {
		wp_die( esc_html( $upload['error'] ), '', array( 'response' => 400 ) );
	}

	$sql = file_get_contents( $upload['file'] );
	wp_delete_file( $upload['file'] );
	if ( false === $sql ) {
		wp_die( esc_html__( 'The file could not be read.', 'myplugin' ), '', array( 'response' => 400 ) );
	}

	global $wpdb;
	foreach ( myplugin_split_statements( $sql ) as $statement ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Administrator-supplied import, nonce and capability checked.
		$wpdb->query( $statement );
	}
} );
```

## Attack methodology

Unverified backup import

Security bulletins:
- CWE-345, Insufficient Verification of Data Authenticity
- CWE-89, Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
- OWASP A08:2021, Software and Data Integrity Failures

- **Writable uploads folder → swapped backup file → administrator runs the import → arbitrary SQL → site takeover.** A file-write bug in another plugin, an upload flaw, or FTP access lets the attacker replace `backup.sql` with statements that create an administrator account or change `default_role`. The administrator then clicks Import in good faith. The nonce and capability checks pass, because the request is genuine, and the SQL runs with the site's full database privileges. Fix: record a keyed hash when the plugin exports the file and verify it with `hash_equals()` before running anything, and store backups where they cannot be modified or downloaded.
