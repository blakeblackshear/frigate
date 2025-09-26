"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearHeaders =
  exports.setHeaders =
  exports.clearCode =
  exports.setCode =
  exports.clearResponse =
  exports.setResponse =
  exports.slice =
    void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {};
exports.slice = (0, toolkit_1.createSlice)({
  name: "response",
  initialState,
  reducers: {
    setResponse: (state, action) => {
      state.value = action.payload;
    },
    setCode: (state, action) => {
      state.code = action.payload;
    },
    setHeaders: (state, action) => {
      state.headers = action.payload;
    },
    clearResponse: (state) => {
      state.value = undefined;
    },
    clearCode: (state) => {
      state.code = undefined;
    },
    clearHeaders: (state) => {
      state.headers = undefined;
    },
  },
});
((_a = exports.slice.actions),
  (exports.setResponse = _a.setResponse),
  (exports.clearResponse = _a.clearResponse),
  (exports.setCode = _a.setCode),
  (exports.clearCode = _a.clearCode),
  (exports.setHeaders = _a.setHeaders),
  (exports.clearHeaders = _a.clearHeaders));
exports.default = exports.slice.reducer;
