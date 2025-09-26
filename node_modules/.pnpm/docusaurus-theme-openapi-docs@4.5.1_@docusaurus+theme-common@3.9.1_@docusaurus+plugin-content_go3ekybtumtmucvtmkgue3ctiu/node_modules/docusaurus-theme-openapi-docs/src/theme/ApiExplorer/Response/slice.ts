/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface State {
  value?: string;
  code?: string;
  headers?: string;
}

const initialState: State = {} as any;

export const slice = createSlice({
  name: "response",
  initialState,
  reducers: {
    setResponse: (state, action: PayloadAction<string>) => {
      state.value = action.payload;
    },
    setCode: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
    },
    setHeaders: (state, action: PayloadAction<string>) => {
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

export const {
  setResponse,
  clearResponse,
  setCode,
  clearCode,
  setHeaders,
  clearHeaders,
} = slice.actions;

export default slice.reducer;
