"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _ava = _interopRequireDefault(require("ava"));

var _hasEntry = _interopRequireDefault(require("./hasEntry"));

var assets = [{
  file: 'content.chunk.js',
  hash: 'd41d8cd98f00b204e9800998ecf8427e',
  publicPath: './',
  integrity: null
}, {
  file: 'header.chunk.js',
  hash: '699f4bd49870f2b90e1d1596d362efcb',
  publicPath: './',
  integrity: null
}, {
  file: 'shared-multilevel.chunk.js',
  hash: 'ab7b8b1c1d5083c17a39ccd2962202e1',
  publicPath: './',
  integrity: null
}];
(0, _ava["default"])('should flag as has entry', function (t) {
  var fileName = 'header.chunk.js';
  t["true"]((0, _hasEntry["default"])(assets, 'file', fileName));
});
(0, _ava["default"])('should flag as has no entry', function (t) {
  var fileName = 'footer.chunk.js';
  t["false"]((0, _hasEntry["default"])(assets, 'file', fileName));
});
(0, _ava["default"])('should work even with null/undefined target', function (t) {
  var targets = [[], null, undefined];
  targets.forEach(function (target) {
    t["false"]((0, _hasEntry["default"])(target, 'file', 'foo.js'));
  });
});