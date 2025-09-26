import { PayloadAction } from "@reduxjs/toolkit";
import { SecurityRequirementObject, SecuritySchemeObject } from "docusaurus-plugin-openapi-docs/src/openapi/types";
import { ThemeConfig } from "docusaurus-theme-openapi-docs/src/types";
export declare function createAuth({ security, securitySchemes, options: opts, }: {
    security?: SecurityRequirementObject[];
    securitySchemes?: {
        [key: string]: SecuritySchemeObject;
    };
    options?: ThemeConfig["api"];
}): AuthState;
export type Scheme = {
    key: string;
    scopes: string[];
} & SecuritySchemeObject;
export interface AuthState {
    data: {
        [scheme: string]: {
            [key: string]: string | undefined;
        };
    };
    options: {
        [key: string]: Scheme[];
    };
    selected?: string;
}
export declare const slice: import("@reduxjs/toolkit").Slice<AuthState, {
    setAuthData: (state: import("immer/dist/internal").WritableDraft<AuthState>, action: PayloadAction<{
        scheme: string;
        key: string;
        value?: string;
    }>) => void;
    setSelectedAuth: (state: import("immer/dist/internal").WritableDraft<AuthState>, action: PayloadAction<string>) => void;
}, "auth">;
export declare const setAuthData: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    scheme: string;
    key: string;
    value?: string;
}, "auth/setAuthData">, setSelectedAuth: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "auth/setSelectedAuth">;
declare const _default: import("redux").Reducer<AuthState>;
export default _default;
