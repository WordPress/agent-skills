// Text rendering of the conversion and validation report.

function countsLine(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, n]) => `${name} ${n}`)
    .join(", ");
}

export function formatReport(report) {
  const lines = [];
  const { validation } = report;

  lines.push(`html-to-blocks: ${report.input}`);
  lines.push(
    `Packages: @wordpress/blocks ${report.packages["@wordpress/blocks"]}, @wordpress/block-library ${report.packages["@wordpress/block-library"]}, node ${report.packages.node}`
  );
  lines.push(`Mode: ${report.mode === "validate" ? "validate existing block markup" : "convert HTML to blocks"}`);
  lines.push(`Blocks: ${validation.total}${validation.total ? ` (${countsLine(validation.counts)})` : ""}`);
  lines.push("");

  if (report.mode === "convert") {
    const { mapped, dropped } = report.design;
    lines.push(`Design mapped (${mapped.length})`);
    for (const m of mapped) {
      lines.push(`  ${m.element}  ${m.property}: ${m.value}  ->  ${m.block} ${m.attribute} = ${JSON.stringify(m.result)}`);
    }
    lines.push("");
    lines.push(`Design dropped (${dropped.length})`);
    for (const d of dropped) {
      lines.push(`  ${d.element}  ${d.property}: ${d.value}  ->  ${d.reason}`);
    }
    lines.push("");
  }

  lines.push(`Fallbacks (${validation.fallbacks.length})`);
  for (const f of validation.fallbacks) {
    const source = report.fallbacks.find((s) => f.snippet.startsWith(s.snippet.slice(0, 60)));
    lines.push(`  ${f.path}${source ? `  from ${source.element}` : ""}`);
    lines.push(`    ${f.snippet}`);
    if (source && source.reason) lines.push(`    ${source.reason}`);
  }
  lines.push("");

  lines.push(`Invalid (${validation.invalid.length})`);
  for (const i of validation.invalid) {
    lines.push(`  ${i.path}`);
    for (const issue of i.issues) lines.push(`    ${issue}`);
    if (i.expected) lines.push(`    expected: ${i.expected}`);
    if (i.actual) lines.push(`    actual:   ${i.actual}`);
  }
  lines.push("");

  if (validation.migrated.length) {
    lines.push(`Migrated through a deprecated save() (${validation.migrated.length}); the editor will rewrite this markup on save`);
    for (const m of validation.migrated) lines.push(`  ${m.path}`);
    lines.push("");
  }

  if (report.warnings.length) {
    lines.push(`Warnings (${report.warnings.length})`);
    for (const w of report.warnings) lines.push(`  ${w}`);
    lines.push("");
  }

  lines.push(`Round trip: ${validation.roundTrip.stable ? "stable (serialize -> parse -> serialize is identical)" : "CHANGED (serialize -> parse -> serialize differs)"}`);
  lines.push(`Result: ${report.ok ? "OK" : "FAILED"}${report.okReason ? ` (${report.okReason})` : ""}`);
  return `${lines.join("\n")}\n`;
}
