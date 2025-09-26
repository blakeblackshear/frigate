"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashArray = hashArray;
exports.createStorage = createStorage;
const crypto_js_1 = __importDefault(require("crypto-js"));
function hashArray(arr) {
  function hash(message) {
    return crypto_js_1.default.SHA1(message).toString();
  }
  const hashed = arr.map((item) => hash(item));
  hashed.sort();
  const res = hashed.join();
  return hash(res);
}
function createStorage(persistance) {
  if (persistance === false) {
    return {
      getItem: () => null,
      setItem: () => {},
      clear: () => {},
      key: () => null,
      removeItem: () => {},
      length: 0,
    };
  }
  if (persistance === "sessionStorage") {
    return sessionStorage;
  }
  return localStorage;
}
