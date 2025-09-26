"use strict";

exports.__esModule = true;
exports["default"] = void 0;

function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  var fileExtRegex = /\.\w{2,4}\.(?:map|gz)$|\.\w+$/i;
  var name = filename.split(/[?#]/)[0];
  var ext = name.match(fileExtRegex);
  return ext && ext.length ? ext[0] : '';
}

var _default = getFileExtension;
exports["default"] = _default;