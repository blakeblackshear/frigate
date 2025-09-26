var _Object$getOwnPropertyNames = require("core-js-pure/features/object/get-own-property-names.js");
var _Object$getOwnPropertyDescriptor = require("core-js-pure/features/object/get-own-property-descriptor.js");
var _Object$defineProperty = require("core-js-pure/features/object/define-property.js");
function _defaults(e, r) {
  for (var t = _Object$getOwnPropertyNames(r), o = 0; o < t.length; o++) {
    var n = t[o],
      a = _Object$getOwnPropertyDescriptor(r, n);
    a && a.configurable && void 0 === e[n] && _Object$defineProperty(e, n, a);
  }
  return e;
}
module.exports = _defaults, module.exports.__esModule = true, module.exports["default"] = module.exports;