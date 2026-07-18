function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cellsFromRow(rowHtml) {
  return [...rowHtml.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) =>
    decodeHtml(stripTags(match[2]))
  );
}

export function parseWpGutenbergMapFromHtml(html) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((match) => match[0]);

  for (const table of tables) {
    const rowHtml = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
    const rows = rowHtml.map(cellsFromRow).filter((cells) => cells.length >= 2);
    const header = rows.find(
      (cells) =>
        cells.some((cell) => /WordPress\s+Version/i.test(cell)) &&
        cells.some((cell) => /Gutenberg\s+Versions?/i.test(cell))
    );
    if (!header) continue;

    const wordpressIndex = header.findIndex((cell) => /WordPress\s+Version/i.test(cell));
    const gutenbergIndex = header.findIndex((cell) => /Gutenberg\s+Versions?/i.test(cell));
    const mapped = rows
      .filter((cells) => cells !== header)
      .map((cells) => ({
        wordpress: cells[wordpressIndex]?.trim(),
        gutenberg: cells[gutenbergIndex]?.trim(),
      }))
      .filter(
        (row) => /^\d+\.\d+/.test(row.wordpress ?? "") && /^\d+\.\d+/.test(row.gutenberg ?? "")
      );

    if (mapped.length > 0) return { note: null, rows: mapped };
  }

  throw new Error(
    "Unable to parse a non-empty WordPress/Gutenberg version mapping from the canonical document"
  );
}
