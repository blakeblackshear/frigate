import { i as isWindowDefined, a as isFunction, S as SWRConfigContext, m as mergeObjects, d as defaultConfig, s as serialize, b as SWRGlobalState, c as cache, e as isUndefined, f as mergeConfigs } from './config-context-client-BoS53ST9.mjs';
export { I as IS_REACT_LEGACY, r as IS_SERVER, O as OBJECT, g as SWRConfig, U as UNDEFINED, k as compare, z as createCacheHelper, q as defaultConfigOptions, o as getTimestamp, y as hasRequestAnimationFrame, h as initCache, n as internalMutate, w as isDocumentDefined, x as isLegacyDeno, B as isPromiseLike, j as mutate, A as noop, p as preset, t as rAF, v as slowConnection, l as stableHash, u as useIsomorphicLayoutEffect } from './config-context-client-BoS53ST9.mjs';
import * as revalidateEvents from './events.mjs';
export { revalidateEvents };
import { INFINITE_PREFIX } from './constants.mjs';
export { INFINITE_PREFIX } from './constants.mjs';
import React, { useContext, useMemo } from 'react';
export * from './types.mjs';

// @ts-expect-error
const enableDevtools = isWindowDefined && window.__SWR_DEVTOOLS_USE__;
const use = enableDevtools ? window.__SWR_DEVTOOLS_USE__ : [];
const setupDevTools = ()=>{
    if (enableDevtools) {
        // @ts-expect-error
        window.__SWR_DEVTOOLS_REACT__ = React;
    }
};

const normalize = (args)=>{
    return isFunction(args[1]) ? [
        args[0],
        args[1],
        args[2] || {}
    ] : [
        args[0],
        null,
        (args[1] === null ? args[2] : args[1]) || {}
    ];
};

const useSWRConfig = ()=>{
    const parentConfig = useContext(SWRConfigContext);
    const mergedConfig = useMemo(()=>mergeObjects(defaultConfig, parentConfig), [
        parentConfig
    ]);
    return mergedConfig;
};

const preload = (key_, fetcher)=>{
    const [key, fnArg] = serialize(key_);
    const [, , , PRELOAD] = SWRGlobalState.get(cache);
    // Prevent preload to be called multiple times before used.
    if (PRELOAD[key]) return PRELOAD[key];
    const req = fetcher(fnArg);
    PRELOAD[key] = req;
    return req;
};
const middleware = (useSWRNext)=>(key_, fetcher_, config)=>{
        // fetcher might be a sync function, so this should not be an async function
        const fetcher = fetcher_ && ((...args)=>{
            const [key] = serialize(key_);
            const [, , , PRELOAD] = SWRGlobalState.get(cache);
            if (key.startsWith(INFINITE_PREFIX)) {
                // we want the infinite fetcher to be called.
                // handling of the PRELOAD cache happens there.
                return fetcher_(...args);
            }
            const req = PRELOAD[key];
            if (isUndefined(req)) return fetcher_(...args);
            delete PRELOAD[key];
            return req;
        });
        return useSWRNext(key_, fetcher, config);
    };

const BUILT_IN_MIDDLEWARE = use.concat(middleware);

// It's tricky to pass generic types as parameters, so we just directly override
// the types here.
const withArgs = (hook)=>{
    return function useSWRArgs(...args) {
        // Get the default and inherited configuration.
        const fallbackConfig = useSWRConfig();
        // Normalize arguments.
        const [key, fn, _config] = normalize(args);
        // Merge configurations.
        const config = mergeConfigs(fallbackConfig, _config);
        // Apply middleware
        let next = hook;
        const { use } = config;
        const middleware = (use || []).concat(BUILT_IN_MIDDLEWARE);
        for(let i = middleware.length; i--;){
            next = middleware[i](next);
        }
        return next(key, fn || config.fetcher || null, config);
    };
};

// Add a callback function to a list of keyed callback functions and return
// the unsubscribe function.
const subscribeCallback = (key, callbacks, callback)=>{
    const keyedRevalidators = callbacks[key] || (callbacks[key] = []);
    keyedRevalidators.push(callback);
    return ()=>{
        const index = keyedRevalidators.indexOf(callback);
        if (index >= 0) {
            // O(1): faster than splice
            keyedRevalidators[index] = keyedRevalidators[keyedRevalidators.length - 1];
            keyedRevalidators.pop();
        }
    };
};

// Create a custom hook with a middleware
const withMiddleware = (useSWR, middleware)=>{
    return (...args)=>{
        const [key, fn, config] = normalize(args);
        const uses = (config.use || []).concat(middleware);
        return useSWR(key, fn, {
            ...config,
            use: uses
        });
    };
};

setupDevTools();

export { SWRGlobalState, cache, defaultConfig, isFunction, isUndefined, isWindowDefined, mergeConfigs, mergeObjects, normalize, preload, serialize, subscribeCallback, useSWRConfig, withArgs, withMiddleware };
