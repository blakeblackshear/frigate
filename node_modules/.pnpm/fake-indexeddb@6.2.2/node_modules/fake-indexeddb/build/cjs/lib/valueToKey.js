"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _errors = require("./errors.js");
var _isSharedArrayBuffer = _interopRequireDefault(require("./isSharedArrayBuffer.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// https://w3c.github.io/IndexedDB/#convert-value-to-key
const valueToKey = (input, seen) => {
  if (typeof input === "number") {
    if (isNaN(input)) {
      throw new _errors.DataError();
    }
    return input;
  } else if (Object.prototype.toString.call(input) === "[object Date]") {
    const ms = input.valueOf();
    if (isNaN(ms)) {
      throw new _errors.DataError();
    }
    return new Date(ms);
  } else if (typeof input === "string") {
    return input;
  } else if (
  // https://w3c.github.io/IndexedDB/#ref-for-dfn-buffer-source-type
  (input instanceof ArrayBuffer || (0, _isSharedArrayBuffer.default)(input) || typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(input)) &&
  // We can't consistently test detachedness, so instead we check if byteLength === 0
  // This isn't foolproof, but there's no perfect way to detect if Uint8Arrays or
  // SharedArrayBuffers are detached
  !("detached" in input ? input.detached : input.byteLength === 0)) {
    let arrayBuffer;
    let offset = 0;
    let length = 0;
    if (input instanceof ArrayBuffer || (0, _isSharedArrayBuffer.default)(input)) {
      arrayBuffer = input;
      length = input.byteLength;
    } else {
      arrayBuffer = input.buffer;
      offset = input.byteOffset;
      length = input.byteLength;
    }
    return arrayBuffer.slice(offset, offset + length);
  } else if (Array.isArray(input)) {
    if (seen === undefined) {
      seen = new Set();
    } else if (seen.has(input)) {
      throw new _errors.DataError();
    }
    seen.add(input);
    const keys = [];
    for (let i = 0; i < input.length; i++) {
      const hop = Object.hasOwn(input, i);
      if (!hop) {
        throw new _errors.DataError();
      }
      const entry = input[i];
      const key = valueToKey(entry, seen);
      keys.push(key);
    }
    return keys;
  } else {
    throw new _errors.DataError();
  }
};
var _default = exports.default = valueToKey;
module.exports = exports.default;