import type { AnyAction } from 'redux';
import type { ThunkMiddleware } from 'redux-thunk';
import type { ActionCreatorInvariantMiddlewareOptions } from './actionCreatorInvariantMiddleware';
import type { ImmutableStateInvariantMiddlewareOptions } from './immutableStateInvariantMiddleware';
import type { SerializableStateInvariantMiddlewareOptions } from './serializableStateInvariantMiddleware';
import type { ExcludeFromTuple } from './tsHelpers';
import { MiddlewareArray } from './utils';
interface ThunkOptions<E = any> {
    extraArgument: E;
}
interface GetDefaultMiddlewareOptions {
    thunk?: boolean | ThunkOptions;
    immutableCheck?: boolean | ImmutableStateInvariantMiddlewareOptions;
    serializableCheck?: boolean | SerializableStateInvariantMiddlewareOptions;
    actionCreatorCheck?: boolean | ActionCreatorInvariantMiddlewareOptions;
}
export declare type ThunkMiddlewareFor<S, O extends GetDefaultMiddlewareOptions = {}> = O extends {
    thunk: false;
} ? never : O extends {
    thunk: {
        extraArgument: infer E;
    };
} ? ThunkMiddleware<S, AnyAction, E> : ThunkMiddleware<S, AnyAction>;
export declare type CurriedGetDefaultMiddleware<S = any> = <O extends Partial<GetDefaultMiddlewareOptions> = {
    thunk: true;
    immutableCheck: true;
    serializableCheck: true;
    actionCreatorCheck: true;
}>(options?: O) => MiddlewareArray<ExcludeFromTuple<[ThunkMiddlewareFor<S, O>], never>>;
export declare function curryGetDefaultMiddleware<S = any>(): CurriedGetDefaultMiddleware<S>;
/**
 * Returns any array containing the default middleware installed by
 * `configureStore()`. Useful if you want to configure your store with a custom
 * `middleware` array but still keep the default set.
 *
 * @return The default middleware used by `configureStore()`.
 *
 * @public
 *
 * @deprecated Prefer to use the callback notation for the `middleware` option in `configureStore`
 * to access a pre-typed `getDefaultMiddleware` instead.
 */
export declare function getDefaultMiddleware<S = any, O extends Partial<GetDefaultMiddlewareOptions> = {
    thunk: true;
    immutableCheck: true;
    serializableCheck: true;
    actionCreatorCheck: true;
}>(options?: O): MiddlewareArray<ExcludeFromTuple<[ThunkMiddlewareFor<S, O>], never>>;
export {};
