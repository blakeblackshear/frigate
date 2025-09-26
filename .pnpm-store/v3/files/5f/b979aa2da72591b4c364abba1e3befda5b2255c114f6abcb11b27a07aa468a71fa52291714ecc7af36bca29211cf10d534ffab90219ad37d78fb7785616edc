import type { ThunkDispatch } from '@reduxjs/toolkit';
import type { MaybePromise, UnwrapPromise } from './tsHelpers';
export interface BaseQueryApi {
    signal: AbortSignal;
    abort: (reason?: string) => void;
    dispatch: ThunkDispatch<any, any, any>;
    getState: () => unknown;
    extra: unknown;
    endpoint: string;
    type: 'query' | 'mutation';
    /**
     * Only available for queries: indicates if a query has been forced,
     * i.e. it would have been fetched even if there would already be a cache entry
     * (this does not mean that there is already a cache entry though!)
     *
     * This can be used to for example add a `Cache-Control: no-cache` header for
     * invalidated queries.
     */
    forced?: boolean;
}
export declare type QueryReturnValue<T = unknown, E = unknown, M = unknown> = {
    error: E;
    data?: undefined;
    meta?: M;
} | {
    error?: undefined;
    data: T;
    meta?: M;
};
export declare type BaseQueryFn<Args = any, Result = unknown, Error = unknown, DefinitionExtraOptions = {}, Meta = {}> = (args: Args, api: BaseQueryApi, extraOptions: DefinitionExtraOptions) => MaybePromise<QueryReturnValue<Result, Error, Meta>>;
export declare type BaseQueryEnhancer<AdditionalArgs = unknown, AdditionalDefinitionExtraOptions = unknown, Config = void> = <BaseQuery extends BaseQueryFn>(baseQuery: BaseQuery, config: Config) => BaseQueryFn<BaseQueryArg<BaseQuery> & AdditionalArgs, BaseQueryResult<BaseQuery>, BaseQueryError<BaseQuery>, BaseQueryExtraOptions<BaseQuery> & AdditionalDefinitionExtraOptions, NonNullable<BaseQueryMeta<BaseQuery>>>;
export declare type BaseQueryResult<BaseQuery extends BaseQueryFn> = UnwrapPromise<ReturnType<BaseQuery>> extends infer Unwrapped ? Unwrapped extends {
    data: any;
} ? Unwrapped['data'] : never : never;
export declare type BaseQueryMeta<BaseQuery extends BaseQueryFn> = UnwrapPromise<ReturnType<BaseQuery>>['meta'];
export declare type BaseQueryError<BaseQuery extends BaseQueryFn> = Exclude<UnwrapPromise<ReturnType<BaseQuery>>, {
    error?: undefined;
}>['error'];
export declare type BaseQueryArg<T extends (arg: any, ...args: any[]) => any> = T extends (arg: infer A, ...args: any[]) => any ? A : any;
export declare type BaseQueryExtraOptions<BaseQuery extends BaseQueryFn> = Parameters<BaseQuery>[2];
