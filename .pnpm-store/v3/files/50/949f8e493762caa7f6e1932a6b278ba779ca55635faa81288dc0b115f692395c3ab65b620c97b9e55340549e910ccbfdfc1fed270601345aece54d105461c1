import type { Middleware } from 'redux';
export interface ActionCreatorInvariantMiddlewareOptions {
    /**
     * The function to identify whether a value is an action creator.
     * The default checks for a function with a static type property and match method.
     */
    isActionCreator?: (action: unknown) => action is Function & {
        type?: unknown;
    };
}
export declare function getMessage(type?: unknown): string;
export declare function createActionCreatorInvariantMiddleware(options?: ActionCreatorInvariantMiddlewareOptions): Middleware;
