import type { BaseQueryError, BaseQueryFn, BaseQueryMeta } from '../../baseQueryTypes';
import type { PromiseWithKnownReason, InternalHandlerBuilder } from './types';
export declare type ReferenceQueryLifecycle = never;
declare module '../../endpointDefinitions' {
    interface QueryLifecyclePromises<ResultType, BaseQuery extends BaseQueryFn> {
        /**
         * Promise that will resolve with the (transformed) query result.
         *
         * If the query fails, this promise will reject with the error.
         *
         * This allows you to `await` for the query to finish.
         *
         * If you don't interact with this promise, it will not throw.
         */
        queryFulfilled: PromiseWithKnownReason<{
            /**
             * The (transformed) query result.
             */
            data: ResultType;
            /**
             * The `meta` returned by the `baseQuery`
             */
            meta: BaseQueryMeta<BaseQuery>;
        }, QueryFulfilledRejectionReason<BaseQuery>>;
    }
    type QueryFulfilledRejectionReason<BaseQuery extends BaseQueryFn> = {
        error: BaseQueryError<BaseQuery>;
        /**
         * If this is `false`, that means this error was returned from the `baseQuery` or `queryFn` in a controlled manner.
         */
        isUnhandledError: false;
        /**
         * The `meta` returned by the `baseQuery`
         */
        meta: BaseQueryMeta<BaseQuery>;
    } | {
        error: unknown;
        meta?: undefined;
        /**
         * If this is `true`, that means that this error is the result of `baseQueryFn`, `queryFn`, `transformResponse` or `transformErrorResponse` throwing an error instead of handling it properly.
         * There can not be made any assumption about the shape of `error`.
         */
        isUnhandledError: true;
    };
    interface QueryExtraOptions<TagTypes extends string, ResultType, QueryArg, BaseQuery extends BaseQueryFn, ReducerPath extends string = string> {
        /**
         * A function that is called when the individual query is started. The function is called with a lifecycle api object containing properties such as `queryFulfilled`, allowing code to be run when a query is started, when it succeeds, and when it fails (i.e. throughout the lifecycle of an individual query/mutation call).
         *
         * Can be used to perform side-effects throughout the lifecycle of the query.
         *
         * @example
         * ```ts
         * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
         * import { messageCreated } from './notificationsSlice
         * export interface Post {
         *   id: number
         *   name: string
         * }
         *
         * const api = createApi({
         *   baseQuery: fetchBaseQuery({
         *     baseUrl: '/',
         *   }),
         *   endpoints: (build) => ({
         *     getPost: build.query<Post, number>({
         *       query: (id) => `post/${id}`,
         *       async onQueryStarted(id, { dispatch, queryFulfilled }) {
         *         // `onStart` side-effect
         *         dispatch(messageCreated('Fetching posts...'))
         *         try {
         *           const { data } = await queryFulfilled
         *           // `onSuccess` side-effect
         *           dispatch(messageCreated('Posts received!'))
         *         } catch (err) {
         *           // `onError` side-effect
         *           dispatch(messageCreated('Error fetching posts!'))
         *         }
         *       }
         *     }),
         *   }),
         * })
         * ```
         */
        onQueryStarted?(arg: QueryArg, api: QueryLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>): Promise<void> | void;
    }
    interface MutationExtraOptions<TagTypes extends string, ResultType, QueryArg, BaseQuery extends BaseQueryFn, ReducerPath extends string = string> {
        /**
         * A function that is called when the individual mutation is started. The function is called with a lifecycle api object containing properties such as `queryFulfilled`, allowing code to be run when a query is started, when it succeeds, and when it fails (i.e. throughout the lifecycle of an individual query/mutation call).
         *
         * Can be used for `optimistic updates`.
         *
         * @example
         *
         * ```ts
         * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
         * export interface Post {
         *   id: number
         *   name: string
         * }
         *
         * const api = createApi({
         *   baseQuery: fetchBaseQuery({
         *     baseUrl: '/',
         *   }),
         *   tagTypes: ['Post'],
         *   endpoints: (build) => ({
         *     getPost: build.query<Post, number>({
         *       query: (id) => `post/${id}`,
         *       providesTags: ['Post'],
         *     }),
         *     updatePost: build.mutation<void, Pick<Post, 'id'> & Partial<Post>>({
         *       query: ({ id, ...patch }) => ({
         *         url: `post/${id}`,
         *         method: 'PATCH',
         *         body: patch,
         *       }),
         *       invalidatesTags: ['Post'],
         *       async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
         *         const patchResult = dispatch(
         *           api.util.updateQueryData('getPost', id, (draft) => {
         *             Object.assign(draft, patch)
         *           })
         *         )
         *         try {
         *           await queryFulfilled
         *         } catch {
         *           patchResult.undo()
         *         }
         *       },
         *     }),
         *   }),
         * })
         * ```
         */
        onQueryStarted?(arg: QueryArg, api: MutationLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>): Promise<void> | void;
    }
    interface QueryLifecycleApi<QueryArg, BaseQuery extends BaseQueryFn, ResultType, ReducerPath extends string = string> extends QueryBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>, QueryLifecyclePromises<ResultType, BaseQuery> {
    }
    interface MutationLifecycleApi<QueryArg, BaseQuery extends BaseQueryFn, ResultType, ReducerPath extends string = string> extends MutationBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>, QueryLifecyclePromises<ResultType, BaseQuery> {
    }
}
export declare const buildQueryLifecycleHandler: InternalHandlerBuilder;
