"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _ava = _interopRequireDefault(require("ava"));

var _getFileExtension = _interopRequireDefault(require("./getFileExtension"));

(0, _ava["default"])('returns the correct file extension', function (t) {
  var extensions = ['.jpeg', '.js', '.css', '.json', '.xml'];
  var filePath = 'source/static/images/hello-world';
  extensions.forEach(function (ext) {
    t["true"]((0, _getFileExtension["default"])("" + filePath + ext) === ext);
  });
});
(0, _ava["default"])('sanitize file hash', function (t) {
  var hashes = ['?', '#'];
  var filePath = 'source/static/images/hello-world.jpeg';
  hashes.forEach(function (hash) {
    t["true"]((0, _getFileExtension["default"])("" + filePath + hash + "d587bbd6e38337f5accd") === '.jpeg');
  });
});
(0, _ava["default"])('returns empty string when there is no file extension', function (t) {
  var filePath = 'source/static/resource';
  t["true"]((0, _getFileExtension["default"])(filePath) === '');
});
(0, _ava["default"])('should work even with null/undefined arg', function (t) {
  var filePaths = ['', null, undefined];
  filePaths.forEach(function (path) {
    t["true"]((0, _getFileExtension["default"])(path) === '');
  });
});