var _Reflect$get = require("core-js-pure/features/reflect/get.js");
var _bindInstanceProperty = require("core-js-pure/features/instance/bind.js");
var _Object$getOwnPropertyDescriptor = require("core-js-pure/features/object/get-own-property-descriptor.js");
var superPropBase = require("./superPropBase.js");
function _get() {
  var _context;
  return module.exports = _get = "undefined" != typeof Reflect && _Reflect$get ? _bindInstanceProperty(_context = _Reflect$get).call(_context) : function (e, t, r) {
    var p = superPropBase(e, t);
    if (p) {
      var n = _Object$getOwnPropertyDescriptor(p, t);
      return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value;
    }
  }, module.exports.__esModule = true, module.exports["default"] = module.exports, _get.apply(null, arguments);
}
module.exports = _get, module.exports.__esModule = true, module.exports["default"] = module.exports;