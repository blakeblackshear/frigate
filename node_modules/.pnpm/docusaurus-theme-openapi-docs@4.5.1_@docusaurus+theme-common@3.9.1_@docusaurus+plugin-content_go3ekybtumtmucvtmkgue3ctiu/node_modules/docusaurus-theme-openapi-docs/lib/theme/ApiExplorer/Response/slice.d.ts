import { PayloadAction } from "@reduxjs/toolkit";
export interface State {
    value?: string;
    code?: string;
    headers?: string;
}
export declare const slice: import("@reduxjs/toolkit").Slice<State, {
    setResponse: (state: import("immer/dist/internal").WritableDraft<State>, action: PayloadAction<string>) => void;
    setCode: (state: import("immer/dist/internal").WritableDraft<State>, action: PayloadAction<string>) => void;
    setHeaders: (state: import("immer/dist/internal").WritableDraft<State>, action: PayloadAction<string>) => void;
    clearResponse: (state: import("immer/dist/internal").WritableDraft<State>) => void;
    clearCode: (state: import("immer/dist/internal").WritableDraft<State>) => void;
    clearHeaders: (state: import("immer/dist/internal").WritableDraft<State>) => void;
}, "response">;
export declare const setResponse: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "response/setResponse">, clearResponse: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"response/clearResponse">, setCode: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "response/setCode">, clearCode: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"response/clearCode">, setHeaders: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "response/setHeaders">, clearHeaders: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"response/clearHeaders">;
declare const _default: import("redux").Reducer<State>;
export default _default;
