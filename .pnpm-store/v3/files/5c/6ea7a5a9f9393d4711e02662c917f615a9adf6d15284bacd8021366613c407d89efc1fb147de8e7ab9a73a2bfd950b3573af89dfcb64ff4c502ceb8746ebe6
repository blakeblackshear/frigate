"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFileFormBody =
  exports.setStringFormBody =
  exports.clearFormBodyKey =
  exports.setFileRawBody =
  exports.setStringRawBody =
  exports.clearRawBody =
  exports.slice =
    void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {};
exports.slice = (0, toolkit_1.createSlice)({
  name: "body",
  initialState,
  reducers: {
    clearRawBody: (_state) => {
      return {
        type: "empty",
      };
    },
    setStringRawBody: (_state, action) => {
      return {
        type: "raw",
        content: {
          type: "string",
          value: action.payload,
        },
      };
    },
    setFileRawBody: (_state, action) => {
      return {
        type: "raw",
        content: {
          type: "file",
          value: action.payload,
        },
      };
    },
    clearFormBodyKey: (state, action) => {
      if (state?.type === "form") {
        delete state.content[action.payload];
      }
    },
    setStringFormBody: (state, action) => {
      if (state?.type !== "form") {
        return {
          type: "form",
          content: {
            [action.payload.key]: {
              type: "string",
              value: action.payload.value,
            },
          },
        };
      }
      state.content[action.payload.key] = {
        type: "string",
        value: action.payload.value,
      };
      return state;
    },
    setFileFormBody: (state, action) => {
      if (state?.type !== "form") {
        return {
          type: "form",
          content: {
            [action.payload.key]: {
              type: "file",
              value: action.payload.value,
            },
          },
        };
      }
      state.content[action.payload.key] = {
        type: "file",
        value: action.payload.value,
      };
      return state;
    },
  },
});
((_a = exports.slice.actions),
  (exports.clearRawBody = _a.clearRawBody),
  (exports.setStringRawBody = _a.setStringRawBody),
  (exports.setFileRawBody = _a.setFileRawBody),
  (exports.clearFormBodyKey = _a.clearFormBodyKey),
  (exports.setStringFormBody = _a.setStringFormBody),
  (exports.setFileFormBody = _a.setFileFormBody));
exports.default = exports.slice.reducer;
