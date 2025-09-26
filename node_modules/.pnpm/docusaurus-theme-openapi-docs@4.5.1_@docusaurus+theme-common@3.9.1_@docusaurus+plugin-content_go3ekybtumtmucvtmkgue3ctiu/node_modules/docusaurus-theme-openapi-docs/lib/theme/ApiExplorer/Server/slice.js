"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setServerVariable = exports.setServer = exports.slice = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {};
exports.slice = (0, toolkit_1.createSlice)({
  name: "server",
  initialState,
  reducers: {
    setServer: (state, action) => {
      state.value = state.options.find(
        (s) => s.url === JSON.parse(action.payload).url
      );
    },
    setServerVariable: (state, action) => {
      if (state.value?.variables) {
        const parsedPayload = JSON.parse(action.payload);
        state.value.variables[parsedPayload.key].default = parsedPayload.value;
      }
    },
  },
});
((_a = exports.slice.actions),
  (exports.setServer = _a.setServer),
  (exports.setServerVariable = _a.setServerVariable));
exports.default = exports.slice.reducer;
