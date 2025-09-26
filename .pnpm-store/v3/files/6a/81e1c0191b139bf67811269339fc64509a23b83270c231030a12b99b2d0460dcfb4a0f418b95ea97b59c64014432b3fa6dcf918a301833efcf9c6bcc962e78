import type { Dispatch, AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { ListenerMiddlewareInstance, CreateListenerMiddlewareOptions, TypedAddListener, TypedCreateListenerEntry, ListenerEntry, TypedRemoveListener } from './types';
export { TaskAbortError } from './exceptions';
export type { ListenerEffect, ListenerMiddleware, ListenerEffectAPI, ListenerMiddlewareInstance, CreateListenerMiddlewareOptions, ListenerErrorHandler, TypedStartListening, TypedAddListener, TypedStopListening, TypedRemoveListener, UnsubscribeListener, UnsubscribeListenerOptions, ForkedTaskExecutor, ForkedTask, ForkedTaskAPI, AsyncTaskExecutor, SyncTaskExecutor, TaskCancelled, TaskRejected, TaskResolved, TaskResult, } from './types';
/** Accepts the possible options for creating a listener, and returns a formatted listener entry */
export declare const createListenerEntry: TypedCreateListenerEntry<unknown>;
/**
 * @public
 */
export declare const addListener: TypedAddListener<unknown, ThunkDispatch<unknown, unknown, AnyAction>, unknown, ListenerEntry<unknown, ThunkDispatch<unknown, unknown, AnyAction>>, "listenerMiddleware/add">;
/**
 * @public
 */
export declare const clearAllListeners: import("../createAction").ActionCreatorWithoutPayload<string>;
/**
 * @public
 */
export declare const removeListener: TypedRemoveListener<unknown, ThunkDispatch<unknown, unknown, AnyAction>, ListenerEntry<unknown, ThunkDispatch<unknown, unknown, AnyAction>>, "listenerMiddleware/remove">;
/**
 * @public
 */
export declare function createListenerMiddleware<S = unknown, D extends Dispatch<AnyAction> = ThunkDispatch<S, unknown, AnyAction>, ExtraArgument = unknown>(middlewareOptions?: CreateListenerMiddlewareOptions<ExtraArgument>): ListenerMiddlewareInstance<S, D, ExtraArgument>;
