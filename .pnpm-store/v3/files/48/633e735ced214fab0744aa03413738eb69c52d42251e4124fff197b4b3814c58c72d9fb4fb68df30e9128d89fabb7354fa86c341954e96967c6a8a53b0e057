Object.defineProperty(exports, '__esModule', { value: true });

var useSWR = require('../index/index.js');
var index_js = require('../_internal/index.js');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var useSWR__default = /*#__PURE__*/_interopDefault(useSWR);

const subscriptionStorage = new WeakMap();
const SUBSCRIPTION_PREFIX = '$sub$';
const subscription = (useSWRNext)=>(_key, subscribe, config)=>{
        const [key, args] = index_js.serialize(_key);
        // Prefix the key to avoid conflicts with other SWR resources.
        const subscriptionKey = key ? SUBSCRIPTION_PREFIX + key : undefined;
        const swr = useSWRNext(subscriptionKey, null, config);
        const { cache } = config;
        // Ensure that the subscription state is scoped by the cache boundary, so
        // you can have multiple SWR zones with subscriptions having the same key.
        if (!subscriptionStorage.has(cache)) {
            subscriptionStorage.set(cache, [
                new Map(),
                new Map()
            ]);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [subscriptions, disposers] = subscriptionStorage.get(cache);
        index_js.useIsomorphicLayoutEffect(()=>{
            if (!subscriptionKey) return;
            const [, set] = index_js.createCacheHelper(cache, subscriptionKey);
            const refCount = subscriptions.get(subscriptionKey) || 0;
            const next = (error, data)=>{
                if (error !== null && typeof error !== 'undefined') {
                    set({
                        error
                    });
                } else {
                    set({
                        error: undefined
                    });
                    swr.mutate(data, false);
                }
            };
            // Increment the ref count.
            subscriptions.set(subscriptionKey, refCount + 1);
            if (!refCount) {
                const dispose = subscribe(args, {
                    next
                });
                if (typeof dispose !== 'function') {
                    throw new Error('The `subscribe` function must return a function to unsubscribe.');
                }
                disposers.set(subscriptionKey, dispose);
            }
            return ()=>{
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const count = subscriptions.get(subscriptionKey) - 1;
                subscriptions.set(subscriptionKey, count);
                // Dispose if it's the last one.
                if (!count) {
                    const dispose = disposers.get(subscriptionKey);
                    dispose == null ? undefined : dispose();
                }
            };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
            subscriptionKey
        ]);
        return {
            get data () {
                return swr.data;
            },
            get error () {
                return swr.error;
            }
        };
    };
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
 */ const useSWRSubscription = index_js.withMiddleware(useSWR__default.default, subscription);

exports.default = useSWRSubscription;
exports.subscription = subscription;
