import type { AnyAction } from '@reduxjs/toolkit';
import type { CombinedState as CombinedQueryState, QuerySubstateIdentifier, MutationSubstateIdentifier, Subscribers, QueryCacheKey, ConfigState } from './apiState';
import type { MutationThunk, QueryThunk } from './buildThunks';
import type { AssertTagTypes, EndpointDefinitions, FullTagDescription } from '../endpointDefinitions';
import type { Patch } from 'immer';
import type { ApiContext } from '../apiTypes';
export declare function getMutationCacheKey(id: MutationSubstateIdentifier | {
    requestId: string;
    arg: {
        fixedCacheKey?: string | undefined;
    };
}): string;
export declare function getMutationCacheKey(id: {
    fixedCacheKey?: string;
    requestId?: string;
}): string | undefined;
export declare function buildSlice({ reducerPath, queryThunk, mutationThunk, context: { endpointDefinitions: definitions, apiUid, extractRehydrationInfo, hasRehydrationInfo, }, assertTagType, config, }: {
    reducerPath: string;
    queryThunk: QueryThunk;
    mutationThunk: MutationThunk;
    context: ApiContext<EndpointDefinitions>;
    assertTagType: AssertTagTypes;
    config: Omit<ConfigState<string>, 'online' | 'focused' | 'middlewareRegistered'>;
}): {
    reducer: import("redux").Reducer<import("redux").CombinedState<CombinedQueryState<any, string, string>>, AnyAction>;
    actions: {
        /** @deprecated has been renamed to `removeMutationResult` */
        unsubscribeMutationResult: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[payload: MutationSubstateIdentifier], MutationSubstateIdentifier, `${string}/removeMutationResult`, never, unknown>;
        resetApiState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
        updateProvidedBy: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[payload: {
            queryCacheKey: QueryCacheKey;
            providedTags: readonly FullTagDescription<string>[];
        }], {
            queryCacheKey: QueryCacheKey;
            providedTags: readonly FullTagDescription<string>[];
        }, `${string}/updateProvidedBy`, never, unknown>;
        removeMutationResult: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[payload: MutationSubstateIdentifier], MutationSubstateIdentifier, `${string}/removeMutationResult`, never, unknown>;
        subscriptionsUpdated: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[payload: Patch[]], Patch[], `${string}/subscriptionsUpdated`, never, unknown>;
        updateSubscriptionOptions: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
            endpointName: string;
            requestId: string;
            options: Subscribers[number];
        } & QuerySubstateIdentifier, `${string}/updateSubscriptionOptions`>;
        unsubscribeQueryResult: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
            requestId: string;
        } & QuerySubstateIdentifier, `${string}/unsubscribeQueryResult`>;
        internal_probeSubscription: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
            queryCacheKey: string;
            requestId: string;
        }, `${string}/internal_probeSubscription`>;
        removeQueryResult: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[payload: QuerySubstateIdentifier], QuerySubstateIdentifier, `${string}/removeQueryResult`, never, unknown>;
        queryResultPatched: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[payload: QuerySubstateIdentifier & {
            patches: readonly Patch[];
        }], QuerySubstateIdentifier & {
            patches: readonly Patch[];
        }, `${string}/queryResultPatched`, never, unknown>;
        middlewareRegistered: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, `${string}/middlewareRegistered`>;
    };
};
export declare type SliceActions = ReturnType<typeof buildSlice>['actions'];
