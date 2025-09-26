function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
/**
 * If a plugin is configured to await a submit event, this returns a promise
 * for either the max timeout value found or until it completes.
 * Otherwise, return undefined.
 */
export var getPluginSubmitPromise = function getPluginSubmitPromise(plugins, pendingRequests) {
  var waitUntilComplete = false;
  var timeouts = [];
  var _iterator = _createForOfIteratorHelper(plugins),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _plugin$__autocomplet, _plugin$__autocomplet2, _plugin$__autocomplet3;
      var plugin = _step.value;
      var value = (_plugin$__autocomplet = plugin.__autocomplete_pluginOptions) === null || _plugin$__autocomplet === void 0 ? void 0 : (_plugin$__autocomplet2 = (_plugin$__autocomplet3 = _plugin$__autocomplet).awaitSubmit) === null || _plugin$__autocomplet2 === void 0 ? void 0 : _plugin$__autocomplet2.call(_plugin$__autocomplet3);
      if (typeof value === 'number') {
        timeouts.push(value);
      } else if (value === true) {
        waitUntilComplete = true;
        break; // break loop as bool overrides num array below
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  if (waitUntilComplete) {
    return pendingRequests.wait();
  } else if (timeouts.length > 0) {
    return pendingRequests.wait(Math.max.apply(Math, timeouts));
  }
  return undefined;
};