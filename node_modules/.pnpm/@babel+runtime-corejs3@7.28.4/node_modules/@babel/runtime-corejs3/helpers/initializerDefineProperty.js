var _Object$defineProperty = require("core-js-pure/features/object/define-property.js");
function _initializerDefineProperty(e, i, r, l) {
  r && _Object$defineProperty(e, i, {
    enumerable: r.enumerable,
    configurable: r.configurable,
    writable: r.writable,
    value: r.initializer ? r.initializer.call(l) : void 0
  });
}
module.exports = _initializerDefineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;