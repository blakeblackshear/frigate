import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { BaseQueryFn, BaseQueryMeta } from '../../baseQueryTypes';
import type { RootState } from '../apiState';
import type { MutationResultSelectorResult, QueryResultSelectorResult } from '../buildSelectors';
import type { PatchCollection, Recipe } from '../buildThunks';
import type { InternalHandlerBuilder, PromiseWithKnownReason } from './types';
export declare type ReferenceCacheLifecycle = never;
declare module '../../endpointDefinitions' {
    interface QueryBaseLifecycleApi<QueryArg, BaseQuery extends BaseQueryFn, ResultType, ReducerPath extends string = string> extends LifecycleApi<ReducerPath> {
        /**
         * Gets the current value of this cache entry.
         */
        getCacheEntry(): QueryResultSelectorResult<{
            type: DefinitionType.query;
        } & BaseEndpointDefinition<QueryArg, BaseQuery, ResultType>>;
        /**
         * Updates the current cache entry value.
         * For documentation see `api.util.updateQueryData`.
         */
        updateCachedData(updateRecipe: Recipe<ResultType>): PatchCollection;
    }
    interface MutationBaseLifecycleApi<QueryArg, BaseQuery extends BaseQueryFn, ResultType, ReducerPath extends string = string> extends LifecycleApi<ReducerPath> {
        /**
         * Gets the current value of this cache entry.
         */
        getCacheEntry(): MutationResultSelectorResult<{
            type: DefinitionType.mutation;
        } & BaseEndpointDefinition<QueryArg, BaseQuery, ResultType>>;
    }
    interface LifecycleApi<ReducerPath extends string = string> {
        /**
         * The dispatch method for the store
         */
        dispatch: ThunkDispatch<any, any, AnyAction>;
        /**
         * A method to get the current state
         */
        getState(): RootState<any, any, ReducerPath>;
        /**
         * `extra` as provided as `thunk.extraArgument` to the `configureStore` `getDefaultMiddleware` option.
         */
        extra: unknown;
        /**
         * A unique ID generated for the mutation
         */
        requestId: string;
    }
    interface CacheLifecyclePromises<ResultType = unknown, MetaType = unknown> {
        /**
         * Promise that will resolve with the first value for this cache key.
         * This allows you to `await` until an actual value is in cache.
         *
         * If the cache entry is removed from the cache before any value has ever
         * been resolved, this Promise will reject with
         * `new Error('Promise never resolved before cacheEntryRemoved.')`
         * to prevent memory leaks.
         * You can just re-throw that error (or not handle it at all) -
         * it will be caught outside of `cacheEntryAdded`.
         *
         * If you don't interact with this promise, it will not throw.
         */
        cacheDataLoaded: PromiseWithKnownReason<{
            /**
             * The (transformed) query result.
             */
            data: ResultType;
            /**
             * The `meta` returned by the `baseQuery`
             */
            meta: MetaType;
        }, typeof neverResolvedError>;
        /**
         * Promise that allows you to wait for the point in time when the cache entry
         * has been removed from the cache, by not being used/subscribed to any more
         * in the application for too long or by dispatching `api.util.resetApiState`.
         */
        cacheEntryRemoved: Promise<void>;
    }
    interface QueryCacheLifecycleApi<QueryArg, BaseQuery extends BaseQueryFn, ResultType, ReducerPath extends string = string> extends QueryBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>, CacheLifecyclePromises<ResultType, BaseQueryMeta<BaseQuery>> {
    }
    interface MutationCacheLifecycleApi<QueryArg, BaseQuery extends BaseQueryFn, ResultType, ReducerPath extends string = string> extends MutationBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>, CacheLifecyclePromises<ResultType, BaseQueryMeta<BaseQuery>> {
    }
    interface QueryExtraOptions<TagTypes extends string, ResultType, QueryArg, BaseQuery extends BaseQueryFn, ReducerPath extends string = string> {
        onCacheEntryAdded?(arg: QueryArg, api: QueryCacheLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>): Promise<void> | void;
    }
    interface MutationExtraOptions<TagTypes extends string, ResultType, QueryArg, BaseQuery extends BaseQueryFn, ReducerPath extends string = string> {
        onCacheEntryAdded?(arg: QueryArg, api: MutationCacheLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>): Promise<void> | void;
    }
}
declare const neverResolvedError: Error & {
    message: 'Promise never resolved before cacheEntryRemoved.';
};
export declare const buildCacheLifecycleHandler: InternalHandlerBuilder;
export {};
