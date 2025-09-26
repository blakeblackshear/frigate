'use strict';

var svgParser = require('svg-parser');
var hastToBabelAst = require('@svgr/hast-util-to-babel-ast');
var core = require('@babel/core');
var svgrBabelPreset = require('@svgr/babel-preset');

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const getJsxRuntimeOptions = (config) => {
  if (config.jsxRuntimeImport) {
    return {
      importSource: config.jsxRuntimeImport.source,
      jsxRuntimeImport: config.jsxRuntimeImport
    };
  }
  switch (config.jsxRuntime) {
    case null:
    case void 0:
    case "classic":
      return {
        jsxRuntime: "classic",
        importSource: "react",
        jsxRuntimeImport: { namespace: "React", source: "react" }
      };
    case "classic-preact":
      return {
        jsxRuntime: "classic",
        importSource: "preact/compat",
        jsxRuntimeImport: { specifiers: ["h"], source: "preact" }
      };
    case "automatic":
      return { jsxRuntime: "automatic" };
    default:
      throw new Error(`Unsupported "jsxRuntime" "${config.jsxRuntime}"`);
  }
};
const jsxPlugin = (code, config, state) => {
  const filePath = state.filePath || "unknown";
  const hastTree = svgParser.parse(code);
  const babelTree = hastToBabelAst(hastTree);
  const svgPresetOptions = __spreadProps(__spreadValues({
    ref: config.ref,
    titleProp: config.titleProp,
    descProp: config.descProp,
    expandProps: config.expandProps,
    dimensions: config.dimensions,
    icon: config.icon,
    native: config.native,
    svgProps: config.svgProps,
    replaceAttrValues: config.replaceAttrValues,
    typescript: config.typescript,
    template: config.template,
    memo: config.memo,
    exportType: config.exportType,
    namedExport: config.namedExport
  }, getJsxRuntimeOptions(config)), {
    state
  });
  const result = core.transformFromAstSync(babelTree, code, __spreadValues({
    caller: {
      name: "svgr"
    },
    presets: [
      core.createConfigItem([svgrBabelPreset, svgPresetOptions], {
        type: "preset"
      })
    ],
    filename: filePath,
    babelrc: false,
    configFile: false,
    code: true,
    ast: false,
    // @ts-ignore
    inputSourceMap: false
  }, config.jsx && config.jsx.babelConfig));
  if (!(result == null ? void 0 : result.code)) {
    throw new Error(`Unable to generate SVG file`);
  }
  return result.code;
};

module.exports = jsxPlugin;
//# sourceMappingURL=index.js.map
