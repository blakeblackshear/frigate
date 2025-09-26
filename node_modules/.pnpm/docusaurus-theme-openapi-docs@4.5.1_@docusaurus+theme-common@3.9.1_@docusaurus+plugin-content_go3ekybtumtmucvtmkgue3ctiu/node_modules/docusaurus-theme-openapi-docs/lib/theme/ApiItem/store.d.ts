declare const rootReducer: import("redux").Reducer<import("redux").CombinedState<{
    accept: unknown;
    contentType: unknown;
    response: unknown;
    server: unknown;
    body: unknown;
    params: unknown;
    auth: unknown;
}>, any>;
export type RootState = ReturnType<typeof rootReducer>;
export declare const createStoreWithState: (preloadedState: RootState, middlewares: any[]) => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("redux").EmptyObject & {
    accept: unknown;
    contentType: unknown;
    response: unknown;
    server: unknown;
    body: unknown;
    params: unknown;
    auth: unknown;
}, any, import("@reduxjs/toolkit").MiddlewareArray<[import("@reduxjs/toolkit").ThunkMiddleware<import("redux").CombinedState<{
    accept: unknown;
    contentType: unknown;
    response: unknown;
    server: unknown;
    body: unknown;
    params: unknown;
    auth: unknown;
}>, import("redux").AnyAction>, ...any[]]>>;
export declare const createStoreWithoutState: (preloadedState: {}, middlewares: any[]) => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("redux").EmptyObject & {
    accept: unknown;
    contentType: unknown;
    response: unknown;
    server: unknown;
    body: unknown;
    params: unknown;
    auth: unknown;
}, any, import("@reduxjs/toolkit").MiddlewareArray<[import("@reduxjs/toolkit").ThunkMiddleware<import("redux").CombinedState<{
    accept: unknown;
    contentType: unknown;
    response: unknown;
    server: unknown;
    body: unknown;
    params: unknown;
    auth: unknown;
}>, import("redux").AnyAction>, ...any[]]>>;
export type AppDispatch = ReturnType<typeof createStoreWithState>["dispatch"];
export {};
