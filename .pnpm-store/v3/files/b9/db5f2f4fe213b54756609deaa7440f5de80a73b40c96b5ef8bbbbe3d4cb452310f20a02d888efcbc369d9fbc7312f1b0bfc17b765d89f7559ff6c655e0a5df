import { PayloadAction } from "@reduxjs/toolkit";
import { ServerObject } from "docusaurus-plugin-openapi-docs/src/openapi/types";
export interface State {
    value?: ServerObject;
    options: ServerObject[];
}
export declare const slice: import("@reduxjs/toolkit").Slice<State, {
    setServer: (state: import("immer/dist/internal").WritableDraft<State>, action: PayloadAction<string>) => void;
    setServerVariable: (state: import("immer/dist/internal").WritableDraft<State>, action: PayloadAction<string>) => void;
}, "server">;
export declare const setServer: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "server/setServer">, setServerVariable: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "server/setServerVariable">;
declare const _default: import("redux").Reducer<State>;
export default _default;
