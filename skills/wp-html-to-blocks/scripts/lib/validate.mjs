// Validation: serialize the blocks with the registered save() functions,
// parse the markup back with the block parser, and compare.
//
// A block is reported invalid when the parser cannot match the markup to the
// block's save() output (the same check the editor runs before showing the
// "This block contains unexpected or invalid content" notice). A block whose
// name is not registered (core/missing) is reported too. core/html and
// core/freeform are reported as fallbacks, never silently accepted.

function formatArg(arg) {
  if (arg && typeof arg === "object" && typeof arg.name === "string") return arg.name;
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function formatIssue(issue) {
  const args = Array.isArray(issue.args) ? [...issue.args] : [];
  if (args.length === 0) return "";
  let text = String(args.shift());
  text = text.replace(/%[sod]/g, () => formatArg(args.shift()));
  // The generic "Block validation failed" message carries both markups; they
  // are reported separately as expected/actual, so keep only its first line.
  if (/^Block validation failed/.test(text)) return "";
  return text.replace(/\s+/g, " ").trim();
}

function walk(blocks, visit, path = []) {
  blocks.forEach((block, index) => {
    const here = [...path, `${index}:${block.name}`];
    visit(block, here);
    if (Array.isArray(block.innerBlocks) && block.innerBlocks.length) walk(block.innerBlocks, visit, here);
  });
}

import { quietly } from "./environment.mjs";

const RAW_BLOCKS = new Set(["core/html", "core/freeform", "core/missing"]);

function compact(text, max = 200) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}...` : one;
}

/**
 * @param {Array}  blocks  Block objects (from conversion or parse()).
 * @param {object} env     loadBlocksEnvironment() result.
 * @param {object} [options]
 * @param {string} [options.markup]  Markup to validate instead of serializing `blocks`.
 */
export function validateBlocks(blocks, env, options = {}) {
  const { serialize, parse, getBlockType, getSaveContent } = env.blocks;

  const markup = options.markup !== undefined ? options.markup : serialize(blocks);
  const reparsed = quietly(() => parse(markup));
  const reserialized = serialize(reparsed);

  const counts = {};
  const invalid = [];
  const fallbacks = [];
  const migrated = [];

  walk(reparsed, (block, path) => {
    counts[block.name] = (counts[block.name] || 0) + 1;

    if (block.name === "core/missing") {
      invalid.push({
        block: block.attributes.originalName || "unknown",
        path: path.join(" > "),
        issues: [`block "${block.attributes.originalName}" is not registered`],
        actual: compact(block.attributes.originalContent || block.originalContent),
      });
      return;
    }

    if (block.name === "core/html" || block.name === "core/freeform") {
      fallbacks.push({
        block: block.name,
        path: path.join(" > "),
        snippet: compact(block.attributes.content || block.originalContent),
      });
    }

    if (block.isValid === false) {
      const issues = (block.validationIssues || []).map(formatIssue).filter(Boolean);
      let expected = "";
      try {
        expected = compact(getSaveContent(getBlockType(block.name), block.attributes, block.innerBlocks));
      } catch (error) {
        issues.push(`save() threw: ${error.message}`);
      }
      invalid.push({
        block: block.name,
        path: path.join(" > "),
        issues: [...new Set(issues)],
        expected,
        actual: compact(block.originalContent),
      });
      return;
    }

    // A block that parses as valid through a deprecated save() is migrated by
    // the parser; the editor would re-save it with new markup.
    if (options.markup !== undefined && block.isValid !== false && !RAW_BLOCKS.has(block.name)) {
      const [stillValid] = quietly(() => env.blocks.validateBlock(block));
      if (!stillValid) migrated.push({ block: block.name, path: path.join(" > ") });
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    markup,
    counts,
    total,
    invalid,
    fallbacks,
    migrated,
    roundTrip: { stable: reserialized === markup },
    reparsed,
  };
}
