# Boas Práticas de Otimização WebP e Preservação de Transparência

## Requisitos de Ambiente
WordPress 5.8+ introduziu suporte nativo a WebP no Core. Para gerar arquivos WebP diretamente no servidor, o PHP precisa de uma das seguintes extensões ativas:
- `gd` compilada com suporte a WebP (`function_exists('imagewebp')`)
- `imagick` com delegate WebP ativo

## Preservação de Transparência Alfa (PNG e GIFs de 1 frame)

Ao carregar imagens com canal alfa via GD, é mandatório desligar a mesclagem padrão e habilitar a gravação do canal alfa para evitar que a transparência seja preenchida com cor sólida (geralmente preto):

```php
function convert_image_to_webp(string $source_path, string $target_path, int $quality = 82): bool {
    $info = getimagesize($source_path);
    if (!$info) {
        return false;
    }

    $mime = $info['mime'];

    switch ($mime) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($source_path);
            break;
        case 'image/png':
            $image = imagecreatefrompng($source_path);
            if ($image) {
                imagealphablending($image, false);
                imagesavealpha($image, true);
            }
            break;
        case 'image/gif':
            $image = imagecreatefromgif($source_path);
            if ($image) {
                imagealphablending($image, false);
                imagesavealpha($image, true);
            }
            break;
        case 'image/bmp':
            if (function_exists('imagecreatefrombmp')) {
                $image = imagecreatefrombmp($source_path);
            } else {
                return false;
            }
            break;
        default:
            return false;
    }

    if (!$image) {
        return false;
    }

    // Salva em formato WebP
    $success = imagewebp($image, $target_path, $quality);
    imagedestroy($image);

    // Regra de Sanidade: se o WebP ficou maior que o original, descarta
    if ($success && file_exists($target_path)) {
        if (filesize($target_path) >= filesize($source_path)) {
            unlink($target_path);
            return false; // Manter o original é mais vantajoso
        }
    }

    return $success;
}
```

## Níveis Recomendados de Qualidade ($quality)
- **82% (Padrão recomendado):** Equilíbrio perfeito entre fidelidade visual e redução drástica de peso (geralmente de 50% a 75% menor que o JPEG/PNG original).
- **Lossless para ícones/logos:** Em logos e ilustrações vetoriais rasterizadas de alta precisão, considerar compressão lossless.
