var _Object$defineProperty = require("core-js-pure/features/object/define-property.js");
var _Object$getOwnPropertySymbols = require("core-js-pure/features/object/get-own-property-symbols.js");
function _defineEnumerableProperties(e, r) {
  for (var t in r) {
    var n = r[t];
    n.configurable = n.enumerable = !0, "value" in n && (n.writable = !0), _Object$defineProperty(e, t, n);
  }
  if (_Object$getOwnPropertySymbols) for (var a = _Object$getOwnPropertySymbols(r), b = 0; b < a.length; b++) {
    var i = a[b];
    (n = r[i]).configurable = n.enumerable = !0, "value" in n && (n.writable = !0), _Object$defineProperty(e, i, n);
  }
  return e;
}
module.exports = _defineEnumerableProperties, module.exports.__esModule = true, module.exports["default"] = module.exports;