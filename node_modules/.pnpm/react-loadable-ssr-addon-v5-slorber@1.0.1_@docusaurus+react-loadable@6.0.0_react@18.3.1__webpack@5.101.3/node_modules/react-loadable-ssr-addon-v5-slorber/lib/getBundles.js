"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var _utils = require("./utils");

function getBundles(manifest, chunks) {
  if (!manifest || !chunks) {
    return {};
  }

  var assetsKey = chunks.reduce(function (key, chunk) {
    if (manifest.origins[chunk]) {
      key = (0, _utils.unique)([].concat(key, manifest.origins[chunk]));
    }

    return key;
  }, []);
  return assetsKey.reduce(function (bundle, asset) {
    Object.keys(manifest.assets[asset] || {}).forEach(function (key) {
      var content = manifest.assets[asset][key];

      if (!bundle[key]) {
        bundle[key] = [];
      }

      bundle[key] = (0, _utils.unique)([].concat(bundle[key], content));
    });
    return bundle;
  }, {});
}

var _default = getBundles;
exports["default"] = _default;