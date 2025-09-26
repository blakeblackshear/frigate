import type { MutationSubState, QuerySubState, RootState as _RootState, RequestStatusFlags, QueryCacheKey } from './apiState';
import type { EndpointDefinitions, QueryDefinition, MutationDefinition, QueryArgFrom, TagTypesFrom, ReducerPathFrom, TagDescription } from '../endpointDefinitions';
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs';
export declare type SkipToken = typeof skipToken;
/**
 * Can be passed into `useQuery`, `useQueryState` or `useQuerySubscription`
 * instead of the query argument to get the same effect as if setting
 * `skip: true` in the query options.
 *
 * Useful for scenarios where a query should be skipped when `arg` is `undefined`
 * and TypeScript complains about it because `arg` is not allowed to be passed
 * in as `undefined`, such as
 *
 * ```ts
 * // codeblock-meta title="will error if the query argument is not allowed to be undefined" no-transpile
 * useSomeQuery(arg, { skip: !!arg })
 * ```
 *
 * ```ts
 * // codeblock-meta title="using skipToken instead" no-transpile
 * useSomeQuery(arg ?? skipToken)
 * ```
 *
 * If passed directly into a query or mutation selector, that selector will always
 * return an uninitialized state.
 */
export declare const skipToken: unique symbol;
/** @deprecated renamed to `skipToken` */
export declare const skipSelector: symbol;
declare module './module' {
    interface ApiEndpointQuery<Definition extends QueryDefinition<any, any, any, any, any>, Definitions extends EndpointDefinitions> {
        select: QueryResultSelectorFactory<Definition, _RootState<Definitions, TagTypesFrom<Definition>, ReducerPathFrom<Definition>>>;
    }
    interface ApiEndpointMutation<Definition extends MutationDefinition<any, any, any, any, any>, Definitions extends EndpointDefinitions> {
        select: MutationResultSelectorFactory<Definition, _RootState<Definitions, TagTypesFrom<Definition>, ReducerPathFrom<Definition>>>;
    }
}
declare type QueryResultSelectorFactory<Definition extends QueryDefinition<any, any, any, any>, RootState> = (queryArg: QueryArgFrom<Definition> | SkipToken) => (state: RootState) => QueryResultSelectorResult<Definition>;
export declare type QueryResultSelectorResult<Definition extends QueryDefinition<any, any, any, any>> = QuerySubState<Definition> & RequestStatusFlags;
declare type MutationResultSelectorFactory<Definition extends MutationDefinition<any, any, any, any>, RootState> = (requestId: string | {
    requestId: string | undefined;
    fixedCacheKey: string | undefined;
} | SkipToken) => (state: RootState) => MutationResultSelectorResult<Definition>;
export declare type MutationResultSelectorResult<Definition extends MutationDefinition<any, any, any, any>> = MutationSubState<Definition> & RequestStatusFlags;
export declare function buildSelectors<Definitions extends EndpointDefinitions, ReducerPath extends string>({ serializeQueryArgs, reducerPath, }: {
    serializeQueryArgs: InternalSerializeQueryArgs;
    reducerPath: ReducerPath;
}): {
    buildQuerySelector: (endpointName: string, endpointDefinition: QueryDefinition<any, any, any, any>) => QueryResultSelectorFactory<any, {
        [x: string]: import("./apiState").CombinedState<Definitions, string, string>;
    }>;
    buildMutationSelector: () => MutationResultSelectorFactory<any, {
        [x: string]: import("./apiState").CombinedState<Definitions, string, string>;
    }>;
    selectInvalidatedBy: (state: {
        [x: string]: import("./apiState").CombinedState<Definitions, string, string>;
    }, tags: ReadonlyArray<TagDescription<string>>) => Array<{
        endpointName: string;
        originalArgs: any;
        queryCacheKey: QueryCacheKey;
    }>;
};
export {};
