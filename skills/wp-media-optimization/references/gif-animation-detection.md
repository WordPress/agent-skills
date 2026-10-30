# Detecção de Animação em Arquivos GIF

Em ambientes legados de WordPress, GIFs animados costumam ser utilizados em cabeçalhos, banners de promoções e ilustrações de tutoriais. Converter um GIF animado usando funções padrão de conversão simples (que leem apenas o primeiro frame) transforma a animação em uma imagem estática travada no primeiro quadro.

## Por que não converter automaticamente na V1?
1. O suporte a WebP animado no PHP varia consideravelmente dependendo da versão do ImageMagick compilada com `libwebp`.
2. A biblioteca GD nativa tradicionalmente não oferece suporte a multiquadro animado WebP.
3. É muito mais seguro conscientizar o usuário sobre o tamanho desproporcional do GIF e sugerir conversão para `<video>` (MP4/WebM), que é até 80% menor que o próprio WebP animado.

## Método Rápido e Seguro em PHP (Sem dependências pesadas)

Abaixo está o algoritmo binário determinístico para identificar se um GIF possui múltiplos frames:

```php
function is_animated_gif(string $filename): bool {
    if (!file_exists($filename)) {
        return false;
    }

    $file_handle = fopen($filename, 'rb');
    if (!$file_handle) {
        return false;
    }

    $count = 0;
    // O bloco de controle de extensão gráfica do GIF começa com \x00\x21\xF9\x04
    while (!feof($file_handle) && $count < 2) {
        $chunk = fread($file_handle, 1024 * 100); // 100KB chunks
        $count += preg_match_all('#\x00\x21\xF9\x04#s', $chunk, $matches);
    }
    fclose($file_handle);

    return $count > 1;
}
```

## Relatório Gerado para o Usuário
Ao detectar um GIF animado:
- O arquivo é marcado com flag `[ANIMATED_GIF_SKIP]`.
- Exibe o tamanho atual (ex: `4.8 MB`).
- Exibe a lista de URLs de páginas que sofrem com esse bloqueio de renderização.
- Recomenda a substituição manual por MP4/Lottie ou ferramenta externa dedicada.
