// Small CSS helpers for the design mapping step: inline style parsing and
// recognition of WordPress preset custom properties.

const PRESET_RE = /^var\(\s*--wp--preset--(color|font-size|font-family|spacing|gradient|shadow)--([a-z0-9-]+)\s*\)$/i;

/**
 * Splits an inline style attribute into declarations. Semicolons inside
 * parentheses (gradients, var()) and quotes are left alone.
 */
export function parseInlineStyle(text) {
  const declarations = [];
  if (!text) return declarations;

  let depth = 0;
  let quote = null;
  let current = "";
  const parts = [];
  for (const ch of text) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === ";" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);

  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const property = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim().replace(/\s*!important$/i, "");
    if (property && value) declarations.push({ property, value });
  }
  return declarations;
}

/**
 * Recognises var(--wp--preset--<kind>--<slug>) and returns { kind, slug }.
 */
export function presetFromValue(value) {
  const match = PRESET_RE.exec(String(value).trim());
  if (!match) return null;
  return { kind: match[1].toLowerCase(), slug: match[2].toLowerCase() };
}

/**
 * Turns a CSS length into the value a block attribute expects: a spacing
 * preset becomes the "var:preset|spacing|<slug>" form, anything else is kept.
 */
export function spacingValue(value) {
  const preset = presetFromValue(value);
  if (preset && preset.kind === "spacing") return `var:preset|spacing|${preset.slug}`;
  return value;
}

/**
 * Splits a space separated shorthand (padding, margin, gap) into tokens,
 * keeping var(...) calls intact.
 */
export function splitShorthand(value) {
  const tokens = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Expands a 1 to 4 value box shorthand into { top, right, bottom, left }.
 */
export function expandBox(value) {
  const t = splitShorthand(value);
  if (t.length === 0) return null;
  if (t.length === 1) return { top: t[0], right: t[0], bottom: t[0], left: t[0] };
  if (t.length === 2) return { top: t[0], right: t[1], bottom: t[0], left: t[1] };
  if (t.length === 3) return { top: t[0], right: t[1], bottom: t[2], left: t[1] };
  return { top: t[0], right: t[1], bottom: t[2], left: t[3] };
}

const BORDER_STYLES = new Set(["none", "hidden", "dotted", "dashed", "solid", "double", "groove", "ridge", "inset", "outset"]);

/**
 * Parses "1px solid #ccc" (any order) into { width, style, color }.
 */
export function parseBorderShorthand(value) {
  const result = {};
  for (const token of splitShorthand(value)) {
    const lower = token.toLowerCase();
    if (BORDER_STYLES.has(lower)) result.style = lower;
    else if (/^-?[\d.]+[a-z%]*$/i.test(lower) || /^(thin|medium|thick)$/.test(lower)) result.width = token;
    else result.color = token;
  }
  return result;
}

/**
 * Extracts the url(...) from a background value, if any.
 */
export function backgroundUrl(value) {
  const match = /url\(\s*(['"]?)(.*?)\1\s*\)/i.exec(value);
  return match ? match[2] : null;
}

export function isGradient(value) {
  return /(linear|radial|conic)-gradient\(/i.test(value);
}

/**
 * True for a value that is a single colour (keyword, hex, rgb(), hsl(), var()).
 */
export function isSingleColor(value) {
  const v = String(value).trim();
  const preset = presetFromValue(v);
  if (preset) return preset.kind === "color";
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return true;
  if (/^(rgb|rgba|hsl|hsla|oklch|oklab|color)\(/i.test(v)) return true;
  if (/^(none|inherit|initial|unset|revert)$/i.test(v)) return false;
  // Named colours, transparent, currentcolor.
  return /^[a-z]+$/i.test(v);
}

/**
 * Parses a length into { number, unit } or null.
 */
export function parseLength(value) {
  const match = /^(-?[\d.]+)([a-z%]*)$/i.exec(String(value).trim());
  if (!match) return null;
  return { number: Number(match[1]), unit: match[2] || "px" };
}
