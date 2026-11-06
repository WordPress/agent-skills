// Boots a DOM in Node and loads @wordpress/blocks with the core block library
// registered, so rawHandler, createBlock, serialize and parse run without a
// WordPress install or a browser.
//
// The WordPress packages ship an ESM build that imports JSON without import
// attributes (bundler-only), so the CommonJS build is loaded through
// createRequire instead.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// React and the block packages skip development-only checks in production,
// which makes loading the block library noticeably faster.
if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";

let cached = null;
let muted = false;

// The block parser's logger binds console.error and console.warn when the
// package loads, so the wrappers must be in place before the first require.
for (const method of ["error", "warn", "info", "log", "groupCollapsed", "groupEnd"]) {
  const original = console[method].bind(console);
  console[method] = (...args) => {
    if (!muted) original(...args);
  };
}

/**
 * Runs fn with console output muted. The block parser logs every validation
 * failure to the console with a dump of the block type; the same facts are
 * read from the parsed blocks and reported in a readable form instead.
 */
export function quietly(fn) {
  const previous = muted;
  muted = true;
  try {
    return fn();
  } finally {
    muted = previous;
  }
}

function installDomGlobals(window) {
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis) continue;
    try {
      Object.defineProperty(globalThis, key, { get: () => window[key], configurable: true });
    } catch {
      // Some window properties cannot be mirrored; none of them matter here.
    }
  }
  for (const key of ["window", "document", "navigator"]) {
    try {
      Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
    } catch {
      // Node 21+ exposes a read-only navigator; the jsdom one is reachable through window.
    }
  }
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = () => ({
      matches: false,
      media: "",
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
  }
}

function missingDependencyMessage(error) {
  return [
    `Missing dependency: ${error.message.split("\n")[0]}`,
    "",
    "Install the pinned packages once:",
    `  cd ${scriptsDir}`,
    "  npm install",
    "",
  ].join("\n");
}

/**
 * Loads jsdom, @wordpress/blocks and @wordpress/block-library, registers the
 * core blocks and returns the blocks API plus package versions.
 */
export function loadBlocksEnvironment() {
  if (cached) return cached;

  let JSDOM;
  let VirtualConsole;
  let blocks;
  let blockLibrary;
  try {
    ({ JSDOM, VirtualConsole } = require("jsdom"));
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) => {
      // The block library injects editor stylesheets that jsdom cannot parse.
      // They have no effect on conversion, so only other errors are shown.
      if (!/Could not parse CSS stylesheet/.test(String(error && error.message))) {
        process.stderr.write(`jsdom: ${error && error.message}\n`);
      }
    });
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      url: "http://localhost/",
      virtualConsole,
    });
    installDomGlobals(dom.window);

    blocks = require("@wordpress/blocks");
    blockLibrary = require("@wordpress/block-library");
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      process.stderr.write(missingDependencyMessage(error));
      process.exit(2);
    }
    throw error;
  }

  blockLibrary.registerCoreBlocks();

  const versions = {
    "@wordpress/blocks": require("@wordpress/blocks/package.json").version,
    "@wordpress/block-library": require("@wordpress/block-library/package.json").version,
    jsdom: require("jsdom/package.json").version,
    node: process.versions.node,
  };

  cached = { blocks, versions, window: globalThis.window };
  return cached;
}
