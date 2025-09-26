import type { Reducer, ReducersMapObject, Middleware, Action, AnyAction, StoreEnhancer, Store, Dispatch, PreloadedState, CombinedState } from 'redux';
import type { DevToolsEnhancerOptions as DevToolsOptions } from './devtoolsExtension';
import type { ThunkMiddlewareFor, CurriedGetDefaultMiddleware } from './getDefaultMiddleware';
import type { NoInfer, ExtractDispatchExtensions, ExtractStoreExtensions, ExtractStateExtensions } from './tsHelpers';
import { EnhancerArray } from './utils';
/**
 * Callback function type, to be used in `ConfigureStoreOptions.enhancers`
 *
 * @public
 */
export declare type ConfigureEnhancersCallback<E extends Enhancers = Enhancers> = (defaultEnhancers: EnhancerArray<[StoreEnhancer<{}, {}>]>) => E;
/**
 * Options for `configureStore()`.
 *
 * @public
 */
export interface ConfigureStoreOptions<S = any, A extends Action = AnyAction, M extends Middlewares<S> = Middlewares<S>, E extends Enhancers = Enhancers> {
    /**
     * A single reducer function that will be used as the root reducer, or an
     * object of slice reducers that will be passed to `combineReducers()`.
     */
    reducer: Reducer<S, A> | ReducersMapObject<S, A>;
    /**
     * An array of Redux middleware to install. If not supplied, defaults to
     * the set of middleware returned by `getDefaultMiddleware()`.
     *
     * @example `middleware: (gDM) => gDM().concat(logger, apiMiddleware, yourCustomMiddleware)`
     * @see https://redux-toolkit.js.org/api/getDefaultMiddleware#intended-usage
     */
    middleware?: ((getDefaultMiddleware: CurriedGetDefaultMiddleware<S>) => M) | M;
    /**
     * Whether to enable Redux DevTools integration. Defaults to `true`.
     *
     * Additional configuration can be done by passing Redux DevTools options
     */
    devTools?: boolean | DevToolsOptions;
    /**
     * The initial state, same as Redux's createStore.
     * You may optionally specify it to hydrate the state
     * from the server in universal apps, or to restore a previously serialized
     * user session. If you use `combineReducers()` to produce the root reducer
     * function (either directly or indirectly by passing an object as `reducer`),
     * this must be an object with the same shape as the reducer map keys.
     */
    preloadedState?: PreloadedState<CombinedState<NoInfer<S>>>;
    /**
     * The store enhancers to apply. See Redux's `createStore()`.
     * All enhancers will be included before the DevTools Extension enhancer.
     * If you need to customize the order of enhancers, supply a callback
     * function that will receive the original array (ie, `[applyMiddleware]`),
     * and should return a new array (such as `[applyMiddleware, offline]`).
     * If you only need to add middleware, you can use the `middleware` parameter instead.
     */
    enhancers?: E | ConfigureEnhancersCallback<E>;
}
declare type Middlewares<S> = ReadonlyArray<Middleware<{}, S>>;
declare type Enhancers = ReadonlyArray<StoreEnhancer>;
export interface ToolkitStore<S = any, A extends Action = AnyAction, M extends Middlewares<S> = Middlewares<S>> extends Store<S, A> {
    /**
     * The `dispatch` method of your store, enhanced by all its middlewares.
     *
     * @inheritdoc
     */
    dispatch: ExtractDispatchExtensions<M> & Dispatch<A>;
}
/**
 * A Redux store returned by `configureStore()`. Supports dispatching
 * side-effectful _thunks_ in addition to plain actions.
 *
 * @public
 */
export declare type EnhancedStore<S = any, A extends Action = AnyAction, M extends Middlewares<S> = Middlewares<S>, E extends Enhancers = Enhancers> = ToolkitStore<S & ExtractStateExtensions<E>, A, M> & ExtractStoreExtensions<E>;
/**
 * A friendly abstraction over the standard Redux `createStore()` function.
 *
 * @param options The store configuration.
 * @returns A configured Redux store.
 *
 * @public
 */
export declare function configureStore<S = any, A extends Action = AnyAction, M extends Middlewares<S> = [ThunkMiddlewareFor<S>], E extends Enhancers = [StoreEnhancer]>(options: ConfigureStoreOptions<S, A, M, E>): EnhancedStore<S, A, M, E>;
export {};
