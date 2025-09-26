"use strict";

exports.__esModule = true;
exports["default"] = hasEntry;

function hasEntry(target, targetKey, searchFor) {
  if (!target) {
    return false;
  }

  for (var i = 0; i < target.length; i += 1) {
    var file = target[i][targetKey];

    if (file === searchFor) {
      return true;
    }
  }

  return false;
}