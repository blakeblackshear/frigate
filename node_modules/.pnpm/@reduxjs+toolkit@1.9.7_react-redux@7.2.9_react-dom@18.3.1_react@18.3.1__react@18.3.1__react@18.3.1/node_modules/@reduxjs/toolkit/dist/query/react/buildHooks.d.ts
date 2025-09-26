import { useEffect } from 'react';
import { QueryStatus } from '@reduxjs/toolkit/query';
import type { QuerySubState, SubscriptionOptions, QueryKeys } from '@reduxjs/toolkit/query';
import type { EndpointDefinitions, MutationDefinition, QueryDefinition, QueryArgFrom, ResultTypeFrom } from '@reduxjs/toolkit/query';
import type { MutationResultSelectorResult, SkipToken } from '@reduxjs/toolkit/query';
import type { QueryActionCreatorResult, MutationActionCreatorResult } from '@reduxjs/toolkit/query';
import type { SerializeQueryArgs } from '@reduxjs/toolkit/query';
import type { Api, ApiContext } from '@reduxjs/toolkit/query';
import type { TSHelpersId, TSHelpersNoInfer, TSHelpersOverride } from '@reduxjs/toolkit/query';
import type { CoreModule, PrefetchOptions } from '@reduxjs/toolkit/query';
import type { ReactHooksModuleOptions } from './module';
import type { UninitializedValue } from './constants';
import type { BaseQueryFn } from '../baseQueryTypes';
export declare const useIsomorphicLayoutEffect: typeof useEffect;
export interface QueryHooks<Definition extends QueryDefinition<any, any, any, any, any>> {
    useQuery: UseQuery<Definition>;
    useLazyQuery: UseLazyQuery<Definition>;
    useQuerySubscription: UseQuerySubscription<Definition>;
    useLazyQuerySubscription: UseLazyQuerySubscription<Definition>;
    useQueryState: UseQueryState<Definition>;
}
export interface MutationHooks<Definition extends MutationDefinition<any, any, any, any, any>> {
    useMutation: UseMutation<Definition>;
}
/**
 * A React hook that automatically triggers fetches of data from an endpoint, 'subscribes' the component to the cached data, and reads the request status and cached data from the Redux store. The component will re-render as the loading status changes and the data becomes available.
 *
 * The query arg is used as a cache key. Changing the query arg will tell the hook to re-fetch the data if it does not exist in the cache already, and the hook will return the data for that query arg once it's available.
 *
 * This hook combines the functionality of both [`useQueryState`](#usequerystate) and [`useQuerySubscription`](#usequerysubscription) together, and is intended to be used in the majority of situations.
 *
 * #### Features
 *
 * - Automatically triggers requests to retrieve data based on the hook argument and whether cached data exists by default
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 */
export declare type UseQuery<D extends QueryDefinition<any, any, any, any>> = <R extends Record<string, any> = UseQueryStateDefaultResult<D>>(arg: QueryArgFrom<D> | SkipToken, options?: UseQuerySubscriptionOptions & UseQueryStateOptions<D, R>) => UseQueryHookResult<D, R>;
export declare type UseQueryHookResult<D extends QueryDefinition<any, any, any, any>, R = UseQueryStateDefaultResult<D>> = UseQueryStateResult<D, R> & UseQuerySubscriptionResult<D>;
/**
 * Helper type to manually type the result
 * of the `useQuery` hook in userland code.
 */
export declare type TypedUseQueryHookResult<ResultType, QueryArg, BaseQuery extends BaseQueryFn, R = UseQueryStateDefaultResult<QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>>> = TypedUseQueryStateResult<ResultType, QueryArg, BaseQuery, R> & TypedUseQuerySubscriptionResult<ResultType, QueryArg, BaseQuery>;
interface UseQuerySubscriptionOptions extends SubscriptionOptions {
    /**
     * Prevents a query from automatically running.
     *
     * @remarks
     * When `skip` is true (or `skipToken` is passed in as `arg`):
     *
     * - **If the query has cached data:**
     *   * The cached data **will not be used** on the initial load, and will ignore updates from any identical query until the `skip` condition is removed
     *   * The query will have a status of `uninitialized`
     *   * If `skip: false` is set after the initial load, the cached result will be used
     * - **If the query does not have cached data:**
     *   * The query will have a status of `uninitialized`
     *   * The query will not exist in the state when viewed with the dev tools
     *   * The query will not automatically fetch on mount
     *   * The query will not automatically run when additional components with the same query are added that do run
     *
     * @example
     * ```tsx
     * // codeblock-meta no-transpile title="Skip example"
     * const Pokemon = ({ name, skip }: { name: string; skip: boolean }) => {
     *   const { data, error, status } = useGetPokemonByNameQuery(name, {
     *     skip,
     *   });
     *
     *   return (
     *     <div>
     *       {name} - {status}
     *     </div>
     *   );
     * };
     * ```
     */
    skip?: boolean;
    /**
     * Defaults to `false`. This setting allows you to control whether if a cached result is already available, RTK Query will only serve a cached result, or if it should `refetch` when set to `true` or if an adequate amount of time has passed since the last successful query result.
     * - `false` - Will not cause a query to be performed _unless_ it does not exist yet.
     * - `true` - Will always refetch when a new subscriber to a query is added. Behaves the same as calling the `refetch` callback or passing `forceRefetch: true` in the action creator.
     * - `number` - **Value is in seconds**. If a number is provided and there is an existing query in the cache, it will compare the current time vs the last fulfilled timestamp, and only refetch if enough time has elapsed.
     *
     * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
     */
    refetchOnMountOrArgChange?: boolean | number;
}
/**
 * A React hook that automatically triggers fetches of data from an endpoint, and 'subscribes' the component to the cached data.
 *
 * The query arg is used as a cache key. Changing the query arg will tell the hook to re-fetch the data if it does not exist in the cache already.
 *
 * Note that this hook does not return a request status or cached data. For that use-case, see [`useQuery`](#usequery) or [`useQueryState`](#usequerystate).
 *
 * #### Features
 *
 * - Automatically triggers requests to retrieve data based on the hook argument and whether cached data exists by default
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met
 */
export declare type UseQuerySubscription<D extends QueryDefinition<any, any, any, any>> = (arg: QueryArgFrom<D> | SkipToken, options?: UseQuerySubscriptionOptions) => UseQuerySubscriptionResult<D>;
export declare type UseQuerySubscriptionResult<D extends QueryDefinition<any, any, any, any>> = Pick<QueryActionCreatorResult<D>, 'refetch'>;
/**
 * Helper type to manually type the result
 * of the `useQuerySubscription` hook in userland code.
 */
export declare type TypedUseQuerySubscriptionResult<ResultType, QueryArg, BaseQuery extends BaseQueryFn> = UseQuerySubscriptionResult<QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>>;
export declare type UseLazyQueryLastPromiseInfo<D extends QueryDefinition<any, any, any, any>> = {
    lastArg: QueryArgFrom<D>;
};
/**
 * A React hook similar to [`useQuery`](#usequery), but with manual control over when the data fetching occurs.
 *
 * This hook includes the functionality of [`useLazyQuerySubscription`](#uselazyquerysubscription).
 *
 * #### Features
 *
 * - Manual control over firing a request to retrieve data
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met and the fetch has been manually called at least once
 *
 * #### Note
 *
 * When the trigger function returned from a LazyQuery is called, it always initiates a new request to the server even if there is cached data. Set `preferCacheValue`(the second argument to the function) as `true` if you want it to immediately return a cached value if one exists.
 */
export declare type UseLazyQuery<D extends QueryDefinition<any, any, any, any>> = <R extends Record<string, any> = UseQueryStateDefaultResult<D>>(options?: SubscriptionOptions & Omit<UseQueryStateOptions<D, R>, 'skip'>) => [
    LazyQueryTrigger<D>,
    UseQueryStateResult<D, R>,
    UseLazyQueryLastPromiseInfo<D>
];
export declare type LazyQueryTrigger<D extends QueryDefinition<any, any, any, any>> = {
    /**
     * Triggers a lazy query.
     *
     * By default, this will start a new request even if there is already a value in the cache.
     * If you want to use the cache value and only start a request if there is no cache value, set the second argument to `true`.
     *
     * @remarks
     * If you need to access the error or success payload immediately after a lazy query, you can chain .unwrap().
     *
     * @example
     * ```ts
     * // codeblock-meta title="Using .unwrap with async await"
     * try {
     *   const payload = await getUserById(1).unwrap();
     *   console.log('fulfilled', payload)
     * } catch (error) {
     *   console.error('rejected', error);
     * }
     * ```
     */
    (arg: QueryArgFrom<D>, preferCacheValue?: boolean): QueryActionCreatorResult<D>;
};
/**
 * A React hook similar to [`useQuerySubscription`](#usequerysubscription), but with manual control over when the data fetching occurs.
 *
 * Note that this hook does not return a request status or cached data. For that use-case, see [`useLazyQuery`](#uselazyquery).
 *
 * #### Features
 *
 * - Manual control over firing a request to retrieve data
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met and the fetch has been manually called at least once
 */
export declare type UseLazyQuerySubscription<D extends QueryDefinition<any, any, any, any>> = (options?: SubscriptionOptions) => readonly [LazyQueryTrigger<D>, QueryArgFrom<D> | UninitializedValue];
export declare type QueryStateSelector<R extends Record<string, any>, D extends QueryDefinition<any, any, any, any>> = (state: UseQueryStateDefaultResult<D>) => R;
/**
 * A React hook that reads the request status and cached data from the Redux store. The component will re-render as the loading status changes and the data becomes available.
 *
 * Note that this hook does not trigger fetching new data. For that use-case, see [`useQuery`](#usequery) or [`useQuerySubscription`](#usequerysubscription).
 *
 * #### Features
 *
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 */
export declare type UseQueryState<D extends QueryDefinition<any, any, any, any>> = <R extends Record<string, any> = UseQueryStateDefaultResult<D>>(arg: QueryArgFrom<D> | SkipToken, options?: UseQueryStateOptions<D, R>) => UseQueryStateResult<D, R>;
export declare type UseQueryStateOptions<D extends QueryDefinition<any, any, any, any>, R extends Record<string, any>> = {
    /**
     * Prevents a query from automatically running.
     *
     * @remarks
     * When skip is true:
     *
     * - **If the query has cached data:**
     *   * The cached data **will not be used** on the initial load, and will ignore updates from any identical query until the `skip` condition is removed
     *   * The query will have a status of `uninitialized`
     *   * If `skip: false` is set after skipping the initial load, the cached result will be used
     * - **If the query does not have cached data:**
     *   * The query will have a status of `uninitialized`
     *   * The query will not exist in the state when viewed with the dev tools
     *   * The query will not automatically fetch on mount
     *   * The query will not automatically run when additional components with the same query are added that do run
     *
     * @example
     * ```ts
     * // codeblock-meta title="Skip example"
     * const Pokemon = ({ name, skip }: { name: string; skip: boolean }) => {
     *   const { data, error, status } = useGetPokemonByNameQuery(name, {
     *     skip,
     *   });
     *
     *   return (
     *     <div>
     *       {name} - {status}
     *     </div>
     *   );
     * };
     * ```
     */
    skip?: boolean;
    /**
     * `selectFromResult` allows you to get a specific segment from a query result in a performant manner.
     * When using this feature, the component will not rerender unless the underlying data of the selected item has changed.
     * If the selected item is one element in a larger collection, it will disregard changes to elements in the same collection.
     *
     * @example
     * ```ts
     * // codeblock-meta title="Using selectFromResult to extract a single result"
     * function PostsList() {
     *   const { data: posts } = api.useGetPostsQuery();
     *
     *   return (
     *     <ul>
     *       {posts?.data?.map((post) => (
     *         <PostById key={post.id} id={post.id} />
     *       ))}
     *     </ul>
     *   );
     * }
     *
     * function PostById({ id }: { id: number }) {
     *   // Will select the post with the given id, and will only rerender if the given posts data changes
     *   const { post } = api.useGetPostsQuery(undefined, {
     *     selectFromResult: ({ data }) => ({ post: data?.find((post) => post.id === id) }),
     *   });
     *
     *   return <li>{post?.name}</li>;
     * }
     * ```
     */
    selectFromResult?: QueryStateSelector<R, D>;
};
export declare type UseQueryStateResult<_ extends QueryDefinition<any, any, any, any>, R> = TSHelpersNoInfer<R>;
/**
 * Helper type to manually type the result
 * of the `useQueryState` hook in userland code.
 */
export declare type TypedUseQueryStateResult<ResultType, QueryArg, BaseQuery extends BaseQueryFn, R = UseQueryStateDefaultResult<QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>>> = TSHelpersNoInfer<R>;
declare type UseQueryStateBaseResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> & {
    /**
     * Where `data` tries to hold data as much as possible, also re-using
     * data from the last arguments passed into the hook, this property
     * will always contain the received data from the query, for the current query arguments.
     */
    currentData?: ResultTypeFrom<D>;
    /**
     * Query has not started yet.
     */
    isUninitialized: false;
    /**
     * Query is currently loading for the first time. No data yet.
     */
    isLoading: false;
    /**
     * Query is currently fetching, but might have data from an earlier request.
     */
    isFetching: false;
    /**
     * Query has data from a successful load.
     */
    isSuccess: false;
    /**
     * Query is currently in "error" state.
     */
    isError: false;
};
declare type UseQueryStateDefaultResult<D extends QueryDefinition<any, any, any, any>> = TSHelpersId<TSHelpersOverride<Extract<UseQueryStateBaseResult<D>, {
    status: QueryStatus.uninitialized;
}>, {
    isUninitialized: true;
}> | TSHelpersOverride<UseQueryStateBaseResult<D>, {
    isLoading: true;
    isFetching: boolean;
    data: undefined;
} | ({
    isSuccess: true;
    isFetching: true;
    error: undefined;
} & Required<Pick<UseQueryStateBaseResult<D>, 'data' | 'fulfilledTimeStamp'>>) | ({
    isSuccess: true;
    isFetching: false;
    error: undefined;
} & Required<Pick<UseQueryStateBaseResult<D>, 'data' | 'fulfilledTimeStamp' | 'currentData'>>) | ({
    isError: true;
} & Required<Pick<UseQueryStateBaseResult<D>, 'error'>>)>> & {
    /**
     * @deprecated will be removed in the next version
     * please use the `isLoading`, `isFetching`, `isSuccess`, `isError`
     * and `isUninitialized` flags instead
     */
    status: QueryStatus;
};
export declare type MutationStateSelector<R extends Record<string, any>, D extends MutationDefinition<any, any, any, any>> = (state: MutationResultSelectorResult<D>) => R;
export declare type UseMutationStateOptions<D extends MutationDefinition<any, any, any, any>, R extends Record<string, any>> = {
    selectFromResult?: MutationStateSelector<R, D>;
    fixedCacheKey?: string;
};
export declare type UseMutationStateResult<D extends MutationDefinition<any, any, any, any>, R> = TSHelpersNoInfer<R> & {
    originalArgs?: QueryArgFrom<D>;
    /**
     * Resets the hook state to it's initial `uninitialized` state.
     * This will also remove the last result from the cache.
     */
    reset: () => void;
};
/**
 * Helper type to manually type the result
 * of the `useMutation` hook in userland code.
 */
export declare type TypedUseMutationResult<ResultType, QueryArg, BaseQuery extends BaseQueryFn, R = MutationResultSelectorResult<MutationDefinition<QueryArg, BaseQuery, string, ResultType, string>>> = UseMutationStateResult<MutationDefinition<QueryArg, BaseQuery, string, ResultType, string>, R>;
/**
 * A React hook that lets you trigger an update request for a given endpoint, and subscribes the component to read the request status from the Redux store. The component will re-render as the loading status changes.
 *
 * #### Features
 *
 * - Manual control over firing a request to alter data on the server or possibly invalidate the cache
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 */
export declare type UseMutation<D extends MutationDefinition<any, any, any, any>> = <R extends Record<string, any> = MutationResultSelectorResult<D>>(options?: UseMutationStateOptions<D, R>) => readonly [MutationTrigger<D>, UseMutationStateResult<D, R>];
export declare type MutationTrigger<D extends MutationDefinition<any, any, any, any>> = {
    /**
     * Triggers the mutation and returns a Promise.
     * @remarks
     * If you need to access the error or success payload immediately after a mutation, you can chain .unwrap().
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
    (arg: QueryArgFrom<D>): MutationActionCreatorResult<D>;
};
/**
 *
 * @param opts.api - An API with defined endpoints to create hooks for
 * @param opts.moduleOptions.batch - The version of the `batchedUpdates` function to be used
 * @param opts.moduleOptions.useDispatch - The version of the `useDispatch` hook to be used
 * @param opts.moduleOptions.useSelector - The version of the `useSelector` hook to be used
 * @returns An object containing functions to generate hooks based on an endpoint
 */
export declare function buildHooks<Definitions extends EndpointDefinitions>({ api, moduleOptions: { batch, useDispatch, useSelector, useStore, unstable__sideEffectsInRender, }, serializeQueryArgs, context, }: {
    api: Api<any, Definitions, any, any, CoreModule>;
    moduleOptions: Required<ReactHooksModuleOptions>;
    serializeQueryArgs: SerializeQueryArgs<any>;
    context: ApiContext<Definitions>;
}): {
    buildQueryHooks: (name: string) => QueryHooks<any>;
    buildMutationHook: (name: string) => UseMutation<any>;
    usePrefetch: <EndpointName extends QueryKeys<Definitions>>(endpointName: EndpointName, defaultOptions?: PrefetchOptions | undefined) => (arg: any, options?: PrefetchOptions | undefined) => void;
};
export {};
