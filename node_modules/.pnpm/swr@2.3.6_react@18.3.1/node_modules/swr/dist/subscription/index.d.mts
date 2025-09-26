import { Key, MutatorCallback, SWRConfiguration, Middleware } from '../index/index.mjs';

type SWRSubscriptionOptions<Data = any, Error = any> = {
    next: (err?: Error | null, data?: Data | MutatorCallback<Data>) => void;
};
type SWRSubscription<SWRSubKey extends Key = Key, Data = any, Error = any> = SWRSubKey extends () => infer Arg | null | undefined | false ? (key: Arg, { next }: SWRSubscriptionOptions<Data, Error>) => void : SWRSubKey extends null | undefined | false ? never : SWRSubKey extends infer Arg ? (key: Arg, { next }: SWRSubscriptionOptions<Data, Error>) => void : never;
type SWRSubscriptionResponse<Data = any, Error = any> = {
    data?: Data;
    error?: Error;
};
type SWRSubscriptionHook = <Data = any, Error = any, SWRSubKey extends Key = Key>(key: SWRSubKey, subscribe: SWRSubscription<SWRSubKey, Data, Error>, config?: SWRConfiguration) => SWRSubscriptionResponse<Data, Error>;

declare const subscription: Middleware;
/**
 * A hook to subscribe a SWR resource to an external data source for continuous updates.
 * @experimental This API is experimental and might change in the future.
 * @example
 * ```jsx
 * import useSWRSubscription from 'swr/subscription'
 *
 * const { data, error } = useSWRSubscription(key, (key, { next }) => {
 *   const unsubscribe = dataSource.subscribe(key, (err, data) => {
 *     next(err, data)
 *   })
 *   return unsubscribe
 * })
 * ```
 */
declare const useSWRSubscription: SWRSubscriptionHook;

export { type SWRSubscription, type SWRSubscriptionHook, type SWRSubscriptionOptions, type SWRSubscriptionResponse, useSWRSubscription as default, subscription };
