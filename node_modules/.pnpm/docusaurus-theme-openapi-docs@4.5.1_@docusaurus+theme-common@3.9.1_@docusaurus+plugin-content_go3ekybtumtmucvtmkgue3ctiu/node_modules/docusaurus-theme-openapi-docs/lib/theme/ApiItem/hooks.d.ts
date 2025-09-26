import { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "./store";
export declare const useTypedDispatch: () => import("redux-thunk").ThunkDispatch<import("redux").CombinedState<{
    accept: unknown;
    contentType: unknown;
    response: unknown;
    server: unknown;
    body: unknown;
    params: unknown;
    auth: unknown;
}>, undefined, import("redux").AnyAction> & import("redux").Dispatch<any>;
export declare const useTypedSelector: TypedUseSelectorHook<RootState>;
