import type { ActionFromMatcher, Matcher, UnionToIntersection } from './tsHelpers';
import type { AsyncThunk, AsyncThunkFulfilledActionCreator, AsyncThunkPendingActionCreator, AsyncThunkRejectedActionCreator } from './createAsyncThunk';
/** @public */
export declare type ActionMatchingAnyOf<Matchers extends [...Matcher<any>[]]> = ActionFromMatcher<Matchers[number]>;
/** @public */
export declare type ActionMatchingAllOf<Matchers extends [...Matcher<any>[]]> = UnionToIntersection<ActionMatchingAnyOf<Matchers>>;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches any one of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export declare function isAnyOf<Matchers extends [...Matcher<any>[]]>(...matchers: Matchers): (action: any) => action is ActionFromMatcher<Matchers[number]>;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches all of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export declare function isAllOf<Matchers extends [...Matcher<any>[]]>(...matchers: Matchers): (action: any) => action is UnionToIntersection<ActionFromMatcher<Matchers[number]>>;
/**
 * @param action A redux action
 * @param validStatus An array of valid meta.requestStatus values
 *
 * @internal
 */
export declare function hasExpectedRequestMetadata(action: any, validStatus: readonly string[]): boolean;
export declare type UnknownAsyncThunkPendingAction = ReturnType<AsyncThunkPendingActionCreator<unknown>>;
export declare type PendingActionFromAsyncThunk<T extends AnyAsyncThunk> = ActionFromMatcher<T['pending']>;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action was created by an async thunk action creator, and that
 * the action is pending.
 *
 * @public
 */
export declare function isPending(): (action: any) => action is UnknownAsyncThunkPendingAction;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is pending.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export declare function isPending<AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]>(...asyncThunks: AsyncThunks): (action: any) => action is PendingActionFromAsyncThunk<AsyncThunks[number]>;
/**
 * Tests if `action` is a pending thunk action
 * @public
 */
export declare function isPending(action: any): action is UnknownAsyncThunkPendingAction;
export declare type UnknownAsyncThunkRejectedAction = ReturnType<AsyncThunkRejectedActionCreator<unknown, unknown>>;
export declare type RejectedActionFromAsyncThunk<T extends AnyAsyncThunk> = ActionFromMatcher<T['rejected']>;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action was created by an async thunk action creator, and that
 * the action is rejected.
 *
 * @public
 */
export declare function isRejected(): (action: any) => action is UnknownAsyncThunkRejectedAction;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is rejected.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export declare function isRejected<AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]>(...asyncThunks: AsyncThunks): (action: any) => action is RejectedActionFromAsyncThunk<AsyncThunks[number]>;
/**
 * Tests if `action` is a rejected thunk action
 * @public
 */
export declare function isRejected(action: any): action is UnknownAsyncThunkRejectedAction;
export declare type UnknownAsyncThunkRejectedWithValueAction = ReturnType<AsyncThunkRejectedActionCreator<unknown, unknown>>;
export declare type RejectedWithValueActionFromAsyncThunk<T extends AnyAsyncThunk> = ActionFromMatcher<T['rejected']> & (T extends AsyncThunk<any, any, {
    rejectValue: infer RejectedValue;
}> ? {
    payload: RejectedValue;
} : unknown);
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action was created by an async thunk action creator, and that
 * the action is rejected with value.
 *
 * @public
 */
export declare function isRejectedWithValue(): (action: any) => action is UnknownAsyncThunkRejectedAction;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is rejected with value.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export declare function isRejectedWithValue<AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]>(...asyncThunks: AsyncThunks): (action: any) => action is RejectedWithValueActionFromAsyncThunk<AsyncThunks[number]>;
/**
 * Tests if `action` is a rejected thunk action with value
 * @public
 */
export declare function isRejectedWithValue(action: any): action is UnknownAsyncThunkRejectedAction;
export declare type UnknownAsyncThunkFulfilledAction = ReturnType<AsyncThunkFulfilledActionCreator<unknown, unknown>>;
export declare type FulfilledActionFromAsyncThunk<T extends AnyAsyncThunk> = ActionFromMatcher<T['fulfilled']>;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action was created by an async thunk action creator, and that
 * the action is fulfilled.
 *
 * @public
 */
export declare function isFulfilled(): (action: any) => action is UnknownAsyncThunkFulfilledAction;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is fulfilled.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export declare function isFulfilled<AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]>(...asyncThunks: AsyncThunks): (action: any) => action is FulfilledActionFromAsyncThunk<AsyncThunks[number]>;
/**
 * Tests if `action` is a fulfilled thunk action
 * @public
 */
export declare function isFulfilled(action: any): action is UnknownAsyncThunkFulfilledAction;
export declare type UnknownAsyncThunkAction = UnknownAsyncThunkPendingAction | UnknownAsyncThunkRejectedAction | UnknownAsyncThunkFulfilledAction;
export declare type AnyAsyncThunk = {
    pending: {
        match: (action: any) => action is any;
    };
    fulfilled: {
        match: (action: any) => action is any;
    };
    rejected: {
        match: (action: any) => action is any;
    };
};
export declare type ActionsFromAsyncThunk<T extends AnyAsyncThunk> = ActionFromMatcher<T['pending']> | ActionFromMatcher<T['fulfilled']> | ActionFromMatcher<T['rejected']>;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action was created by an async thunk action creator.
 *
 * @public
 */
export declare function isAsyncThunkAction(): (action: any) => action is UnknownAsyncThunkAction;
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export declare function isAsyncThunkAction<AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]>(...asyncThunks: AsyncThunks): (action: any) => action is ActionsFromAsyncThunk<AsyncThunks[number]>;
/**
 * Tests if `action` is a thunk action
 * @public
 */
export declare function isAsyncThunkAction(action: any): action is UnknownAsyncThunkAction;
