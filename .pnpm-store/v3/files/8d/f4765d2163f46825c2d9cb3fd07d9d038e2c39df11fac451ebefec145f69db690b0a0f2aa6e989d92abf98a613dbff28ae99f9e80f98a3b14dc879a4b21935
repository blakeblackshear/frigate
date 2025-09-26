import type { BaseQueryFn } from '../../baseQueryTypes';
import type { InternalHandlerBuilder } from './types';
export declare type ReferenceCacheCollection = never;
declare module '../../endpointDefinitions' {
    interface QueryExtraOptions<TagTypes extends string, ResultType, QueryArg, BaseQuery extends BaseQueryFn, ReducerPath extends string = string> {
        /**
         * Overrides the api-wide definition of `keepUnusedDataFor` for this endpoint only. _(This value is in seconds.)_
         *
         * This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.
         */
        keepUnusedDataFor?: number;
    }
}
export declare const THIRTY_TWO_BIT_MAX_INT = 2147483647;
export declare const THIRTY_TWO_BIT_MAX_TIMER_SECONDS: number;
export declare const buildCacheCollectionHandler: InternalHandlerBuilder;
