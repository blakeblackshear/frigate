'use strict';

var svgo = require('svgo');
var cosmiconfig = require('cosmiconfig');

const explorer = cosmiconfig.cosmiconfigSync("svgo", {
  searchPlaces: [
    "package.json",
    ".svgorc",
    ".svgorc.js",
    ".svgorc.json",
    ".svgorc.yaml",
    ".svgorc.yml",
    "svgo.config.js",
    "svgo.config.cjs",
    ".svgo.yml"
  ],
  transform: (result) => result && result.config,
  cache: true
});
const getSvgoConfigFromSvgrConfig = (config) => {
  const params = { overrides: {} };
  if (config.icon || config.dimensions === false) {
    params.overrides.removeViewBox = false;
  }
  if (config.native) {
    params.overrides.inlineStyles = {
      onlyMatchedOnce: false
    };
  }
  return {
    plugins: [
      {
        name: "preset-default",
        params
      },
      "prefixIds"
    ]
  };
};
const getSvgoConfig = (config, state) => {
  const cwd = state.filePath || process.cwd();
  if (config.svgoConfig)
    return config.svgoConfig;
  if (config.runtimeConfig) {
    const userConfig = explorer.search(cwd);
    if (userConfig)
      return userConfig;
  }
  return getSvgoConfigFromSvgrConfig(config);
};

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
const svgoPlugin = (code, config, state) => {
  if (!config.svgo)
    return code;
  const svgoConfig = getSvgoConfig(config, state);
  const result = svgo.optimize(code, __spreadProps(__spreadValues({}, svgoConfig), { path: state.filePath }));
  if (result.modernError) {
    throw result.modernError;
  }
  return result.data;
};

module.exports = svgoPlugin;
//# sourceMappingURL=index.js.map
