/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ServerObject } from "docusaurus-plugin-openapi-docs/src/openapi/types";
// TODO: we might want to export this

export interface State {
  value?: ServerObject;
  options: ServerObject[];
}

const initialState: State = {} as any;

export const slice = createSlice({
  name: "server",
  initialState,
  reducers: {
    setServer: (state, action: PayloadAction<string>) => {
      state.value = state.options.find(
        (s) => s.url === JSON.parse(action.payload).url
      );
    },
    setServerVariable: (state, action: PayloadAction<string>) => {
      if (state.value?.variables) {
        const parsedPayload = JSON.parse(action.payload);
        state.value.variables[parsedPayload.key].default = parsedPayload.value;
      }
    },
  },
});

export const { setServer, setServerVariable } = slice.actions;

export default slice.reducer;
