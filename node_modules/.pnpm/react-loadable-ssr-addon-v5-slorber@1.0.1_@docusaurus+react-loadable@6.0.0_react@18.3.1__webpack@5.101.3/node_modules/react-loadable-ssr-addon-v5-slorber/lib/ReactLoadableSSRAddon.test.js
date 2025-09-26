"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _ava = _interopRequireDefault(require("ava"));

var _path = _interopRequireDefault(require("path"));

var _fs = _interopRequireDefault(require("fs"));

var _waitForExpect = _interopRequireDefault(require("wait-for-expect"));

var _webpack = _interopRequireDefault(require("webpack"));

var _webpack2 = _interopRequireDefault(require("../webpack.config"));

var _ReactLoadableSSRAddon = _interopRequireWildcard(require("./ReactLoadableSSRAddon"));

var outputPath;
var manifestOutputPath;

var runWebpack = function runWebpack(configuration, end, callback) {
  (0, _webpack["default"])(configuration, function (err, stats) {
    if (err) {
      return end(err);
    }

    if (stats.hasErrors()) {
      return end(stats.toString());
    }

    callback();
    end();
  });
};

_ava["default"].beforeEach(function () {
  var publicPathSanitized = _webpack2["default"].output.publicPath.slice(1, -1);

  outputPath = _path["default"].resolve('./example', publicPathSanitized);
  manifestOutputPath = _path["default"].resolve(outputPath, _ReactLoadableSSRAddon.defaultOptions.filename);
});

_ava["default"].cb('outputs with default settings', function (t) {
  _webpack2["default"].plugins = [new _ReactLoadableSSRAddon["default"]()];
  runWebpack(_webpack2["default"], t.end, function () {
    var feedback = _fs["default"].existsSync(manifestOutputPath) ? 'pass' : 'fail';
    t[feedback]();
  });
});

_ava["default"].cb('outputs with custom filename', function (t) {
  var filename = 'new-assets-manifest.json';
  _webpack2["default"].plugins = [new _ReactLoadableSSRAddon["default"]({
    filename: filename
  })];
  runWebpack(_webpack2["default"], t.end, function () {
    var feedback = _fs["default"].existsSync(manifestOutputPath.replace(_ReactLoadableSSRAddon.defaultOptions.filename, filename)) ? 'pass' : 'fail';
    t[feedback]();
  });
});

_ava["default"].cb('outputs with integrity', function (t) {
  _webpack2["default"].plugins = [new _ReactLoadableSSRAddon["default"]({
    integrity: true
  })];
  runWebpack(_webpack2["default"], t.end, (0, _asyncToGenerator2["default"])(_regenerator["default"].mark(function _callee() {
    var manifest;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            manifest = require("" + manifestOutputPath);
            _context.next = 3;
            return (0, _waitForExpect["default"])(function () {
              Object.keys(manifest.assets).forEach(function (asset) {
                manifest.assets[asset].js.forEach(function (_ref2) {
                  var integrity = _ref2.integrity;
                  t.truthy(integrity);
                });
              });
            });

          case 3:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  })));
});