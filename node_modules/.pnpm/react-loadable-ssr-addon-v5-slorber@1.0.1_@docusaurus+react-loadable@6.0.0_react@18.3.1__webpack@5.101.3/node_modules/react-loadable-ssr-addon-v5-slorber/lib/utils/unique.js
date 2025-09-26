"use strict";

exports.__esModule = true;
exports["default"] = unique;

function unique(array) {
  return array.filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  });
}