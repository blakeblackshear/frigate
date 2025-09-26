"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _ava = _interopRequireDefault(require("ava"));

var _path = _interopRequireDefault(require("path"));

var _getBundles = _interopRequireDefault(require("./getBundles"));

var _webpack = _interopRequireDefault(require("../webpack.config"));

var _reactLoadableSsrAddon = _interopRequireDefault(require("../example/dist/react-loadable-ssr-addon"));

var modules = ['./Header', './multilevel/Multilevel', './SharedMultilevel', '../../SharedMultilevel'];
var fileType = ['js'];
var bundles;

_ava["default"].beforeEach(function () {
  bundles = (0, _getBundles["default"])(_reactLoadableSsrAddon["default"], [].concat(_reactLoadableSsrAddon["default"].entrypoints, modules));
});

(0, _ava["default"])('returns the correct bundle size and content', function (t) {
  t["true"](Object.keys(bundles).length === fileType.length);
  fileType.forEach(function (type) {
    return !!bundles[type];
  });
});
(0, _ava["default"])('returns the correct bundle infos', function (t) {
  fileType.forEach(function (type) {
    bundles[type].forEach(function (bundle) {
      var expectedPublichPath = _path["default"].resolve(_webpack["default"].output.publicPath, bundle.file);

      t["true"](bundle.file !== '');
      t["true"](bundle.hash !== '');
      t["true"](bundle.publicPath === expectedPublichPath);
    });
  });
});
(0, _ava["default"])('returns nothing when there is no match', function (t) {
  bundles = (0, _getBundles["default"])(_reactLoadableSsrAddon["default"], ['foo-bar', 'foo', null, undefined]);
  t["true"](Object.keys(bundles).length === 0);
});
(0, _ava["default"])('should work even with null/undefined manifest or modules', function (t) {
  bundles = (0, _getBundles["default"])(_reactLoadableSsrAddon["default"], null);
  t["true"](Object.keys(bundles).length === 0);
  bundles = (0, _getBundles["default"])(null, []);
  t["true"](Object.keys(bundles).length === 0);
  bundles = (0, _getBundles["default"])([], null);
  t["true"](Object.keys(bundles).length === 0);
});