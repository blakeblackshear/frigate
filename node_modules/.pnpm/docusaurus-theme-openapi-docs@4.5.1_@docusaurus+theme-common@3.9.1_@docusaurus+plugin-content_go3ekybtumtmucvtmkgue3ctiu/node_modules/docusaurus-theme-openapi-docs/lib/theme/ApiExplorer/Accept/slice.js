"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAccept = exports.slice = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {};
exports.slice = (0, toolkit_1.createSlice)({
  name: "accept",
  initialState,
  reducers: {
    setAccept: (state, action) => {
      state.value = action.payload;
    },
  },
});
exports.setAccept = exports.slice.actions.setAccept;
exports.default = exports.slice.reducer;
