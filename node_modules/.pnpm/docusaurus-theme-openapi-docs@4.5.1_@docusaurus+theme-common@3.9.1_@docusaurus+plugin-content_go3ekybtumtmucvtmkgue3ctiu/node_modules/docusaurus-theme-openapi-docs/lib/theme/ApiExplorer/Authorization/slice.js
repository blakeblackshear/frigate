"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSelectedAuth = exports.setAuthData = exports.slice = void 0;
exports.createAuth = createAuth;
const toolkit_1 = require("@reduxjs/toolkit");
const storage_utils_1 = require("@theme/ApiExplorer/storage-utils");
const auth_types_1 = require("./auth-types");
// The global definitions
// "securitySchemes": {
//   "BearerAuth": { "type": "http", "scheme": "BeAreR" },
//   "BasicAuth": { "type": "http", "scheme": "basic" }
// },
// The operation level requirements
// "security": [
//   { "BearerAuth": [] },
//   { "BearerAuth": [], "BasicAuth": [] }
// ],
// SLICE_STATE
// data:
//   BearerAuth:
//     token=xxx
//   BasicAuth:
//     username=xxx
//     password=xxx
//
// options:
//    "BearerAuth": [{ key: "BearerAuth", scopes: [], ...rest }]
//    "BearerAuth and BasicAuth": [{ key: "BearerAuth", scopes: [], ...rest }, { key: "BasicAuth", scopes: [], ...rest }]
//
// selected: "BearerAuth and BasicAuth"
// LOCAL_STORAGE
// hash(SLICE_STATE.options) -> "BearerAuth and BasicAuth"
// BearerAuth                -> { token: xxx }
// BasicAuth                 -> { username: xxx, password: xxx }
function createAuth({ security, securitySchemes, options: opts }) {
  const storage = (0, storage_utils_1.createStorage)("sessionStorage");
  let data = {};
  let options = {};
  for (const option of security ?? []) {
    const id = Object.keys(option).join(" and ");
    for (const [schemeID, scopes] of Object.entries(option)) {
      const scheme = securitySchemes?.[schemeID];
      if (scheme) {
        if (options[id] === undefined) {
          options[id] = [];
        }
        const dataKeys = (0, auth_types_1.getAuthDataKeys)(scheme);
        for (const key of dataKeys) {
          if (data[schemeID] === undefined) {
            data[schemeID] = {};
          }
          let persisted = undefined;
          try {
            persisted = JSON.parse(storage.getItem(schemeID) ?? "")[key];
          } catch {}
          data[schemeID][key] = persisted;
        }
        options[id].push({
          ...scheme,
          key: schemeID,
          scopes,
        });
      }
    }
  }
  let persisted = undefined;
  try {
    persisted =
      storage.getItem((0, storage_utils_1.hashArray)(Object.keys(options))) ??
      undefined;
  } catch {}
  return {
    data,
    options,
    selected: persisted ?? Object.keys(options)[0],
  };
}
const initialState = {};
exports.slice = (0, toolkit_1.createSlice)({
  name: "auth",
  initialState,
  reducers: {
    setAuthData: (state, action) => {
      const { scheme, key, value } = action.payload;
      state.data[scheme][key] = value;
    },
    setSelectedAuth: (state, action) => {
      state.selected = action.payload;
    },
  },
});
((_a = exports.slice.actions),
  (exports.setAuthData = _a.setAuthData),
  (exports.setSelectedAuth = _a.setSelectedAuth));
exports.default = exports.slice.reducer;
