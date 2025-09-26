"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _url = _interopRequireDefault(require("url"));
var _path = _interopRequireDefault(require("path"));
var _options = _interopRequireDefault(require("./options.json"));
var _utils = require("./utils");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * The sass-loader makes node-sass and dart-sass available to webpack modules.
 *
 * @this {object}
 * @param {string} content
 */
async function loader(content) {
  const options = this.getOptions(_options.default);
  const callback = this.async();
  let implementation;
  try {
    implementation = (0, _utils.getSassImplementation)(this, options.implementation);
  } catch (error) {
    callback(error);
    return;
  }
  const useSourceMap = typeof options.sourceMap === "boolean" ? options.sourceMap : this.sourceMap;
  // Use `legacy` for `node-sass` and `modern` for `dart-sass` and `sass-embedded`
  const apiType = typeof implementation.compileStringAsync === "undefined" ? "legacy" : typeof options.api === "undefined" ? "modern" : options.api;
  const sassOptions = await (0, _utils.getSassOptions)(this, options, content, implementation, useSourceMap, apiType);
  const shouldUseWebpackImporter = typeof options.webpackImporter === "boolean" ? options.webpackImporter : true;
  if (shouldUseWebpackImporter) {
    const isModernAPI = apiType === "modern" || apiType === "modern-compiler";
    if (!isModernAPI) {
      const {
        includePaths
      } = sassOptions;
      sassOptions.importer.push((0, _utils.getWebpackImporter)(this, implementation, includePaths));
    } else {
      sassOptions.importers.push(
      // No need to pass `loadPaths`, because modern API handle them itself
      (0, _utils.getModernWebpackImporter)(this, implementation, []));
    }
  }
  let compile;
  try {
    compile = (0, _utils.getCompileFn)(this, implementation, apiType);
  } catch (error) {
    callback(error);
    return;
  }
  let result;
  try {
    result = await compile(sassOptions);
  } catch (error) {
    // There are situations when the `file`/`span.url` property do not exist
    // Modern API
    if (error.span && typeof error.span.url !== "undefined") {
      this.addDependency(_url.default.fileURLToPath(error.span.url));
    }
    // Legacy API
    else if (typeof error.file !== "undefined") {
      // `node-sass` returns POSIX paths
      this.addDependency(_path.default.normalize(error.file));
    }
    callback((0, _utils.errorFactory)(error));
    return;
  }
  let map =
  // Modern API, then legacy API
  result.sourceMap ? result.sourceMap : result.map ? JSON.parse(result.map) : null;

  // Modify source paths only for webpack, otherwise we do nothing
  if (map && useSourceMap) {
    map = (0, _utils.normalizeSourceMap)(map, this.rootContext);
  }

  // Modern API
  if (typeof result.loadedUrls !== "undefined") {
    result.loadedUrls.filter(loadedUrl => loadedUrl.protocol === "file:").forEach(includedFile => {
      const normalizedIncludedFile = _url.default.fileURLToPath(includedFile);

      // Custom `importer` can return only `contents` so includedFile will be relative
      if (_path.default.isAbsolute(normalizedIncludedFile)) {
        this.addDependency(normalizedIncludedFile);
      }
    });
  }
  // Legacy API
  else if (typeof result.stats !== "undefined" && typeof result.stats.includedFiles !== "undefined") {
    result.stats.includedFiles.forEach(includedFile => {
      const normalizedIncludedFile = _path.default.normalize(includedFile);

      // Custom `importer` can return only `contents` so includedFile will be relative
      if (_path.default.isAbsolute(normalizedIncludedFile)) {
        this.addDependency(normalizedIncludedFile);
      }
    });
  }
  callback(null, result.css.toString(), map);
}
var _default = exports.default = loader;