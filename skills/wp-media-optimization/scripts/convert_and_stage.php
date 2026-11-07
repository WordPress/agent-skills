<?php
/**
 * convert_and_stage.php — wp-legacy-media-optimizer
 *
 * Converts eligible legacy images (JPEG/PNG/static GIF) and their sub-sizes to
 * WebP, backs up the originals, and rewrites attachment metadata + post content
 * references.
 *
 * Runs inside WordPress via WP-CLI eval-file — do NOT run with plain `php`.
 *
 * Usage:
 *   wp eval-file scripts/convert_and_stage.php <audit.json> [--threshold-kb=N] [--limit=N] [--dry-run] [--quality=N] [--quarantine]
 *
 * Inputs:
 *   <audit.json>        Path to the JSON produced by scripts/audit_media.php.
 *   --threshold-kb=N    Only process originals whose size is >= N KiB.
 *   --limit=N           Process at most N eligible attachments.
 *   --quality=N         WebP quality, 0-100 (default 80).
 *   --dry-run           Plan and report only: no files written, no DB changes.
 *   --quarantine        Move replaced originals to uploads/_legacy_quarantine/
 *                       instead of deleting them (48h-retention style).
 *
 * Outputs (written next to the audit JSON):
 *   media-opt-backup-YYYYmmdd-His.zip|tar.gz   Archive of every replaced original.
 *   rollback.json                              Manifest to undo the run.
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	fwrite( STDERR, "This script must run via WP-CLI: wp eval-file scripts/convert_and_stage.php <audit.json> [options]\n" );
	exit( 1 );
}

/* ------------------------------------------------------------------ */
/* Environment & Guardrail Checks (Early Diagnostics)                 */
/* ------------------------------------------------------------------ */

// 1. Memory limit & execution time guardrails
@ini_set( 'memory_limit', '512M' );
@set_time_limit( 0 );

// 2. WebP Support check (GD or Imagick)
$has_imagick_webp = class_exists( 'Imagick' ) && in_array( 'WEBP', Imagick::queryFormats(), true );
$has_gd_webp      = function_exists( 'imagewebp' );

if ( ! $has_imagick_webp && ! $has_gd_webp ) {
	WP_CLI::error(
		"[FATAL] O PHP deste servidor não possui suporte à conversão WebP.\n" .
		"-> Solução: Ative a biblioteca Imagick com delegate WEBP ou recompile o módulo PHP-GD com suporte a WebP (libwebp)."
	);
}

// 3. Writable uploads check
$uploads_check = wp_get_upload_dir();
if ( ! is_writable( $uploads_check['basedir'] ) ) {
	WP_CLI::error( sprintf(
		"[FATAL] Diretório de uploads não possui permissão de escrita: %s\n" .
		"-> Solução: Verifique o proprietário e permissões da pasta (ex: chown -R www-data / chmod -R 755).",
		$uploads_check['basedir']
	) );
}

/* ------------------------------------------------------------------ */
/* Argument parsing                                                    */
/* ------------------------------------------------------------------ */

$args = isset( $args ) && is_array( $args ) ? $args : array();

$opt = array(
	'json'          => null,
	'threshold_kb'  => null,
	'limit'         => null,
	'quality'       => 80,
	'dry_run'       => false,
	'quarantine'    => false,
);

for ( $i = 0; $i < count( $args ); $i++ ) {
	$a = $args[ $i ];
	if ( preg_match( '/^--([a-z-]+)(?:=(.*))?$/', $a, $m ) ) {
		$key = $m[1];
		$val = isset( $m[2] ) ? $m[2] : null;
		switch ( $key ) {
			case 'threshold-kb':
				$opt['threshold_kb'] = (float) $val;
				break;
			case 'limit':
				$opt['limit'] = (int) $val;
				break;
			case 'quality':
				$opt['quality'] = max( 0, min( 100, (int) $val ) );
				break;
			case 'dry-run':
				$opt['dry_run'] = true;
				break;
			case 'quarantine':
				$opt['quarantine'] = true;
				break;
			default:
				WP_CLI::warning( "Ignoring unknown option --{$key}" );
		}
	} elseif ( null === $opt['json'] ) {
		$opt['json'] = $a;
	}
}

if ( null === $opt['json'] || ! is_readable( $opt['json'] ) ) {
	WP_CLI::error( 'Audit JSON not found or not readable. Usage: wp eval-file scripts/convert_and_stage.php <audit.json> [--threshold-kb=N] [--limit=N]' );
}

$audit_raw  = file_get_contents( $opt['json'] );
$audit_data = json_decode( $audit_raw, true );
if ( ! is_array( $audit_data ) ) {
	WP_CLI::error( 'Could not decode audit JSON: ' . json_last_error_msg() );
}

/* Accept either a plain array of items or a wrapper with an items/results list. */
$items = $audit_data;
foreach ( array( 'items', 'results', 'attachments', 'media' ) as $wrapper_key ) {
	if ( isset( $audit_data[ $wrapper_key ] ) && is_array( $audit_data[ $wrapper_key ] ) ) {
		$items = $audit_data[ $wrapper_key ];
		break;
	}
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

$uploads = wp_get_upload_dir();
$baseurl = trailingslashit( $uploads['baseurl'] );
$basedir = trailingslashit( $uploads['basedir'] );

/**
 * Pull an attachment ID out of the varied field names audit_media.php may emit.
 */
function mo_item_id( $item ) {
	foreach ( array( 'attachment_id', 'attachment', 'id', 'ID', 'post_id' ) as $k ) {
		if ( isset( $item[ $k ] ) && is_numeric( $item[ $k ] ) ) {
			return (int) $item[ $k ];
		}
	}
	return 0;
}

/**
 * Whether the audit flags this item as animated (never converted).
 */
function mo_is_animated( $item ) {
	foreach ( array( 'is_animated', 'animated' ) as $k ) {
		if ( isset( $item[ $k ] ) ) {
			return (bool) $item[ $k ];
		}
	}
	return false;
}

/**
 * Best-effort byte size of the original file for threshold filtering.
 */
function mo_item_size_bytes( $item ) {
	if ( isset( $item['size_bytes'] ) && is_numeric( $item['size_bytes'] ) ) {
		return (int) $item['size_bytes'];
	}
	foreach ( array( 'size_kb', 'total_size_kb', 'kb' ) as $k ) {
		if ( isset( $item[ $k ] ) && is_numeric( $item[ $k ] ) ) {
			return (int) round( $item[ $k ] * 1024 );
		}
	}
	if ( isset( $item['size'] ) && is_numeric( $item['size'] ) ) {
		return (int) $item['size']; // assume bytes
	}
	return null;
}

/**
 * Resolve the original main file to an absolute path. Falls back to the
 * _wp_attached_file post meta when the audit item carries no path.
 */
function mo_resolve_path( $item, $attachment_id, $basedir ) {
	foreach ( array( 'path', 'full_path', 'original_path', 'file', 'abs_path' ) as $k ) {
		if ( isset( $item[ $k ] ) && is_string( $item[ $k ] ) && '' !== $item[ $k ] ) {
			$p = $item[ $k ];
			if ( preg_match( '#^([a-zA-Z]:[\\\\/]|/)#', $p ) ) {
				return $p; // already absolute
			}
			return $basedir . ltrim( $p, '/\\' );
		}
	}
	if ( $attachment_id ) {
		$rel = get_post_meta( $attachment_id, '_wp_attached_file', true );
		if ( is_string( $rel ) && '' !== $rel ) {
			return $basedir . $rel;
		}
	}
	return null;
}

/**
 * Supported source types -> output mime. WebP input is left alone.
 */
function mo_source_is_supported( $mime ) {
	return in_array( $mime, array( 'image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/gif', 'image/bmp', 'image/x-ms-bmp' ), true );
}

/**
 * Convert one image file to WebP preserving alpha. Returns true on success
 * (the .webp file exists next to $src).
 */
function mo_convert_to_webp( $src, $dst, $quality ) {
	if ( extension_loaded( 'imagick' ) && class_exists( 'Imagick' ) ) {
		try {
			$im = new Imagick( $src );
			$im->setIteratorIndex( 0 ); // static frame only
			// Keep the alpha channel — required for PNG / static GIF.
			if ( method_exists( $im, 'setImageAlphaChannel' ) ) {
				$im->setImageAlphaChannel( Imagick::ALPHACHANNEL_ACTIVATE );
			}
			$im->setImageFormat( 'webp' );
			$im->setImageCompressionQuality( $quality );
			$im->setOption( 'webp:alpha-quality', '100' );
			$ok = $im->writeImage( $dst );
			$im->clear();
			$im->destroy();
			return $ok;
		} catch ( Exception $e ) {
			WP_CLI::warning( 'Imagick failed for ' . basename( $src ) . ': ' . $e->getMessage() . ' — trying GD' );
		}
	}

	if ( ! function_exists( 'imagecreatefromjpeg' ) || ! function_exists( 'imagewebp' ) ) {
		return false;
	}

	$info = @getimagesize( $src );
	if ( false === $info ) {
		return false;
	}

	switch ( $info['mime'] ) {
		case 'image/jpeg':
			$img = @imagecreatefromjpeg( $src );
			break;
		case 'image/png':
			$img = @imagecreatefrompng( $src );
			if ( $img && ! imageistruecolor( $img ) ) {
				imagepalettetotruecolor( $img );
			}
			break;
		case 'image/gif':
			$img = @imagecreatefromgif( $src );
			break;
		case 'image/bmp':
			$img = function_exists( 'imagecreatefrombmp' ) ? @imagecreatefrombmp( $src ) : false;
			break;
		default:
			$img = false;
	}
	if ( ! $img ) {
		return false;
	}

	imagealphablending( $img, false );
	imagesavealpha( $img, true );

	$ok = imagewebp( $img, $dst, $quality );
	imagedestroy( $img );
	return $ok;
}

/**
 * Sanitise a base filename for display/logging only.
 */
function mo_basename( $path ) {
	return preg_replace( '#^.*[\\\\/]#', '', $path );
}

/* ------------------------------------------------------------------ */
/* Collect the eligible work queue                                     */
/* ------------------------------------------------------------------ */

$queue   = array();
$skipped = array();

foreach ( $items as $item ) {
	if ( ! is_array( $item ) ) {
		continue;
	}
	$id = mo_item_id( $item );
	if ( ! $id ) {
		$skipped[] = array( 'item' => mo_basename( (string) wp_json_encode( $item ) ), 'reason' => 'no attachment id' );
		continue;
	}
	if ( mo_is_animated( $item ) ) {
		$skipped[] = array( 'attachment_id' => $id, 'reason' => 'is_animated' );
		continue;
	}
	$size_bytes = mo_item_size_bytes( $item );
	if ( null !== $opt['threshold_kb'] && null !== $size_bytes && $size_bytes < $opt['threshold_kb'] * 1024 ) {
		$skipped[] = array( 'attachment_id' => $id, 'reason' => 'below threshold' );
		continue;
	}
	$src_abs = mo_resolve_path( $item, $id, $basedir );
	if ( ! $src_abs || ! is_file( $src_abs ) ) {
		$skipped[] = array( 'attachment_id' => $id, 'reason' => 'file not found' );
		continue;
	}
	$mime = get_post_mime_type( $id );
	if ( $mime && ! mo_source_is_supported( $mime ) ) {
		$skipped[] = array( 'attachment_id' => $id, 'attachment_mime' => $mime, 'reason' => 'unsupported mime' );
		continue;
	}
	$queue[] = array(
		'id'         => $id,
		'src_abs'    => $src_abs,
		'size_bytes' => $size_bytes,
	);
	if ( null !== $opt['limit'] && count( $queue ) >= $opt['limit'] ) {
		break;
	}
}

if ( empty( $queue ) ) {
	WP_CLI::warning( 'Nothing eligible to convert.' );
}

WP_CLI::log( sprintf( 'Eligible attachments: %d | skipped: %d | quality: %d%s',
	count( $queue ),
	count( $skipped ),
	$opt['quality'],
	$opt['dry_run'] ? ' | DRY RUN' : ''
) );

/* ------------------------------------------------------------------ */
/* Plan per-attachment conversions (main file + registered sub-sizes)  */
/* ------------------------------------------------------------------ */

$plans = array(); // per attachment: files to convert
foreach ( $queue as $job ) {
	$id      = $job['id'];
	$src_abs = $job['src_abs'];
	$meta    = get_post_meta( $id, '_wp_attachment_metadata', true );
	if ( ! is_array( $meta ) ) {
		$meta = array();
	}

	$files = array();
	$files[] = array(
		'role' => 'full',
		'src'  => $src_abs,
	);

	if ( isset( $meta['sizes'] ) && is_array( $meta['sizes'] ) ) {
		$dir = trailingslashit( dirname( $src_abs ) );
		foreach ( $meta['sizes'] as $size_name => $size_data ) {
			if ( empty( $size_data['file'] ) ) {
				continue;
			}
			if ( isset( $size_data['mime-type'] ) && ! mo_source_is_supported( $size_data['mime-type'] ) ) {
				continue;
			}
			$sub_abs = $dir . $size_data['file'];
			if ( is_file( $sub_abs ) ) {
				$files[] = array(
					'role' => $size_name,
					'src'  => $sub_abs,
				);
			}
		}
	}

	$plans[ $id ] = array(
		'src_abs' => $src_abs,
		'meta'    => $meta,
		'files'   => $files,
	);
}

/* ------------------------------------------------------------------ */
/* Stage 1: convert + sanity check (no DB changes yet)                 */
/* ------------------------------------------------------------------ */

$stamp       = gmdate( 'Ymd-His' );
$out_dir     = dirname( $opt['json'] );
$backup_zip  = $out_dir . DIRECTORY_SEPARATOR . "media-opt-backup-{$stamp}.zip";
$backup_tgz  = $out_dir . DIRECTORY_SEPARATOR . "media-opt-backup-{$stamp}.tar.gz";
$backup_path = null;
$rollback    = array(
	'generated'      => gmdate( 'c' ),
	'site'           => site_url(),
	'audit_json'     => $opt['json'],
	'backup_archive' => null,
	'dry_run'        => $opt['dry_run'],
	'items'          => array(),
	'skipped'        => $skipped,
);

$results = array(); // id => conversion results per file

foreach ( $plans as $id => $plan ) {
	$results[ $id ] = array();
	foreach ( $plan['files'] as $f ) {
		$src = $f['src'];
		$dst = preg_replace( '/\.(jpe?g|png|gif|bmp)$/i', '.webp', $src );
		if ( $dst === $src ) {
			$dst = $src . '.webp';
		}

		if ( $opt['dry_run'] ) {
			$results[ $id ][ $f['role'] ] = array(
				'src' => $src, 'dst' => $dst, 'status' => 'dry-run', 'orig_bytes' => filesize( $src ),
			);
			continue;
		}

		if ( ! mo_convert_to_webp( $src, $dst, $opt['quality'] ) ) {
			$results[ $id ][ $f['role'] ] = array( 'src' => $src, 'dst' => null, 'status' => 'convert-failed' );
			continue;
		}

		$src_bytes = filesize( $src );
		$dst_bytes = filesize( $dst );

		// Sanity rule: a WebP larger than the original is discarded.
		if ( false !== $dst_bytes && false !== $src_bytes && $dst_bytes >= $src_bytes ) {
			@unlink( $dst );
			$results[ $id ][ $f['role'] ] = array(
				'src' => $src, 'dst' => null, 'status' => 'skipped-larger',
				'orig_bytes' => $src_bytes, 'webp_bytes' => $dst_bytes,
			);
			continue;
		}

		$results[ $id ][ $f['role'] ] = array(
			'src' => $src, 'dst' => $dst, 'status' => 'converted',
			'orig_bytes' => $src_bytes, 'webp_bytes' => $dst_bytes,
		);
	}
}

// The main file must convert for an attachment to be staged at all —
// post_mime_type/_wp_attached_file cannot point at a file we did not make.
$staged = array();
foreach ( $plans as $id => $plan ) {
	if ( isset( $results[ $id ]['full'] ) && 'converted' === $results[ $id ]['full']['status'] ) {
		$staged[ $id ] = $plan;
	} else {
		// Undo any sub-size webps that converted but whose parent cannot be staged.
		foreach ( $results[ $id ] as $r ) {
			if ( 'converted' === $r['status'] && $r['dst'] && is_file( $r['dst'] ) ) {
				@unlink( $r['dst'] );
			}
		}
		$rollback['skipped'][] = array(
			'attachment_id' => $id,
			'reason'        => 'full-size not converted (' . ( isset( $results[ $id ]['full']['status'] ) ? $results[ $id ]['full']['status'] : 'no full file' ) . ')',
		);
	}
}

WP_CLI::log( sprintf( 'Staged for DB update: %d attachments', count( $staged ) ) );

if ( $opt['dry_run'] ) {
	foreach ( $results as $id => $rs ) {
		foreach ( $rs as $role => $r ) {
			WP_CLI::log( sprintf( '  [%d] %-12s %s -> %s (%s)', $id, $role, mo_basename( $r['src'] ), $r['dst'] ? mo_basename( $r['dst'] ) : '-', $r['status'] ) );
		}
	}
	WP_CLI::success( 'Dry run complete — nothing was written.' );
	return;
}

if ( empty( $staged ) ) {
	file_put_contents( $out_dir . DIRECTORY_SEPARATOR . 'rollback.json', wp_json_encode( $rollback, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
	WP_CLI::warning( 'No attachments staged. rollback.json written for reference.' );
	return;
}

/* ------------------------------------------------------------------ */
/* Stage 2: archive every original that will be replaced               */
/* ------------------------------------------------------------------ */

$replaced_originals = array();
foreach ( $staged as $id => $plan ) {
	foreach ( $results[ $id ] as $r ) {
		if ( 'converted' === $r['status'] ) {
			$replaced_originals[] = $r['src'];
		}
	}
}
$replaced_originals = array_unique( $replaced_originals );

$archived = false;
if ( class_exists( 'ZipArchive' ) ) {
	$zip = new ZipArchive();
	if ( true === $zip->open( $backup_zip, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
		foreach ( $replaced_originals as $orig ) {
			$zip->addFile( $orig, ltrim( str_replace( $basedir, '', $orig ), '/\\' ) );
		}
		$zip->close();
		$backup_path = $backup_zip;
		$archived    = true;
	}
}

if ( ! $archived && class_exists( 'PharData' ) ) {
	try {
		$tar = new PharData( $backup_tgz, 0, null, Phar::GZ );
		foreach ( $replaced_originals as $orig ) {
			$tar->addFile( $orig, ltrim( str_replace( $basedir, '', $orig ), '/\\' ) );
		}
		unset( $tar );
		$backup_path = $backup_tgz;
		$archived    = true;
	} catch ( Exception $e ) {
		WP_CLI::warning( 'PharData archive failed: ' . $e->getMessage() );
	}
}

if ( ! $archived ) {
	WP_CLI::error( 'Could not create a backup archive (need ext-zip or ext-phar). Aborting before any DB change.' );
}

$rollback['backup_archive'] = $backup_path;
WP_CLI::log( 'Backup archive: ' . $backup_path . ' (' . count( $replaced_originals ) . ' originals)' );

/* ------------------------------------------------------------------ */
/* Stage 3: database + content updates                                 */
/* ------------------------------------------------------------------ */

global $wpdb;
$all_affected_posts = array();

foreach ( $staged as $id => $plan ) {
	$meta   = $plan['meta'];
	$src_abs = $plan['src_abs'];

	// URL rewrite map: old public URL -> new public URL (main + sub-sizes).
	$url_map = array();
	$old_rel = ltrim( str_replace( $basedir, '', $src_abs ), '/\\' );

	foreach ( $results[ $id ] as $role => $r ) {
		if ( 'converted' !== $r['status'] ) {
			continue;
		}
		$old_url = $baseurl . ltrim( str_replace( $basedir, '', $r['src'] ), '/\\' );
		$new_url = $baseurl . ltrim( str_replace( $basedir, '', $r['dst'] ), '/\\' );
		$url_map[ $old_url ] = $new_url;
	}

	// _wp_attached_file -> webp relative path
	$new_main_rel = ltrim( str_replace( $basedir, '', $results[ $id ]['full']['dst'] ), '/\\' );

	// _wp_attachment_metadata: main file + converted sub-sizes
	$prev_meta = $meta;
	if ( isset( $meta['file'] ) ) {
		$meta['file'] = preg_replace( '#[^/\\\\]+$#', mo_basename( $results[ $id ]['full']['dst'] ), $meta['file'] );
	}
	if ( isset( $meta['sizes'] ) && is_array( $meta['sizes'] ) ) {
		foreach ( $meta['sizes'] as $size_name => $size_data ) {
			if ( isset( $results[ $id ][ $size_name ] ) && 'converted' === $results[ $id ][ $size_name ]['status'] ) {
				$meta['sizes'][ $size_name ]['file']      = mo_basename( $results[ $id ][ $size_name ]['dst'] );
				$meta['sizes'][ $size_name ]['mime-type'] = 'image/webp';
			}
		}
	}

	$prev_mime = get_post_mime_type( $id );
	$wpdb->update( $wpdb->posts, array( 'post_mime_type' => 'image/webp' ), array( 'ID' => $id ) );
	update_post_meta( $id, '_wp_attached_file', $new_main_rel );
	update_post_meta( $id, '_wp_attachment_metadata', $meta );

	// post_content: swap old URLs for the webp ones.
	// Only the URL text changes — alt/title attributes are untouched, so
	// SEO metadata (alt text, title) is preserved by construction.
	$old_basename = mo_basename( $src_abs );
	$like         = '%' . $wpdb->esc_like( $old_basename ) . '%';
	$posts        = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT ID, post_content FROM {$wpdb->posts} WHERE post_content LIKE %s",
			$like
		)
	);
	$affected_posts = array();
	foreach ( (array) $posts as $p ) {
		$new_content = strtr( $p->post_content, $url_map );
		if ( $new_content !== $p->post_content ) {
			$wpdb->update( $wpdb->posts, array( 'post_content' => $new_content ), array( 'ID' => $p->ID ) );
			$affected_posts[]     = (int) $p->ID;
			$all_affected_posts[] = (int) $p->ID;
		}
	}

	// Physically remove (or quarantine) the replaced originals — they are
	// already in the backup archive.
	$quarantine_dir = null;
	if ( $opt['quarantine'] ) {
		$quarantine_dir = $basedir . '_legacy_quarantine/';
		wp_mkdir_p( $quarantine_dir );
	}
	foreach ( $results[ $id ] as $r ) {
		if ( 'converted' !== $r['status'] || ! is_file( $r['src'] ) ) {
			continue;
		}
		if ( $opt['quarantine'] ) {
			$flat = preg_replace( '#[\\\\/]+#', '_', ltrim( str_replace( $basedir, '', $r['src'] ), '/\\' ) );
			@rename( $r['src'], $quarantine_dir . $flat );
		} else {
			@unlink( $r['src'] );
		}
	}

	$rollback['items'][] = array(
		'attachment_id'     => $id,
		'original_path'     => $old_rel,
		'webp_path'         => $new_main_rel,
		'previous_metadata' => $prev_meta,
		'previous_mime'     => $prev_mime,
		'affected_posts'    => $affected_posts,
		'url_rewrites'      => $url_map,
		'files'             => $results[ $id ],
	);

	WP_CLI::log( "  [#{$id}] staged {$old_rel} -> {$new_main_rel}" );
}

$rollback_path = $out_dir . DIRECTORY_SEPARATOR . 'rollback.json';
file_put_contents( $rollback_path, wp_json_encode( $rollback, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );

// ------------------------------------------------------------------
// Post-optimization Cache Flushing (Preventing 404s on CDNs / Caches)
// ------------------------------------------------------------------
if ( function_exists( 'wp_cache_flush' ) ) {
	wp_cache_flush();
	WP_CLI::log( '  [CACHE] Object Cache flushed com sucesso.' );
}

// WP Rocket cache purge
if ( function_exists( 'rocket_clean_domain' ) ) {
	rocket_clean_domain();
	WP_CLI::log( '  [CACHE] WP Rocket cache limpo com sucesso.' );
}

// LiteSpeed Cache purge
if ( defined( 'LSCWP_V' ) && do_action( 'litespeed_purge_all' ) ) {
	WP_CLI::log( '  [CACHE] LiteSpeed Cache limpo com sucesso.' );
}

// ------------------------------------------------------------------
// Silent Reindex Notification (Sitemap & Search Engine Ping)
// ------------------------------------------------------------------
// Subtly signals search crawlers to re-evaluate optimized page LCP
// without mutating post dates or triggering RSS/reader notifications.
if ( ! empty( $all_affected_posts ) && function_exists( 'wp_remote_get' ) ) {
	$sitemap_url = home_url( '/wp-sitemap.xml' );

	// Detect custom sitemap endpoints (Yoast / Rank Math / All in One)
	if ( defined( 'RANK_MATH_VERSION' ) || defined( 'WPSEO_VERSION' ) || defined( 'AIOSEO_VERSION' ) ) {
		$sitemap_url = home_url( '/sitemap_index.xml' );
	}

	$ping_urls = array(
		'Google' => 'https://www.google.com/ping?sitemap=' . rawurlencode( $sitemap_url ),
		'Bing'   => 'https://www.bing.com/ping?sitemap=' . rawurlencode( $sitemap_url ),
	);

	foreach ( $ping_urls as $engine => $ping_endpoint ) {
		$res = wp_remote_get( $ping_endpoint, array( 'timeout' => 5 ) );
		if ( ! is_wp_error( $res ) ) {
			WP_CLI::log( "  [SEO] Notificação silenciosa enviada ao {$engine} para reindexação de LCP." );
		}
	}
}

WP_CLI::success( sprintf(
	'Done. %d attachments converted to WebP. Backup: %s | Rollback manifest: %s',
	count( $staged ),
	$backup_path,
	$rollback_path
) );
