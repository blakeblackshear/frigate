import type { BaseQueryApi, BaseQueryArg, BaseQueryEnhancer, BaseQueryExtraOptions, BaseQueryFn } from './baseQueryTypes';
import type { FetchBaseQueryError } from './fetchBaseQuery';
declare type RetryConditionFunction = (error: FetchBaseQueryError, args: BaseQueryArg<BaseQueryFn>, extraArgs: {
    attempt: number;
    baseQueryApi: BaseQueryApi;
    extraOptions: BaseQueryExtraOptions<BaseQueryFn> & RetryOptions;
}) => boolean;
export declare type RetryOptions = {
    /**
     * Function used to determine delay between retries
     */
    backoff?: (attempt: number, maxRetries: number) => Promise<void>;
} & ({
    /**
     * How many times the query will be retried (default: 5)
     */
    maxRetries?: number;
    retryCondition?: undefined;
} | {
    /**
     * Callback to determine if a retry should be attempted.
     * Return `true` for another retry and `false` to quit trying prematurely.
     */
    retryCondition?: RetryConditionFunction;
    maxRetries?: undefined;
});
declare function fail(e: any): never;
/**
 * A utility that can wrap `baseQuery` in the API definition to provide retries with a basic exponential backoff.
 *
 * @example
 *
 * ```ts
 * // codeblock-meta title="Retry every request 5 times by default"
 * import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
 * interface Post {
 *   id: number
 *   name: string
 * }
 * type PostsResponse = Post[]
 *
 * // maxRetries: 5 is the default, and can be omitted. Shown for documentation purposes.
 * const staggeredBaseQuery = retry(fetchBaseQuery({ baseUrl: '/' }), { maxRetries: 5 });
 * export const api = createApi({
 *   baseQuery: staggeredBaseQuery,
 *   endpoints: (build) => ({
 *     getPosts: build.query<PostsResponse, void>({
 *       query: () => ({ url: 'posts' }),
 *     }),
 *     getPost: build.query<PostsResponse, string>({
 *       query: (id) => ({ url: `post/${id}` }),
 *       extraOptions: { maxRetries: 8 }, // You can override the retry behavior on each endpoint
 *     }),
 *   }),
 * });
 *
 * export const { useGetPostsQuery, useGetPostQuery } = api;
 * ```
 */
export declare const retry: BaseQueryEnhancer<unknown, RetryOptions, void | RetryOptions> & {
    fail: typeof fail;
};
export {};
