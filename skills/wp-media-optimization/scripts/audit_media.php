<?php
/**
 * Script de Auditoria de Mídia Legada (WordPress / WP-CLI)
 *
 * Uso via WP-CLI:
 *   wp eval-file audit_media.php [--threshold-kb=300] [--format=json|table]
 */

if (!defined('ABSPATH')) {
    exit('Acesso direto não permitido. Execute via WP-CLI: wp eval-file audit_media.php');
}

function audit_detect_animated_gif($file_path) {
    if (!file_exists($file_path)) return false;
    $fh = fopen($file_path, 'rb');
    if (!$fh) return false;

    $count = 0;
    while (!feof($fh) && $count < 2) {
        $chunk = fread($fh, 102400);
        $count += preg_match_all('#\x00\x21\xF9\x04#s', $chunk);
    }
    fclose($fh);
    return $count > 1;
}

global $wpdb;

// Busca todos os attachments de imagem legada
$query = "
    SELECT ID, post_title, post_mime_type, guid
    FROM {$wpdb->posts}
    WHERE post_type = 'attachment'
      AND post_mime_type IN ('image/jpeg', 'image/png', 'image/bmp', 'image/gif')
";

$attachments = $wpdb->get_results($query);
$upload_dir = wp_upload_dir();
$results = [];

foreach ($attachments as $att) {
    $attached_file = get_post_meta($att->ID, '_wp_attached_file', true);
    if (!$attached_file) continue;

    $full_path = path_join($upload_dir['basedir'], $attached_file);
    if (!file_exists($full_path)) continue;

    $size_bytes = filesize($full_path);
    $is_animated = ($att->post_mime_type === 'image/gif') ? audit_detect_animated_gif($full_path) : false;

    // Buscar posts onde esta imagem é utilizada
    $file_basename = basename($attached_file);
    $usage_query = $wpdb->prepare(
        "SELECT ID, post_title, post_type FROM {$wpdb->posts} 
         WHERE post_status = 'publish' 
           AND post_content LIKE %s 
         LIMIT 10",
        '%' . $wpdb->esc_like($file_basename) . '%'
    );
    $used_in = $wpdb->get_results($usage_query);

    // Metadados de SEO
    $alt_text = get_post_meta($att->ID, '_wp_attachment_image_alt', true);

    $results[] = [
        'id'            => $att->ID,
        'file'          => $attached_file,
        'mime'          => $att->post_mime_type,
        'size_bytes'    => $size_bytes,
        'size_kb'       => round($size_bytes / 1024, 2),
        'is_animated'   => $is_animated,
        'title'         => $att->post_title,
        'alt_text'      => $alt_text,
        'usage_count'   => count($used_in),
        'sample_usages' => array_map(function($p) { return ['id' => $p->ID, 'title' => $p->post_title]; }, $used_in)
    ];
}

// Ordena de forma decrescente por tamanho em disco (Pareto)
usort($results, function($a, $b) {
    return $b['size_bytes'] <=> $a['size_bytes'];
});

// Saída em JSON para integração da skill
echo json_encode([
    'total_scanned' => count($results),
    'media'         => $results
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
