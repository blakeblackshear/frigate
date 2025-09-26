var _typeof = require("./typeof.js")["default"];
var _Symbol = require("core-js-pure/features/symbol/index.js");
var _Symbol$iterator = require("core-js-pure/features/symbol/iterator.js");
function _regeneratorValues(e) {
  if (null != e) {
    var t = e["function" == typeof _Symbol && _Symbol$iterator || "@@iterator"],
      r = 0;
    if (t) return t.call(e);
    if ("function" == typeof e.next) return e;
    if (!isNaN(e.length)) return {
      next: function next() {
        return e && r >= e.length && (e = void 0), {
          value: e && e[r++],
          done: !e
        };
      }
    };
  }
  throw new TypeError(_typeof(e) + " is not iterable");
}
module.exports = _regeneratorValues, module.exports.__esModule = true, module.exports["default"] = module.exports;