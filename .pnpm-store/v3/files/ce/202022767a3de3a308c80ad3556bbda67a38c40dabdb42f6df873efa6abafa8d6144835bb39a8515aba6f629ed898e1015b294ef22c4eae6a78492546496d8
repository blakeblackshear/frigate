import type { ThunkDispatch, ActionCreatorWithoutPayload } from '@reduxjs/toolkit';
export declare const onFocus: ActionCreatorWithoutPayload<"__rtkq/focused">;
export declare const onFocusLost: ActionCreatorWithoutPayload<"__rtkq/unfocused">;
export declare const onOnline: ActionCreatorWithoutPayload<"__rtkq/online">;
export declare const onOffline: ActionCreatorWithoutPayload<"__rtkq/offline">;
/**
 * A utility used to enable `refetchOnMount` and `refetchOnReconnect` behaviors.
 * It requires the dispatch method from your store.
 * Calling `setupListeners(store.dispatch)` will configure listeners with the recommended defaults,
 * but you have the option of providing a callback for more granular control.
 *
 * @example
 * ```ts
 * setupListeners(store.dispatch)
 * ```
 *
 * @param dispatch - The dispatch method from your store
 * @param customHandler - An optional callback for more granular control over listener behavior
 * @returns Return value of the handler.
 * The default handler returns an `unsubscribe` method that can be called to remove the listeners.
 */
export declare function setupListeners(dispatch: ThunkDispatch<any, any, any>, customHandler?: (dispatch: ThunkDispatch<any, any, any>, actions: {
    onFocus: typeof onFocus;
    onFocusLost: typeof onFocusLost;
    onOnline: typeof onOnline;
    onOffline: typeof onOffline;
}) => () => void): () => void;
