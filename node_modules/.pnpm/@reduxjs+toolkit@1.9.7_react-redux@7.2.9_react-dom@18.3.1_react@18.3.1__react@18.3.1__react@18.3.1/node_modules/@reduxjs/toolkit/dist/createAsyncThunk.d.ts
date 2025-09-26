import type { Dispatch, AnyAction } from 'redux';
import type { ActionCreatorWithPreparedPayload } from './createAction';
import type { ThunkDispatch } from 'redux-thunk';
import type { FallbackIfUnknown, Id, IsAny, IsUnknown } from './tsHelpers';
export declare type BaseThunkAPI<S, E, D extends Dispatch = Dispatch, RejectedValue = unknown, RejectedMeta = unknown, FulfilledMeta = unknown> = {
    dispatch: D;
    getState: () => S;
    extra: E;
    requestId: string;
    signal: AbortSignal;
    abort: (reason?: string) => void;
    rejectWithValue: IsUnknown<RejectedMeta, (value: RejectedValue) => RejectWithValue<RejectedValue, RejectedMeta>, (value: RejectedValue, meta: RejectedMeta) => RejectWithValue<RejectedValue, RejectedMeta>>;
    fulfillWithValue: IsUnknown<FulfilledMeta, <FulfilledValue>(value: FulfilledValue) => FulfilledValue, <FulfilledValue>(value: FulfilledValue, meta: FulfilledMeta) => FulfillWithMeta<FulfilledValue, FulfilledMeta>>;
};
/**
 * @public
 */
export interface SerializedError {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
}
declare class RejectWithValue<Payload, RejectedMeta> {
    readonly payload: Payload;
    readonly meta: RejectedMeta;
    private readonly _type;
    constructor(payload: Payload, meta: RejectedMeta);
}
declare class FulfillWithMeta<Payload, FulfilledMeta> {
    readonly payload: Payload;
    readonly meta: FulfilledMeta;
    private readonly _type;
    constructor(payload: Payload, meta: FulfilledMeta);
}
/**
 * Serializes an error into a plain object.
 * Reworked from https://github.com/sindresorhus/serialize-error
 *
 * @public
 */
export declare const miniSerializeError: (value: any) => SerializedError;
declare type AsyncThunkConfig = {
    state?: unknown;
    dispatch?: Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
};
declare type GetState<ThunkApiConfig> = ThunkApiConfig extends {
    state: infer State;
} ? State : unknown;
declare type GetExtra<ThunkApiConfig> = ThunkApiConfig extends {
    extra: infer Extra;
} ? Extra : unknown;
declare type GetDispatch<ThunkApiConfig> = ThunkApiConfig extends {
    dispatch: infer Dispatch;
} ? FallbackIfUnknown<Dispatch, ThunkDispatch<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, AnyAction>> : ThunkDispatch<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, AnyAction>;
export declare type GetThunkAPI<ThunkApiConfig> = BaseThunkAPI<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, GetDispatch<ThunkApiConfig>, GetRejectValue<ThunkApiConfig>, GetRejectedMeta<ThunkApiConfig>, GetFulfilledMeta<ThunkApiConfig>>;
declare type GetRejectValue<ThunkApiConfig> = ThunkApiConfig extends {
    rejectValue: infer RejectValue;
} ? RejectValue : unknown;
declare type GetPendingMeta<ThunkApiConfig> = ThunkApiConfig extends {
    pendingMeta: infer PendingMeta;
} ? PendingMeta : unknown;
declare type GetFulfilledMeta<ThunkApiConfig> = ThunkApiConfig extends {
    fulfilledMeta: infer FulfilledMeta;
} ? FulfilledMeta : unknown;
declare type GetRejectedMeta<ThunkApiConfig> = ThunkApiConfig extends {
    rejectedMeta: infer RejectedMeta;
} ? RejectedMeta : unknown;
declare type GetSerializedErrorType<ThunkApiConfig> = ThunkApiConfig extends {
    serializedErrorType: infer GetSerializedErrorType;
} ? GetSerializedErrorType : SerializedError;
declare type MaybePromise<T> = T | Promise<T> | (T extends any ? Promise<T> : never);
/**
 * A type describing the return value of the `payloadCreator` argument to `createAsyncThunk`.
 * Might be useful for wrapping `createAsyncThunk` in custom abstractions.
 *
 * @public
 */
export declare type AsyncThunkPayloadCreatorReturnValue<Returned, ThunkApiConfig extends AsyncThunkConfig> = MaybePromise<IsUnknown<GetFulfilledMeta<ThunkApiConfig>, Returned, FulfillWithMeta<Returned, GetFulfilledMeta<ThunkApiConfig>>> | RejectWithValue<GetRejectValue<ThunkApiConfig>, GetRejectedMeta<ThunkApiConfig>>>;
/**
 * A type describing the `payloadCreator` argument to `createAsyncThunk`.
 * Might be useful for wrapping `createAsyncThunk` in custom abstractions.
 *
 * @public
 */
export declare type AsyncThunkPayloadCreator<Returned, ThunkArg = void, ThunkApiConfig extends AsyncThunkConfig = {}> = (arg: ThunkArg, thunkAPI: GetThunkAPI<ThunkApiConfig>) => AsyncThunkPayloadCreatorReturnValue<Returned, ThunkApiConfig>;
/**
 * A ThunkAction created by `createAsyncThunk`.
 * Dispatching it returns a Promise for either a
 * fulfilled or rejected action.
 * Also, the returned value contains an `abort()` method
 * that allows the asyncAction to be cancelled from the outside.
 *
 * @public
 */
export declare type AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = (dispatch: GetDispatch<ThunkApiConfig>, getState: () => GetState<ThunkApiConfig>, extra: GetExtra<ThunkApiConfig>) => Promise<ReturnType<AsyncThunkFulfilledActionCreator<Returned, ThunkArg>> | ReturnType<AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig>>> & {
    abort: (reason?: string) => void;
    requestId: string;
    arg: ThunkArg;
    unwrap: () => Promise<Returned>;
};
declare type AsyncThunkActionCreator<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = IsAny<ThunkArg, (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>, unknown extends ThunkArg ? (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> : [ThunkArg] extends [void] | [undefined] ? () => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> : [void] extends [ThunkArg] ? (arg?: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> : [undefined] extends [ThunkArg] ? WithStrictNullChecks<(arg?: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>, (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>> : (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>>;
/**
 * Options object for `createAsyncThunk`.
 *
 * @public
 */
export declare type AsyncThunkOptions<ThunkArg = void, ThunkApiConfig extends AsyncThunkConfig = {}> = {
    /**
     * A method to control whether the asyncThunk should be executed. Has access to the
     * `arg`, `api.getState()` and `api.extra` arguments.
     *
     * @returns `false` if it should be skipped
     */
    condition?(arg: ThunkArg, api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>): MaybePromise<boolean | undefined>;
    /**
     * If `condition` returns `false`, the asyncThunk will be skipped.
     * This option allows you to control whether a `rejected` action with `meta.condition == false`
     * will be dispatched or not.
     *
     * @default `false`
     */
    dispatchConditionRejection?: boolean;
    serializeError?: (x: unknown) => GetSerializedErrorType<ThunkApiConfig>;
    /**
     * A function to use when generating the `requestId` for the request sequence.
     *
     * @default `nanoid`
     */
    idGenerator?: (arg: ThunkArg) => string;
} & IsUnknown<GetPendingMeta<ThunkApiConfig>, {
    /**
     * A method to generate additional properties to be added to `meta` of the pending action.
     *
     * Using this optional overload will not modify the types correctly, this overload is only in place to support JavaScript users.
     * Please use the `ThunkApiConfig` parameter `pendingMeta` to get access to a correctly typed overload
     */
    getPendingMeta?(base: {
        arg: ThunkArg;
        requestId: string;
    }, api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>): GetPendingMeta<ThunkApiConfig>;
}, {
    /**
     * A method to generate additional properties to be added to `meta` of the pending action.
     */
    getPendingMeta(base: {
        arg: ThunkArg;
        requestId: string;
    }, api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>): GetPendingMeta<ThunkApiConfig>;
}>;
export declare type AsyncThunkPendingActionCreator<ThunkArg, ThunkApiConfig = {}> = ActionCreatorWithPreparedPayload<[
    string,
    ThunkArg,
    GetPendingMeta<ThunkApiConfig>?
], undefined, string, never, {
    arg: ThunkArg;
    requestId: string;
    requestStatus: 'pending';
} & GetPendingMeta<ThunkApiConfig>>;
export declare type AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig = {}> = ActionCreatorWithPreparedPayload<[
    Error | null,
    string,
    ThunkArg,
    GetRejectValue<ThunkApiConfig>?,
    GetRejectedMeta<ThunkApiConfig>?
], GetRejectValue<ThunkApiConfig> | undefined, string, GetSerializedErrorType<ThunkApiConfig>, {
    arg: ThunkArg;
    requestId: string;
    requestStatus: 'rejected';
    aborted: boolean;
    condition: boolean;
} & (({
    rejectedWithValue: false;
} & {
    [K in keyof GetRejectedMeta<ThunkApiConfig>]?: undefined;
}) | ({
    rejectedWithValue: true;
} & GetRejectedMeta<ThunkApiConfig>))>;
export declare type AsyncThunkFulfilledActionCreator<Returned, ThunkArg, ThunkApiConfig = {}> = ActionCreatorWithPreparedPayload<[
    Returned,
    string,
    ThunkArg,
    GetFulfilledMeta<ThunkApiConfig>?
], Returned, string, never, {
    arg: ThunkArg;
    requestId: string;
    requestStatus: 'fulfilled';
} & GetFulfilledMeta<ThunkApiConfig>>;
/**
 * A type describing the return value of `createAsyncThunk`.
 * Might be useful for wrapping `createAsyncThunk` in custom abstractions.
 *
 * @public
 */
export declare type AsyncThunk<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = AsyncThunkActionCreator<Returned, ThunkArg, ThunkApiConfig> & {
    pending: AsyncThunkPendingActionCreator<ThunkArg, ThunkApiConfig>;
    rejected: AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig>;
    fulfilled: AsyncThunkFulfilledActionCreator<Returned, ThunkArg, ThunkApiConfig>;
    typePrefix: string;
};
declare type OverrideThunkApiConfigs<OldConfig, NewConfig> = Id<NewConfig & Omit<OldConfig, keyof NewConfig>>;
declare type CreateAsyncThunk<CurriedThunkApiConfig extends AsyncThunkConfig> = {
    /**
     *
     * @param typePrefix
     * @param payloadCreator
     * @param options
     *
     * @public
     */
    <Returned, ThunkArg = void>(typePrefix: string, payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, CurriedThunkApiConfig>, options?: AsyncThunkOptions<ThunkArg, CurriedThunkApiConfig>): AsyncThunk<Returned, ThunkArg, CurriedThunkApiConfig>;
    /**
     *
     * @param typePrefix
     * @param payloadCreator
     * @param options
     *
     * @public
     */
    <Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig>(typePrefix: string, payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>>, options?: AsyncThunkOptions<ThunkArg, OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>>): AsyncThunk<Returned, ThunkArg, OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>>;
    withTypes<ThunkApiConfig extends AsyncThunkConfig>(): CreateAsyncThunk<OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>>;
};
export declare const createAsyncThunk: CreateAsyncThunk<AsyncThunkConfig>;
interface UnwrappableAction {
    payload: any;
    meta?: any;
    error?: any;
}
declare type UnwrappedActionPayload<T extends UnwrappableAction> = Exclude<T, {
    error: any;
}>['payload'];
/**
 * @public
 */
export declare function unwrapResult<R extends UnwrappableAction>(action: R): UnwrappedActionPayload<R>;
declare type WithStrictNullChecks<True, False> = undefined extends boolean ? False : True;
export {};
