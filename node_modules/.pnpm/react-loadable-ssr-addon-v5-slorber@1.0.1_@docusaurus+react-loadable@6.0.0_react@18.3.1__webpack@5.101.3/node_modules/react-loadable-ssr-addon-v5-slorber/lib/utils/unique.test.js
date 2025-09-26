"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _ava = _interopRequireDefault(require("ava"));

var _unique = _interopRequireDefault(require("./unique"));

(0, _ava["default"])('it filters duplicated entries', function (t) {
  var duplicated = ['two', 'four'];
  var raw = ['one', 'two', 'three', 'four'];
  var filtered = (0, _unique["default"])([].concat(raw, duplicated));
  duplicated.forEach(function (dup) {
    t["true"](filtered.filter(function (item) {
      return item === dup;
    }).length === 1);
  });
});
(0, _ava["default"])('should work with null/undefined values', function (t) {
  var falsy = [null, undefined];
  var raw = ['one', 'two', 'three', 'four'];
  var filtered = (0, _unique["default"])([].concat(raw, falsy));
  falsy.forEach(function (value) {
    t["true"](filtered.includes(value));
  });
});