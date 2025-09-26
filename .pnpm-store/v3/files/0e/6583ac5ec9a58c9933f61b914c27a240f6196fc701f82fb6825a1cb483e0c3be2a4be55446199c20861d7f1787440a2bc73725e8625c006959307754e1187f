var _Reflect$set = require("core-js-pure/features/reflect/set.js");
var _Object$getOwnPropertyDescriptor = require("core-js-pure/features/object/get-own-property-descriptor.js");
var _Object$defineProperty = require("core-js-pure/features/object/define-property.js");
var superPropBase = require("./superPropBase.js");
var defineProperty = require("./defineProperty.js");
function set(e, r, t, o) {
  return set = "undefined" != typeof Reflect && _Reflect$set ? _Reflect$set : function (e, r, t, o) {
    var f,
      i = superPropBase(e, r);
    if (i) {
      if ((f = _Object$getOwnPropertyDescriptor(i, r)).set) return f.set.call(o, t), !0;
      if (!f.writable) return !1;
    }
    if (f = _Object$getOwnPropertyDescriptor(o, r)) {
      if (!f.writable) return !1;
      f.value = t, _Object$defineProperty(o, r, f);
    } else defineProperty(o, r, t);
    return !0;
  }, set(e, r, t, o);
}
function _set(e, r, t, o, f) {
  if (!set(e, r, t, o || e) && f) throw new TypeError("failed to set property");
  return t;
}
module.exports = _set, module.exports.__esModule = true, module.exports["default"] = module.exports;