// HTML to blocks conversion.
//
// Leaf content (headings, paragraphs, lists, quotes, code, tables, images,
// separators, video, embeds) goes through rawHandler() from @wordpress/blocks,
// which matches each element against the raw transforms the registered core
// blocks declare. rawHandler has no transform for layout wrappers, so the
// containers below (Group, Columns, Buttons, Cover, Media & Text, Details,
// Spacer) are built with createBlock() from the registered block types and the
// block's own save() produces their markup. No block delimiter is written by
// hand anywhere in this file.
//
// Design on an element (inline style, id, class, data-block-attrs) is mapped
// onto the attributes the target block supports; see design.mjs.

import { parseInlineStyle } from "./css.mjs";
import { checkAlign, mapDeclarations, setPath, supportsAnchor } from "./design.mjs";

const CONTAINER_TAGS = new Set(["section", "div", "article", "aside", "header", "footer", "main", "nav"]);
const GROUP_TAG_NAMES = new Set(["section", "article", "aside", "header", "footer", "main", "nav"]);
const BUTTON_CLASSES = new Set(["button", "btn", "wp-block-button__link", "wp-element-button"]);

export const CONTAINER_BLOCKS = new Set([
  "core/group",
  "core/columns",
  "core/column",
  "core/buttons",
  "core/button",
  "core/cover",
  "core/media-text",
  "core/details",
  "core/spacer",
]);

const DATA_BLOCK = "data-block";
const DATA_ATTRS = "data-block-attrs";

function describeElement(element) {
  const parts = [element.tagName.toLowerCase()];
  if (element.id) parts.push(`#${element.id}`);
  const classes = (element.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 2);
  for (const c of classes) parts.push(`.${c}`);
  const text = (element.textContent || "").replace(/\s+/g, " ").trim();
  const label = parts.join("");
  return text ? `${label} "${text.length > 40 ? `${text.slice(0, 40)}...` : text}"` : label;
}

function snippet(html, max = 160) {
  const compact = html.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function isElement(node) {
  return node.nodeType === 1;
}

function isMeaningfulText(node) {
  return node.nodeType === 3 && node.textContent.trim() !== "";
}

function isButtonLink(element) {
  if (!isElement(element)) return false;
  const tag = element.tagName.toLowerCase();
  if (tag !== "a" && tag !== "button") return false;
  if (element.getAttribute(DATA_BLOCK) === "core/button") return true;
  if (element.getAttribute("role") === "button" && tag === "a") return true;
  const classes = (element.getAttribute("class") || "").split(/\s+/).filter(Boolean);
  return classes.some((c) => BUTTON_CLASSES.has(c));
}

function isButtonParagraph(element) {
  if (element.tagName.toLowerCase() !== "p") return false;
  const children = Array.from(element.childNodes).filter((n) => isElement(n) || isMeaningfulText(n));
  return children.length === 1 && isButtonLink(children[0]);
}

function readExplicitAttributes(element, report, label) {
  const raw = element.getAttribute(DATA_ATTRS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    report.warnings.push(`${label}: ${DATA_ATTRS} must be a JSON object; ignored`);
  } catch (error) {
    report.warnings.push(`${label}: ${DATA_ATTRS} is not valid JSON (${error.message}); ignored`);
  }
  return {};
}

function stripOurAttributes(root) {
  const all = [root, ...root.querySelectorAll(`[${DATA_BLOCK}],[${DATA_ATTRS}]`)];
  for (const el of all) {
    el.removeAttribute(DATA_BLOCK);
    el.removeAttribute(DATA_ATTRS);
  }
}

/**
 * Finds a citation inside a blockquote: a direct <cite>, or a <footer> or <p>
 * whose only element is a <cite>. Returns the cite and the node to remove.
 */
function findCitation(blockquote) {
  for (const child of Array.from(blockquote.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "cite") return { cite: child, remove: child };
    if (tag === "footer" || tag === "p") {
      const elements = Array.from(child.children);
      const text = Array.from(child.childNodes).filter(isMeaningfulText);
      if (elements.length === 1 && text.length === 0 && elements[0].tagName.toLowerCase() === "cite") {
        return { cite: elements[0], remove: child };
      }
    }
  }
  return null;
}

function deepMerge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (value && typeof value === "object" && !Array.isArray(value) && out[key] && typeof out[key] === "object" && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export class Converter {
  constructor(env, options = {}) {
    this.blocks = env.blocks;
    this.window = env.window;
    this.options = options;
    this.report = {
      design: { mapped: [], dropped: [] },
      fallbacks: [],
      warnings: [],
    };
  }

  /**
   * Converts an HTML string (fragment or full document) to a block list.
   */
  convert(html) {
    const parser = new this.window.DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return this.convertChildren(doc.body);
  }

  classify(element) {
    const explicit = element.getAttribute(DATA_BLOCK);
    const tag = element.tagName.toLowerCase();
    if (explicit) {
      if (CONTAINER_BLOCKS.has(explicit)) return explicit;
      this.report.warnings.push(
        `${describeElement(element)}: ${DATA_BLOCK}="${explicit}" is not a container this script builds; the element went through rawHandler instead`
      );
    }
    if (isButtonLink(element) || isButtonParagraph(element)) return "core/button";
    if (tag === "details") return "core/details";
    if (CONTAINER_TAGS.has(tag)) return "core/group";
    return "leaf";
  }

  convertChildren(parent) {
    const result = [];
    let pendingButtons = [];
    const flushButtons = () => {
      if (pendingButtons.length === 0) return;
      result.push(this.buildButtons(null, pendingButtons));
      pendingButtons = [];
    };

    for (const node of Array.from(parent.childNodes)) {
      if (isMeaningfulText(node)) {
        flushButtons();
        result.push(...this.convertLeafHtml(node.textContent, `text "${snippet(node.textContent, 40)}"`, null));
        continue;
      }
      if (!isElement(node)) continue;

      const kind = this.classify(node);
      if (kind === "core/button") {
        pendingButtons.push(node);
        continue;
      }
      flushButtons();

      switch (kind) {
        case "core/group":
          result.push(this.buildGroup(node));
          break;
        case "core/columns":
          result.push(this.buildColumns(node));
          break;
        case "core/column":
          this.report.warnings.push(`${describeElement(node)}: a core/column outside core/columns was built as a Group`);
          result.push(this.buildGroup(node));
          break;
        case "core/buttons":
          result.push(this.buildButtons(node, Array.from(node.children)));
          break;
        case "core/cover":
          result.push(this.buildCover(node));
          break;
        case "core/media-text":
          result.push(this.buildMediaText(node));
          break;
        case "core/details":
          result.push(this.buildDetails(node));
          break;
        case "core/spacer":
          result.push(this.buildSpacer(node));
          break;
        default:
          result.push(...this.convertLeaf(node));
      }
    }
    flushButtons();
    return result;
  }

  /**
   * Builds a block of the given name from an element: maps its design, merges
   * explicit attributes, drops what the block does not define, and reports.
   */
  createFromElement(name, element, baseAttributes, innerBlocks, options = {}) {
    const { createBlock, getBlockType } = this.blocks;
    const blockType = getBlockType(name);
    const label = options.label || describeElement(element);
    const declarations = parseInlineStyle(element.getAttribute("style"));

    const { attributes: designAttributes, mapped, dropped } = mapDeclarations({
      blockType,
      declarations,
      existing: baseAttributes,
    });
    for (const m of mapped) this.report.design.mapped.push({ element: label, block: name, ...m });
    for (const d of dropped) this.report.design.dropped.push({ element: label, block: name, ...d });

    let attributes = deepMerge(baseAttributes, designAttributes);

    if (element.id && supportsAnchor(blockType) && !attributes.anchor) attributes.anchor = element.id;
    const className = (element.getAttribute("class") || "").trim();
    if (className && blockType.attributes.className && !attributes.className && name !== "core/button") {
      attributes.className = className;
    }
    if (className && name === "core/button" && !attributes.className) {
      // Keep style variations (is-style-outline) and any site classes; drop
      // the marker classes used to recognise the link as a button.
      const kept = className.split(/\s+/).filter((c) => c && !BUTTON_CLASSES.has(c));
      if (kept.length) attributes.className = kept.join(" ");
    }

    const explicit = readExplicitAttributes(element, this.report, label);
    attributes = deepMerge(attributes, explicit);

    if (attributes.align !== undefined && !checkAlign(blockType, attributes.align)) {
      this.report.design.dropped.push({
        element: label,
        block: name,
        property: "align",
        value: attributes.align,
        reason: `${name} does not accept align "${attributes.align}"`,
      });
      delete attributes.align;
    }

    for (const key of Object.keys(attributes)) {
      if (!blockType.attributes[key]) {
        this.report.design.dropped.push({
          element: label,
          block: name,
          property: key,
          value: JSON.stringify(attributes[key]),
          reason: `${name} has no attribute "${key}"`,
        });
        delete attributes[key];
      }
    }

    return createBlock(name, attributes, innerBlocks);
  }

  buildGroup(element) {
    const tag = element.tagName.toLowerCase();
    const base = { layout: { type: "constrained" } };
    if (GROUP_TAG_NAMES.has(tag)) base.tagName = tag;
    const inner = this.convertChildren(element);
    return this.createFromElement("core/group", element, base, inner);
  }

  buildColumns(element) {
    const columns = [];
    for (const child of Array.from(element.childNodes)) {
      if (isMeaningfulText(child)) {
        this.report.warnings.push(`${describeElement(element)}: text directly inside core/columns was dropped; wrap it in an element`);
        continue;
      }
      if (!isElement(child)) continue;
      const inner = this.convertChildren(child);
      columns.push(this.createFromElement("core/column", child, {}, inner));
    }
    if (columns.length === 0) this.report.warnings.push(`${describeElement(element)}: core/columns has no columns`);
    return this.createFromElement("core/columns", element, {}, columns);
  }

  buildButtons(wrapper, links) {
    const buttons = [];
    for (const node of links) {
      let link = node;
      if (isElement(node) && node.tagName.toLowerCase() === "p") {
        link = Array.from(node.childNodes).find((n) => isElement(n));
      }
      if (!isElement(link)) continue;
      const tag = link.tagName.toLowerCase();
      if (tag !== "a" && tag !== "button") {
        this.report.warnings.push(`${describeElement(link)}: only <a> and <button> become core/button; skipped`);
        continue;
      }
      const base = { text: link.innerHTML.trim() };
      if (tag === "a") {
        if (link.getAttribute("href")) base.url = link.getAttribute("href");
        if (link.getAttribute("target")) base.linkTarget = link.getAttribute("target");
        if (link.getAttribute("rel")) base.rel = link.getAttribute("rel");
      } else {
        base.tagName = "button";
        if (link.getAttribute("type")) base.type = link.getAttribute("type");
      }
      buttons.push(this.createFromElement("core/button", link, base, []));
    }
    if (wrapper) return this.createFromElement("core/buttons", wrapper, {}, buttons);
    return this.blocks.createBlock("core/buttons", {}, buttons);
  }

  buildCover(element) {
    const base = {};
    const inner = this.convertChildren(element);
    const block = this.createFromElement("core/cover", element, base, inner);
    if (block.attributes.url && block.attributes.dimRatio === 100) {
      // The block default (100) hides the image completely. Match the editor
      // default for an image overlay unless the author chose a value.
      block.attributes.dimRatio = 50;
    }
    return block;
  }

  buildMediaText(element) {
    const media = element.querySelector("img, video");
    const base = {};
    if (media) {
      const tag = media.tagName.toLowerCase();
      base.mediaType = tag === "video" ? "video" : "image";
      base.mediaUrl = media.getAttribute("src") || "";
      if (tag === "img") base.mediaAlt = media.getAttribute("alt") || "";
      const figure = media.closest("figure");
      if (figure && figure !== element && figure.parentElement === element && !figure.querySelector("figcaption")) {
        figure.remove();
      } else {
        media.remove();
      }
    } else {
      this.report.warnings.push(`${describeElement(element)}: core/media-text has no <img> or <video>; built without media`);
    }
    const inner = this.convertChildren(element);
    return this.createFromElement("core/media-text", element, base, inner);
  }

  buildDetails(element) {
    const summary = element.querySelector(":scope > summary");
    const base = {};
    if (summary) {
      base.summary = summary.innerHTML.trim();
      summary.remove();
    }
    if (element.hasAttribute("open")) base.showContent = true;
    if (element.getAttribute("name")) base.name = element.getAttribute("name");
    const inner = this.convertChildren(element);
    return this.createFromElement("core/details", element, base, inner);
  }

  buildSpacer(element) {
    return this.createFromElement("core/spacer", element, {}, []);
  }

  /**
   * Converts one leaf element through rawHandler and attaches its design.
   */
  convertLeaf(element) {
    const label = describeElement(element);
    const clone = element.cloneNode(true);
    stripOurAttributes(clone);
    const style = clone.getAttribute("style");
    clone.removeAttribute("style");

    // rawHandler has no transform for a <cite> standing on its own inside a
    // blockquote (it becomes core/html), while the Quote block stores the
    // citation as an attribute. Lift it out before conversion.
    const extra = {};
    if (clone.tagName.toLowerCase() === "blockquote") {
      const citation = findCitation(clone);
      if (citation) {
        extra.citation = citation.cite.innerHTML.trim();
        citation.remove.remove();
      }
    }

    const produced = this.convertLeafHtml(clone.outerHTML, label, element);

    const isFallback = produced.length === 1 && produced[0].name === "core/html";
    if (isFallback) {
      // Keep the original markup, inline style included, so nothing is lost.
      const original = element.cloneNode(true);
      stripOurAttributes(original);
      const html = original.outerHTML;
      const again = this.blocks.rawHandler({ HTML: html });
      const block = again.length === 1 && again[0].name === "core/html" ? again[0] : produced[0];
      this.report.fallbacks.push({
        block: "core/html",
        element: label,
        snippet: snippet(html),
        reason: `no core block has a raw transform for <${element.tagName.toLowerCase()}>`,
      });
      return [block];
    }

    if (produced.length !== 1) {
      const hasDesign = Boolean(style) || element.hasAttribute(DATA_ATTRS) || Object.keys(extra).length > 0;
      if (hasDesign) {
        this.report.warnings.push(
          `${label}: rawHandler split this element into ${produced.length} blocks, so its inline style and ${DATA_ATTRS} were not attached`
        );
      }
      return produced;
    }

    const block = produced[0];
    const needsRebuild = Boolean(style) || element.hasAttribute(DATA_ATTRS) || Boolean(element.id) || Object.keys(extra).length > 0;
    if (!needsRebuild) return [block];

    // A shallow clone carries the style, id, class and data attributes the
    // design step reads; the block already holds the converted content.
    const holder = element.cloneNode(false);
    return [this.createFromElement(block.name, holder, { ...block.attributes, ...extra }, block.innerBlocks, { label })];
  }

  convertLeafHtml(html, label, element) {
    const produced = this.blocks.rawHandler({ HTML: html });
    for (const block of produced) {
      if (block.name === "core/html" && !(produced.length === 1 && element)) {
        this.report.fallbacks.push({
          block: "core/html",
          element: label,
          snippet: snippet(block.attributes.content || ""),
          reason: "rawHandler found no matching raw transform",
        });
      }
    }
    return produced;
  }
}

/**
 * Convenience wrapper.
 */
export function convertHtml(html, env, options) {
  const converter = new Converter(env, options);
  const blocks = converter.convert(html);
  return { blocks, report: converter.report };
}

export { describeElement, snippet };
