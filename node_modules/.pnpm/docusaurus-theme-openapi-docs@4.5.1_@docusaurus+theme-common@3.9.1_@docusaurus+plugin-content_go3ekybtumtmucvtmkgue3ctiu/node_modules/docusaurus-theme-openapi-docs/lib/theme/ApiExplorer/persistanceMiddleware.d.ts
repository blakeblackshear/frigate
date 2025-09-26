import { Middleware } from "@reduxjs/toolkit";
import { ThemeConfig } from "docusaurus-theme-openapi-docs/src/types";
export declare function createPersistanceMiddleware(options: ThemeConfig["api"]): Middleware<{}, RootState, AppDispatch>;
