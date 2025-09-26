'use strict';

var util = require('util');
var core = require('@babel/core');
var core$1 = require('@svgr/core');
var path = require('path');
var svgo = require('@svgr/plugin-svgo');
var jsx = require('@svgr/plugin-jsx');
var presetReact = require('@babel/preset-react');
var presetEnv = require('@babel/preset-env');
var presetTS = require('@babel/preset-typescript');
var pluginTransformReactConstantElements = require('@babel/plugin-transform-react-constant-elements');

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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
const babelOptions = {
  babelrc: false,
  configFile: false,
  presets: [
    core.createConfigItem(presetReact, { type: "preset" }),
    core.createConfigItem([presetEnv, { modules: false }], { type: "preset" })
  ],
  plugins: [core.createConfigItem(pluginTransformReactConstantElements)]
};
const typeScriptBabelOptions = __spreadProps(__spreadValues({}, babelOptions), {
  presets: [
    ...babelOptions.presets,
    core.createConfigItem(
      [presetTS, { allowNamespaces: true, allExtensions: true, isTSX: true }],
      { type: "preset" }
    )
  ]
});
const tranformSvg = util.callbackify(
  async (contents, options, state) => {
    const _a = options, { babel = true } = _a, config = __objRest(_a, ["babel"]);
    const jsCode = await core$1.transform(contents, config, state);
    if (!babel)
      return jsCode;
    const result = await core.transformAsync(
      jsCode,
      options.typescript ? typeScriptBabelOptions : babelOptions
    );
    if (!(result == null ? void 0 : result.code)) {
      throw new Error(`Error while transforming using Babel`);
    }
    return result.code;
  }
);
function svgrLoader(contents) {
  this.cacheable && this.cacheable();
  const callback = this.async();
  const options = this.getOptions();
  const previousExport = (() => {
    if (contents.startsWith("export "))
      return contents;
    const exportMatches = contents.match(/^module.exports\s*=\s*(.*)/);
    return exportMatches ? `export default ${exportMatches[1]}` : null;
  })();
  const state = {
    caller: {
      name: "@svgr/webpack",
      previousExport,
      defaultPlugins: [svgo, jsx]
    },
    filePath: path.normalize(this.resourcePath)
  };
  if (!previousExport) {
    tranformSvg(contents, options, state, callback);
  } else {
    this.fs.readFile(this.resourcePath, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      tranformSvg(String(result), options, state, (err2, content) => {
        if (err2) {
          callback(err2);
          return;
        }
        callback(null, content);
      });
    });
  }
}

module.exports = svgrLoader;
//# sourceMappingURL=index.js.map
