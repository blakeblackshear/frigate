"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBKeyRange = _interopRequireDefault(require("../FDBKeyRange.js"));
var _isSharedArrayBuffer = _interopRequireDefault(require("./isSharedArrayBuffer.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// https://www.w3.org/TR/IndexedDB/#is-a-potentially-valid-key-range
const isPotentiallyValidKeyRange = value => {
  // Many of these conditions recapitulate the same conditions in `valueToKeyRange.ts`
  return (
    // FDBKeyRange
    value instanceof _FDBKeyRange.default ||
    // null/undefined - nullDisallowedFlag=false is assumed here
    value === null || value === undefined ||
    // Number
    typeof value === "number" ||
    // Date
    Object.prototype.toString.call(value) === "[object Date]" ||
    // string
    typeof value === "string" ||
    // buffer source type
    // note: we are explicitly _not_ checking for detachedness here, to match Chromium's behavior
    // see: https://github.com/w3c/IndexedDB/issues/465
    value instanceof ArrayBuffer || (0, _isSharedArrayBuffer.default)(value) || typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(value) ||
    // array exotic type
    Array.isArray(value)
  );
};
var _default = exports.default = isPotentiallyValidKeyRange;
module.exports = exports.default;