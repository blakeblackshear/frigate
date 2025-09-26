var _Symbol = require("core-js-pure/features/symbol/index.js");
var _Symbol$hasInstance = require("core-js-pure/features/symbol/has-instance.js");
function _instanceof(n, e) {
  return null != e && "undefined" != typeof _Symbol && e[_Symbol$hasInstance] ? !!e[_Symbol$hasInstance](n) : n instanceof e;
}
module.exports = _instanceof, module.exports.__esModule = true, module.exports["default"] = module.exports;