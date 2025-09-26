import type { EndpointDefinitions, QueryDefinition, MutationDefinition, QueryArgFrom, ResultTypeFrom } from '../endpointDefinitions';
import type { QueryThunk, MutationThunk, QueryThunkArg } from './buildThunks';
import type { AnyAction, ThunkAction, SerializedError } from '@reduxjs/toolkit';
import type { SubscriptionOptions } from './apiState';
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs';
import type { Api, ApiContext } from '../apiTypes';
import type { BaseQueryError, QueryReturnValue } from '../baseQueryTypes';
import type { QueryResultSelectorResult } from './buildSelectors';
import type { Dispatch } from 'redux';
declare module './module' {
    interface ApiEndpointQuery<Definition extends QueryDefinition<any, any, any, any, any>, Definitions extends EndpointDefinitions> {
        initiate: StartQueryActionCreator<Definition>;
    }
    interface ApiEndpointMutation<Definition extends MutationDefinition<any, any, any, any, any>, Definitions extends EndpointDefinitions> {
        initiate: StartMutationActionCreator<Definition>;
    }
}
export declare const forceQueryFnSymbol: unique symbol;
export declare const isUpsertQuery: (arg: QueryThunkArg) => boolean;
export interface StartQueryActionCreatorOptions {
    subscribe?: boolean;
    forceRefetch?: boolean | number;
    subscriptionOptions?: SubscriptionOptions;
    [forceQueryFnSymbol]?: () => QueryReturnValue;
}
declare type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any, any>> = (arg: QueryArgFrom<D>, options?: StartQueryActionCreatorOptions) => ThunkAction<QueryActionCreatorResult<D>, any, any, AnyAction>;
export declare type QueryActionCreatorResult<D extends QueryDefinition<any, any, any, any>> = Promise<QueryResultSelectorResult<D>> & {
    arg: QueryArgFrom<D>;
    requestId: string;
    subscriptionOptions: SubscriptionOptions | undefined;
    abort(): void;
    unwrap(): Promise<ResultTypeFrom<D>>;
    unsubscribe(): void;
    refetch(): QueryActionCreatorResult<D>;
    updateSubscriptionOptions(options: SubscriptionOptions): void;
    queryCacheKey: string;
};
declare type StartMutationActionCreator<D extends MutationDefinition<any, any, any, any>> = (arg: QueryArgFrom<D>, options?: {
    /**
     * If this mutation should be tracked in the store.
     * If you just want to manually trigger this mutation using `dispatch` and don't care about the
     * result, state & potential errors being held in store, you can set this to false.
     * (defaults to `true`)
     */
    track?: boolean;
    fixedCacheKey?: string;
}) => ThunkAction<MutationActionCreatorResult<D>, any, any, AnyAction>;
export declare type MutationActionCreatorResult<D extends MutationDefinition<any, any, any, any>> = Promise<{
    data: ResultTypeFrom<D>;
} | {
    error: Exclude<BaseQueryError<D extends MutationDefinition<any, infer BaseQuery, any, any> ? BaseQuery : never>, undefined> | SerializedError;
}> & {
    /** @internal */
    arg: {
        /**
         * The name of the given endpoint for the mutation
         */
        endpointName: string;
        /**
         * The original arguments supplied to the mutation call
         */
        originalArgs: QueryArgFrom<D>;
        /**
         * Whether the mutation is being tracked in the store.
         */
        track?: boolean;
        fixedCacheKey?: string;
    };
    /**
     * A unique string generated for the request sequence
     */
    requestId: string;
    /**
     * A method to cancel the mutation promise. Note that this is not intended to prevent the mutation
     * that was fired off from reaching the server, but only to assist in handling the response.
     *
     * Calling `abort()` prior to the promise resolving will force it to reach the error state with
     * the serialized error:
     * `{ name: 'AbortError', message: 'Aborted' }`
     *
     * @example
     * ```ts
     * const [updateUser] = useUpdateUserMutation();
     *
     * useEffect(() => {
     *   const promise = updateUser(id);
     *   promise
     *     .unwrap()
     *     .catch((err) => {
     *       if (err.name === 'AbortError') return;
     *       // else handle the unexpected error
     *     })
     *
     *   return () => {
     *     promise.abort();
     *   }
     * }, [id, updateUser])
     * ```
     */
    abort(): void;
    /**
     * Unwraps a mutation call to provide the raw response/error.
     *
     * @remarks
     * If you need to access the error or success payload immediately after a mutation, you can chain .unwrap().
     *
     * @example
     * ```ts
     * // codeblock-meta title="Using .unwrap"
     * addPost({ id: 1, name: 'Example' })
     *   .unwrap()
     *   .then((payload) => console.log('fulfilled', payload))
     *   .catch((error) => console.error('rejected', error));
     * ```
     *
     * @example
     * ```ts
     * // codeblock-meta title="Using .unwrap with async await"
     * try {
     *   const payload = await addPost({ id: 1, name: 'Example' }).unwrap();
     *   console.log('fulfilled', payload)
     * } catch (error) {
     *   console.error('rejected', error);
     * }
     * ```
     */
    unwrap(): Promise<ResultTypeFrom<D>>;
    /**
     * A method to manually unsubscribe from the mutation call, meaning it will be removed from cache after the usual caching grace period.
     The value returned by the hook will reset to `isUninitialized` afterwards.
     */
    reset(): void;
    /** @deprecated has been renamed to `reset` */
    unsubscribe(): void;
};
export declare function buildInitiate({ serializeQueryArgs, queryThunk, mutationThunk, api, context, }: {
    serializeQueryArgs: InternalSerializeQueryArgs;
    queryThunk: QueryThunk;
    mutationThunk: MutationThunk;
    api: Api<any, EndpointDefinitions, any, any>;
    context: ApiContext<EndpointDefinitions>;
}): {
    buildInitiateQuery: (endpointName: string, endpointDefinition: QueryDefinition<any, any, any, any>) => StartQueryActionCreator<any>;
    buildInitiateMutation: (endpointName: string) => StartMutationActionCreator<any>;
    getRunningQueryThunk: (endpointName: string, queryArgs: any) => (dispatch: Dispatch) => QueryActionCreatorResult<never> | undefined;
    getRunningMutationThunk: (_endpointName: string, fixedCacheKeyOrRequestId: string) => (dispatch: Dispatch) => MutationActionCreatorResult<never> | undefined;
    getRunningQueriesThunk: () => (dispatch: Dispatch) => QueryActionCreatorResult<any>[];
    getRunningMutationsThunk: () => (dispatch: Dispatch) => MutationActionCreatorResult<any>[];
    getRunningOperationPromises: () => (QueryActionCreatorResult<any> | MutationActionCreatorResult<any>)[];
    removalWarning: () => never;
};
export {};
