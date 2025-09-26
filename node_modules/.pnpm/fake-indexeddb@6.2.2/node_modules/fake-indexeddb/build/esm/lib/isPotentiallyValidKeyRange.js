import FDBKeyRange from "../FDBKeyRange.js";
import isSharedArrayBuffer from "./isSharedArrayBuffer.js";

// https://www.w3.org/TR/IndexedDB/#is-a-potentially-valid-key-range
const isPotentiallyValidKeyRange = value => {
  // Many of these conditions recapitulate the same conditions in `valueToKeyRange.ts`
  return (
    // FDBKeyRange
    value instanceof FDBKeyRange ||
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
    value instanceof ArrayBuffer || isSharedArrayBuffer(value) || typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(value) ||
    // array exotic type
    Array.isArray(value)
  );
};
export default isPotentiallyValidKeyRange;