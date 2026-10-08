// Design mapping: turns inline CSS on an element into block attributes that
// the target block actually supports (block supports and theme.json presets),
// and reports every declaration it had to drop and why.
//
// The mapping is deliberately narrow and documented in
// references/design-mapping.md. Anything outside it is reported as unmapped
// rather than guessed.

import {
  backgroundUrl,
  expandBox,
  isGradient,
  isSingleColor,
  parseBorderShorthand,
  parseLength,
  presetFromValue,
  spacingValue,
  splitShorthand,
} from "./css.mjs";

const SIDES = ["top", "right", "bottom", "left"];

function setPath(target, pathParts, value) {
  let node = target;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const key = pathParts[i];
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key];
  }
  node[pathParts[pathParts.length - 1]] = value;
}

function supportsColor(blockType, which) {
  const color = blockType.supports && blockType.supports.color;
  if (!color) return false;
  if (which === "gradients") return color.gradients === true;
  return color[which] !== false;
}

function supportsTypography(blockType, key) {
  const typography = blockType.supports && blockType.supports.typography;
  return Boolean(typography && typography[key]);
}

function supportsSpacing(blockType, key, side) {
  const spacing = blockType.supports && blockType.supports.spacing;
  if (!spacing || !spacing[key]) return false;
  if (Array.isArray(spacing[key])) return side ? spacing[key].includes(side) : true;
  return true;
}

function borderSupport(blockType) {
  const supports = blockType.supports || {};
  return supports.__experimentalBorder || supports.border || null;
}

function supportsBorder(blockType, key) {
  const border = borderSupport(blockType);
  if (!border) return false;
  if (border === true) return true;
  return Boolean(border[key]);
}

function supportsDimension(blockType, key) {
  const dimensions = blockType.supports && blockType.supports.dimensions;
  return Boolean(dimensions && dimensions[key]);
}

function supportsLayout(blockType) {
  const layout = blockType.supports && blockType.supports.layout;
  if (!layout) return false;
  if (layout === true) return true;
  return layout.allowEditing !== false || layout.allowSwitching !== false;
}

function supportsAlign(blockType, value) {
  const align = blockType.supports && blockType.supports.align;
  if (!align) return false;
  if (align === true) return true;
  return Array.isArray(align) && align.includes(value);
}

function hasAttribute(blockType, name) {
  return Boolean(blockType.attributes && blockType.attributes[name]);
}

function justify(value) {
  switch (String(value).toLowerCase()) {
    case "center":
      return "center";
    case "flex-end":
    case "end":
    case "right":
      return "right";
    case "flex-start":
    case "start":
    case "left":
      return "left";
    case "space-between":
      return "space-between";
    default:
      return null;
  }
}

function verticalFromAlignItems(value) {
  switch (String(value).toLowerCase()) {
    case "center":
      return "center";
    case "flex-end":
    case "end":
      return "bottom";
    case "flex-start":
    case "start":
      return "top";
    case "stretch":
      return "stretch";
    default:
      return null;
  }
}

function gridColumns(value) {
  const repeat = /repeat\(\s*([^,]+)\s*,\s*(.+)\)$/i.exec(value.trim());
  if (repeat) {
    const count = repeat[1].trim();
    if (/^\d+$/.test(count)) return { columnCount: Number(count) };
    const minmax = /minmax\(\s*([^,]+)\s*,/i.exec(repeat[2]);
    if (minmax) return { minimumColumnWidth: minmax[1].trim() };
    return null;
  }
  const tracks = splitShorthand(value);
  if (tracks.length > 0 && tracks.every((t) => /^(\d+(\.\d+)?fr|auto|[\d.]+(px|rem|em|%))$/i.test(t))) {
    return { columnCount: tracks.length };
  }
  return null;
}

/**
 * Maps inline style declarations onto attributes for the given block type.
 *
 * @param {object} options
 * @param {object} options.blockType  Registered block type (getBlockType()).
 * @param {Array}  options.declarations  Output of parseInlineStyle().
 * @param {object} [options.existing]  Attributes already on the block.
 * @return {{ attributes: object, mapped: Array, dropped: Array }}
 */
export function mapDeclarations({ blockType, declarations, existing = {} }) {
  const name = blockType.name;
  const attributes = {};
  const mapped = [];
  const dropped = [];

  const keep = (property, value, attributePath, attributeValue) => {
    setPath(attributes, attributePath, attributeValue);
    mapped.push({ property, value, attribute: attributePath.join("."), result: attributeValue });
  };
  const drop = (property, value, reason) => dropped.push({ property, value, reason });

  // Collected across declarations so shorthands and longhands combine.
  const layout = {};
  let hasLayout = false;
  const setLayout = (property, value, key, result) => {
    layout[key] = result;
    hasLayout = true;
    mapped.push({ property, value, attribute: `layout.${key}`, result });
  };

  for (const { property, value } of declarations) {
    const preset = presetFromValue(value);

    switch (property) {
      case "background-color":
      case "background": {
        if (property === "background" && isGradient(value)) {
          if (name === "core/cover") {
            if (preset && preset.kind === "gradient") keep(property, value, ["gradient"], preset.slug);
            else keep(property, value, ["customGradient"], value);
          } else if (!supportsColor(blockType, "gradients")) {
            drop(property, value, `${name} has no gradient support; wrap it in a Group and set the gradient there`);
          } else if (preset && preset.kind === "gradient") keep(property, value, ["gradient"], preset.slug);
          else keep(property, value, ["style", "color", "gradient"], value);
          break;
        }
        if (property === "background" && backgroundUrl(value)) {
          const url = backgroundUrl(value);
          if (name === "core/cover") keep(property, value, ["url"], url);
          else if (blockType.supports && blockType.supports.background && blockType.supports.background.backgroundImage) {
            keep(property, value, ["style", "background", "backgroundImage"], { url });
          } else drop(property, value, `${name} has no background image support; use a Cover or a Group`);
          break;
        }
        if (!isSingleColor(value)) {
          drop(property, value, "only a single colour, a gradient or a url() is mapped");
          break;
        }
        if (name === "core/cover") {
          if (preset && preset.kind === "color") keep(property, value, ["overlayColor"], preset.slug);
          else keep(property, value, ["customOverlayColor"], value);
          break;
        }
        if (!supportsColor(blockType, "background")) {
          drop(property, value, `${name} has no background colour support; wrap it in a Group and colour the Group`);
          break;
        }
        if (preset && preset.kind === "color") keep(property, value, ["backgroundColor"], preset.slug);
        else keep(property, value, ["style", "color", "background"], value);
        break;
      }

      case "color": {
        if (!supportsColor(blockType, "text")) {
          drop(property, value, `${name} has no text colour support; set the colour on the text blocks or a wrapping Group`);
          break;
        }
        if (preset && preset.kind === "color") keep(property, value, ["textColor"], preset.slug);
        else keep(property, value, ["style", "color", "text"], value);
        break;
      }

      case "background-image": {
        if (isGradient(value)) {
          if (name === "core/cover") {
            if (preset && preset.kind === "gradient") keep(property, value, ["gradient"], preset.slug);
            else keep(property, value, ["customGradient"], value);
          } else if (!supportsColor(blockType, "gradients")) drop(property, value, `${name} has no gradient support`);
          else if (preset && preset.kind === "gradient") keep(property, value, ["gradient"], preset.slug);
          else keep(property, value, ["style", "color", "gradient"], value);
          break;
        }
        const url = backgroundUrl(value);
        if (!url) {
          drop(property, value, "only url() and gradients are mapped");
          break;
        }
        if (name === "core/cover") keep(property, value, ["url"], url);
        else if (blockType.supports && blockType.supports.background && blockType.supports.background.backgroundImage) {
          keep(property, value, ["style", "background", "backgroundImage"], { url });
        } else drop(property, value, `${name} has no background image support; use a Cover or a Group`);
        break;
      }

      case "font-size": {
        if (!supportsTypography(blockType, "fontSize")) {
          drop(property, value, `${name} has no font size support`);
          break;
        }
        if (preset && preset.kind === "font-size") keep(property, value, ["fontSize"], preset.slug);
        else keep(property, value, ["style", "typography", "fontSize"], value);
        break;
      }

      case "font-family": {
        if (!supportsTypography(blockType, "__experimentalFontFamily") && !supportsTypography(blockType, "fontFamily")) {
          drop(property, value, `${name} has no font family support`);
          break;
        }
        if (preset && preset.kind === "font-family") keep(property, value, ["fontFamily"], preset.slug);
        else keep(property, value, ["style", "typography", "fontFamily"], value);
        break;
      }

      case "font-weight":
      case "font-style":
      case "line-height":
      case "letter-spacing":
      case "text-transform":
      case "text-decoration": {
        const map = {
          "font-weight": ["__experimentalFontWeight", "fontWeight"],
          "font-style": ["__experimentalFontStyle", "fontStyle"],
          "line-height": ["lineHeight", "lineHeight"],
          "letter-spacing": ["__experimentalLetterSpacing", "letterSpacing"],
          "text-transform": ["__experimentalTextTransform", "textTransform"],
          "text-decoration": ["__experimentalTextDecoration", "textDecoration"],
        };
        const [supportKey, attributeKey] = map[property];
        if (!supportsTypography(blockType, supportKey) && !supportsTypography(blockType, attributeKey)) {
          drop(property, value, `${name} has no ${property} support`);
          break;
        }
        keep(property, value, ["style", "typography", attributeKey], value);
        break;
      }

      case "text-align": {
        const aligned = justify(value);
        if (!aligned || aligned === "space-between") {
          drop(property, value, "only left, center and right are mapped");
          break;
        }
        if (name === "core/buttons") {
          setLayout(property, value, "justifyContent", aligned);
          break;
        }
        if (supportsTypography(blockType, "textAlign")) {
          keep(property, value, ["style", "typography", "textAlign"], aligned);
          break;
        }
        if (hasAttribute(blockType, "textAlign")) {
          keep(property, value, ["textAlign"], aligned);
          break;
        }
        drop(property, value, `${name} has no text alignment; align the headings and paragraphs inside it instead`);
        break;
      }

      case "padding":
      case "margin": {
        const box = expandBox(value);
        if (!box) {
          drop(property, value, "could not read the shorthand");
          break;
        }
        for (const side of SIDES) {
          if (!supportsSpacing(blockType, property, side)) {
            drop(`${property}-${side}`, box[side], `${name} has no ${property} support on that side`);
            continue;
          }
          keep(`${property}-${side}`, box[side], ["style", "spacing", property, side], spacingValue(box[side]));
        }
        break;
      }

      case "padding-top":
      case "padding-right":
      case "padding-bottom":
      case "padding-left":
      case "margin-top":
      case "margin-right":
      case "margin-bottom":
      case "margin-left": {
        const [kind, side] = property.split("-");
        if (!supportsSpacing(blockType, kind, side)) {
          drop(property, value, `${name} has no ${kind} support on the ${side}`);
          break;
        }
        keep(property, value, ["style", "spacing", kind, side], spacingValue(value));
        break;
      }

      case "gap":
      case "row-gap":
      case "column-gap": {
        if (!supportsSpacing(blockType, "blockGap")) {
          drop(property, value, `${name} has no block gap support`);
          break;
        }
        const tokens = splitShorthand(value);
        if (property === "gap" && tokens.length === 2) {
          keep(property, value, ["style", "spacing", "blockGap"], { top: spacingValue(tokens[0]), left: spacingValue(tokens[1]) });
        } else if (property === "column-gap") {
          const current = attributes.style && attributes.style.spacing && attributes.style.spacing.blockGap;
          const top = current && typeof current === "object" ? current.top : current;
          keep(property, value, ["style", "spacing", "blockGap"], top ? { top, left: spacingValue(value) } : { left: spacingValue(value) });
        } else if (property === "row-gap") {
          const current = attributes.style && attributes.style.spacing && attributes.style.spacing.blockGap;
          const left = current && typeof current === "object" ? current.left : undefined;
          keep(property, value, ["style", "spacing", "blockGap"], left ? { top: spacingValue(value), left } : spacingValue(value));
        } else {
          keep(property, value, ["style", "spacing", "blockGap"], spacingValue(tokens[0]));
        }
        break;
      }

      case "border": {
        const parsed = parseBorderShorthand(value);
        for (const key of ["width", "style", "color"]) {
          if (parsed[key] === undefined) continue;
          if (!supportsBorder(blockType, key)) {
            drop(`border-${key}`, parsed[key], `${name} has no border ${key} support`);
            continue;
          }
          const colourPreset = key === "color" ? presetFromValue(parsed[key]) : null;
          if (colourPreset && colourPreset.kind === "color" && hasAttribute(blockType, "borderColor")) {
            keep(`border-${key}`, parsed[key], ["borderColor"], colourPreset.slug);
          } else {
            keep(`border-${key}`, parsed[key], ["style", "border", key], parsed[key]);
          }
        }
        break;
      }

      case "border-width":
      case "border-style":
      case "border-color": {
        const key = property.split("-")[1];
        if (!supportsBorder(blockType, key)) {
          drop(property, value, `${name} has no border ${key} support`);
          break;
        }
        if (key === "color" && preset && preset.kind === "color" && hasAttribute(blockType, "borderColor")) {
          keep(property, value, ["borderColor"], preset.slug);
        } else {
          keep(property, value, ["style", "border", key], value);
        }
        break;
      }

      case "border-top":
      case "border-right":
      case "border-bottom":
      case "border-left": {
        const side = property.split("-")[1];
        const parsed = parseBorderShorthand(value);
        for (const key of ["width", "style", "color"]) {
          if (parsed[key] === undefined) continue;
          if (!supportsBorder(blockType, key)) {
            drop(`${property}-${key}`, parsed[key], `${name} has no border ${key} support`);
            continue;
          }
          keep(`${property}-${key}`, parsed[key], ["style", "border", side, key], parsed[key]);
        }
        break;
      }

      case "border-radius": {
        if (!supportsBorder(blockType, "radius")) {
          drop(property, value, `${name} has no border radius support`);
          break;
        }
        keep(property, value, ["style", "border", "radius"], value);
        break;
      }

      case "box-shadow": {
        if (!(blockType.supports && blockType.supports.shadow)) {
          drop(property, value, `${name} has no shadow support`);
          break;
        }
        if (preset && preset.kind === "shadow") keep(property, value, ["style", "shadow"], `var:preset|shadow|${preset.slug}`);
        else keep(property, value, ["style", "shadow"], value);
        break;
      }

      case "min-height": {
        if (name === "core/cover") {
          const length = parseLength(value);
          if (!length) {
            drop(property, value, "Cover needs a number with a unit");
            break;
          }
          keep(property, value, ["minHeight"], length.number);
          keep(property, value, ["minHeightUnit"], length.unit);
          break;
        }
        if (!supportsDimension(blockType, "minHeight")) {
          drop(property, value, `${name} has no min-height support`);
          break;
        }
        keep(property, value, ["style", "dimensions", "minHeight"], value);
        break;
      }

      case "width": {
        if (name === "core/column" || name === "core/image") {
          keep(property, value, ["width"], value);
          break;
        }
        if (name === "core/button") {
          if (supportsDimension(blockType, "width")) keep(property, value, ["style", "dimensions", "width"], value);
          else drop(property, value, "Button has no width support in this block library");
          break;
        }
        if (name === "core/media-text") {
          drop(property, value, "set mediaWidth in data-block-attrs instead");
          break;
        }
        drop(property, value, `${name} has no width attribute`);
        break;
      }

      case "height": {
        if (name === "core/spacer" || name === "core/image") {
          keep(property, value, ["height"], value);
          break;
        }
        drop(property, value, `${name} has no height attribute`);
        break;
      }

      case "aspect-ratio": {
        if (hasAttribute(blockType, "aspectRatio")) keep(property, value, ["aspectRatio"], value);
        else drop(property, value, `${name} has no aspectRatio attribute`);
        break;
      }

      case "object-fit": {
        if (hasAttribute(blockType, "scale")) keep(property, value, ["scale"], value);
        else drop(property, value, `${name} has no scale attribute`);
        break;
      }

      case "max-width": {
        if (name === "core/group" || name === "core/cover") {
          if (!layout.type || layout.type === "constrained") {
            setLayout(property, value, "type", "constrained");
            setLayout(property, value, "contentSize", value);
          } else {
            drop(property, value, "max-width only maps to a constrained layout");
          }
          break;
        }
        drop(property, value, "max-width maps only on a Group or Cover (constrained layout contentSize)");
        break;
      }

      case "display": {
        const display = value.toLowerCase();
        if (display === "flex" || display === "inline-flex") {
          if (!supportsLayout(blockType)) {
            drop(property, value, `${name} has no layout support; use a Group`);
            break;
          }
          setLayout(property, value, "type", "flex");
          break;
        }
        if (display === "grid") {
          if (!supportsLayout(blockType)) {
            drop(property, value, `${name} has no layout support; use a Group`);
            break;
          }
          setLayout(property, value, "type", "grid");
          break;
        }
        drop(property, value, "only flex and grid change the layout");
        break;
      }

      case "flex-direction": {
        if (!supportsLayout(blockType)) {
          drop(property, value, `${name} has no layout support`);
          break;
        }
        if (/column/.test(value)) setLayout(property, value, "orientation", "vertical");
        else setLayout(property, value, "orientation", "horizontal");
        break;
      }

      case "justify-content": {
        if (!supportsLayout(blockType)) {
          drop(property, value, `${name} has no layout support`);
          break;
        }
        const mappedValue = justify(value);
        if (!mappedValue) drop(property, value, "only left, center, right and space-between are mapped");
        else setLayout(property, value, "justifyContent", mappedValue);
        break;
      }

      case "flex-wrap": {
        if (!supportsLayout(blockType)) {
          drop(property, value, `${name} has no layout support`);
          break;
        }
        setLayout(property, value, "flexWrap", /nowrap/.test(value) ? "nowrap" : "wrap");
        break;
      }

      case "align-items": {
        if (name === "core/columns" || name === "core/column" || name === "core/media-text") {
          const v = verticalFromAlignItems(value);
          if (v && v !== "stretch") keep(property, value, ["verticalAlignment"], v);
          else drop(property, value, "only top, center and bottom are mapped");
          break;
        }
        if (!supportsLayout(blockType)) {
          drop(property, value, `${name} has no layout support`);
          break;
        }
        const v = verticalFromAlignItems(value);
        if (!v) {
          drop(property, value, "only flex-start, center, flex-end and stretch are mapped");
          break;
        }
        if (layout.orientation === "vertical") {
          const horizontal = { top: "left", center: "center", bottom: "right", stretch: "stretch" }[v];
          setLayout(property, value, "justifyContent", horizontal);
        } else {
          setLayout(property, value, "verticalAlignment", v);
        }
        break;
      }

      case "grid-template-columns": {
        if (!supportsLayout(blockType)) {
          drop(property, value, `${name} has no layout support`);
          break;
        }
        const columns = gridColumns(value);
        if (!columns) {
          drop(property, value, "only repeat(N, ...) and repeat(auto-fit|auto-fill, minmax(X, ...)) are mapped");
          break;
        }
        setLayout(property, value, "type", "grid");
        for (const [key, v] of Object.entries(columns)) setLayout(property, value, key, v);
        break;
      }

      default:
        drop(property, value, "not part of the mapping; see references/design-mapping.md");
    }
  }

  if (hasLayout) {
    if (!layout.type) layout.type = "flex";
    attributes.layout = { ...(existing.layout || {}), ...layout };
  }

  return { attributes, mapped, dropped };
}

/**
 * Applies an explicit `align` request and checks the block accepts it.
 */
export function checkAlign(blockType, value) {
  // Block alignment (wide, full, left, center, right) comes from the align
  // support. Text alignment is a typography matter and is mapped from
  // text-align instead, so a paragraph's legacy "align" enum is not consulted.
  if (blockType.supports && blockType.supports.align !== undefined) return supportsAlign(blockType, value);
  const attribute = blockType.attributes && blockType.attributes.align;
  if (attribute && Array.isArray(attribute.enum)) return attribute.enum.includes(value);
  return false;
}

export function supportsAnchor(blockType) {
  return Boolean(blockType.supports && blockType.supports.anchor);
}

export { setPath };
