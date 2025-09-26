import { Key, SWRHook, SWRConfiguration, FullConfiguration } from '../_internal/index.js';
export { Arguments, BareFetcher, Cache, Fetcher, Key, KeyLoader, KeyedMutator, Middleware, MutatorCallback, MutatorOptions, Revalidator, RevalidatorOptions, SWRConfiguration, SWRHook, SWRResponse, ScopedMutator, State, mutate, preload, useSWRConfig } from '../_internal/index.js';
import React from 'react';

declare const unstable_serialize: (key: Key) => string;

declare const SWRConfig: React.FC<React.PropsWithChildren<{
    value?: SWRConfiguration | ((parentConfig?: SWRConfiguration | undefined) => SWRConfiguration) | undefined;
}>> & {
    defaultValue: FullConfiguration;
};

/**
 * A hook to fetch data.
 *
 * @link https://swr.vercel.app
 * @example
 * ```jsx
 * import useSWR from 'swr'
 * function Profile() {
 *   const { data, error, isLoading } = useSWR('/api/user', fetcher)
 *   if (error) return <div>failed to load</div>
 *   if (isLoading) return <div>loading...</div>
 *   return <div>hello {data.name}!</div>
 * }
 * ```
 */
declare const useSWR: SWRHook;

interface SWRGlobalConfig {
}

export { SWRConfig, type SWRGlobalConfig, useSWR as default, unstable_serialize };
