import { PayloadAction } from "@reduxjs/toolkit";
import { ParameterObject } from "docusaurus-plugin-openapi-docs/src/openapi/types";
export type Param = ParameterObject & {
    value?: string[] | string;
};
export interface State {
    path: Param[];
    query: Param[];
    header: Param[];
    cookie: Param[];
}
export declare const slice: import("@reduxjs/toolkit").Slice<State, {
    setParam: (state: import("immer/dist/internal").WritableDraft<State>, action: PayloadAction<Param>) => void;
}, "params">;
export declare const setParam: import("@reduxjs/toolkit").ActionCreatorWithPayload<Param, "params/setParam">;
declare const _default: import("redux").Reducer<State>;
export default _default;
