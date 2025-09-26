import { DataError } from "./errors.js";
import isSharedArrayBuffer from "./isSharedArrayBuffer.js";
// https://w3c.github.io/IndexedDB/#convert-value-to-key
const valueToKey = (input, seen) => {
  if (typeof input === "number") {
    if (isNaN(input)) {
      throw new DataError();
    }
    return input;
  } else if (Object.prototype.toString.call(input) === "[object Date]") {
    const ms = input.valueOf();
    if (isNaN(ms)) {
      throw new DataError();
    }
    return new Date(ms);
  } else if (typeof input === "string") {
    return input;
  } else if (
  // https://w3c.github.io/IndexedDB/#ref-for-dfn-buffer-source-type
  (input instanceof ArrayBuffer || isSharedArrayBuffer(input) || typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(input)) &&
  // We can't consistently test detachedness, so instead we check if byteLength === 0
  // This isn't foolproof, but there's no perfect way to detect if Uint8Arrays or
  // SharedArrayBuffers are detached
  !("detached" in input ? input.detached : input.byteLength === 0)) {
    let arrayBuffer;
    let offset = 0;
    let length = 0;
    if (input instanceof ArrayBuffer || isSharedArrayBuffer(input)) {
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
      throw new DataError();
    }
    seen.add(input);
    const keys = [];
    for (let i = 0; i < input.length; i++) {
      const hop = Object.hasOwn(input, i);
      if (!hop) {
        throw new DataError();
      }
      const entry = input[i];
      const key = valueToKey(entry, seen);
      keys.push(key);
    }
    return keys;
  } else {
    throw new DataError();
  }
};
export default valueToKey;