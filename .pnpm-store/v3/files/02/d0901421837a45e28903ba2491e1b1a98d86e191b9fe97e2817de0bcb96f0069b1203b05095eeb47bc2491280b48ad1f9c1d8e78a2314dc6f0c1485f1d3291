"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthDataKeys = getAuthDataKeys;
function getAuthDataKeys(security) {
  // Bearer Auth
  if (security.type === "http" && security.scheme === "bearer") {
    return ["token"];
  }
  if (security.type === "oauth2") {
    return ["token"];
  }
  // Basic Auth
  if (security.type === "http" && security.scheme === "basic") {
    return ["username", "password"];
  }
  // API Auth
  if (security.type === "apiKey") {
    return ["apiKey"];
  }
  // none
  return [];
}
