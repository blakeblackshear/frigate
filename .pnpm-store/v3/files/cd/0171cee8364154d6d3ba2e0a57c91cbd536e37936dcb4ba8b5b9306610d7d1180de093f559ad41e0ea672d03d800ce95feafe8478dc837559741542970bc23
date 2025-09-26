var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = function (obj, key, value) { return key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value }) : obj[key] = value; };
var __spreadValues = function (a, b) {
    for (var prop in b || (b = {}))
        if (__hasOwnProp.call(b, prop))
            __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
        for (var _i = 0, _c = __getOwnPropSymbols(b); _i < _c.length; _i++) {
            var prop = _c[_i];
            if (__propIsEnum.call(b, prop))
                __defNormalProp(a, prop, b[prop]);
        }
    return a;
};
var __spreadProps = function (a, b) { return __defProps(a, __getOwnPropDescs(b)); };
// src/query/react/index.ts
import { coreModule, buildCreateApi } from "@reduxjs/toolkit/query";
// src/query/react/buildHooks.ts
import { createSelector } from "@reduxjs/toolkit";
import { useCallback, useDebugValue, useEffect as useEffect3, useLayoutEffect, useMemo as useMemo2, useRef as useRef3, useState } from "react";
import { QueryStatus, skipToken } from "@reduxjs/toolkit/query";
import { shallowEqual as shallowEqual2 } from "react-redux";
// src/query/react/useSerializedStableValue.ts
import { useEffect, useRef, useMemo } from "react";
function useStableQueryArgs(queryArgs, serialize, endpointDefinition, endpointName) {
    var incoming = useMemo(function () { return ({
        queryArgs: queryArgs,
        serialized: typeof queryArgs == "object" ? serialize({ queryArgs: queryArgs, endpointDefinition: endpointDefinition, endpointName: endpointName }) : queryArgs
    }); }, [queryArgs, serialize, endpointDefinition, endpointName]);
    var cache2 = useRef(incoming);
    useEffect(function () {
        if (cache2.current.serialized !== incoming.serialized) {
            cache2.current = incoming;
        }
    }, [incoming]);
    return cache2.current.serialized === incoming.serialized ? cache2.current.queryArgs : queryArgs;
}
// src/query/react/constants.ts
var UNINITIALIZED_VALUE = Symbol();
// src/query/react/useShallowStableValue.ts
import { useEffect as useEffect2, useRef as useRef2 } from "react";
import { shallowEqual } from "react-redux";
function useShallowStableValue(value) {
    var cache2 = useRef2(value);
    useEffect2(function () {
        if (!shallowEqual(cache2.current, value)) {
            cache2.current = value;
        }
    }, [value]);
    return shallowEqual(cache2.current, value) ? cache2.current : value;
}
// src/query/defaultSerializeQueryArgs.ts
import { isPlainObject } from "@reduxjs/toolkit";
var cache = WeakMap ? new WeakMap() : void 0;
var defaultSerializeQueryArgs = function (_c) {
    var endpointName = _c.endpointName, queryArgs = _c.queryArgs;
    var serialized = "";
    var cached = cache == null ? void 0 : cache.get(queryArgs);
    if (typeof cached === "string") {
        serialized = cached;
    }
    else {
        var stringified = JSON.stringify(queryArgs, function (key, value) { return isPlainObject(value) ? Object.keys(value).sort().reduce(function (acc, key2) {
            acc[key2] = value[key2];
            return acc;
        }, {}) : value; });
        if (isPlainObject(queryArgs)) {
            cache == null ? void 0 : cache.set(queryArgs, stringified);
        }
        serialized = stringified;
    }
    return endpointName + "(" + serialized + ")";
};
// src/query/react/buildHooks.ts
var useIsomorphicLayoutEffect = typeof window !== "undefined" && !!window.document && !!window.document.createElement ? useLayoutEffect : useEffect3;
var defaultMutationStateSelector = function (x) { return x; };
var noPendingQueryStateSelector = function (selected) {
    if (selected.isUninitialized) {
        return __spreadProps(__spreadValues({}, selected), {
            isUninitialized: false,
            isFetching: true,
            isLoading: selected.data !== void 0 ? false : true,
            status: QueryStatus.pending
        });
    }
    return selected;
};
function buildHooks(_c) {
    var api = _c.api, _d = _c.moduleOptions, batch = _d.batch, useDispatch = _d.useDispatch, useSelector = _d.useSelector, useStore = _d.useStore, unstable__sideEffectsInRender = _d.unstable__sideEffectsInRender, serializeQueryArgs = _c.serializeQueryArgs, context = _c.context;
    var usePossiblyImmediateEffect = unstable__sideEffectsInRender ? function (cb) { return cb(); } : useEffect3;
    return { buildQueryHooks: buildQueryHooks, buildMutationHook: buildMutationHook, usePrefetch: usePrefetch };
    function queryStatePreSelector(currentState, lastResult, queryArgs) {
        if ((lastResult == null ? void 0 : lastResult.endpointName) && currentState.isUninitialized) {
            var endpointName = lastResult.endpointName;
            var endpointDefinition = context.endpointDefinitions[endpointName];
            if (serializeQueryArgs({
                queryArgs: lastResult.originalArgs,
                endpointDefinition: endpointDefinition,
                endpointName: endpointName
            }) === serializeQueryArgs({
                queryArgs: queryArgs,
                endpointDefinition: endpointDefinition,
                endpointName: endpointName
            }))
                lastResult = void 0;
        }
        var data = currentState.isSuccess ? currentState.data : lastResult == null ? void 0 : lastResult.data;
        if (data === void 0)
            data = currentState.data;
        var hasData = data !== void 0;
        var isFetching = currentState.isLoading;
        var isLoading = !hasData && isFetching;
        var isSuccess = currentState.isSuccess || isFetching && hasData;
        return __spreadProps(__spreadValues({}, currentState), {
            data: data,
            currentData: currentState.data,
            isFetching: isFetching,
            isLoading: isLoading,
            isSuccess: isSuccess
        });
    }
    function usePrefetch(endpointName, defaultOptions) {
        var dispatch = useDispatch();
        var stableDefaultOptions = useShallowStableValue(defaultOptions);
        return useCallback(function (arg, options) { return dispatch(api.util.prefetch(endpointName, arg, __spreadValues(__spreadValues({}, stableDefaultOptions), options))); }, [endpointName, dispatch, stableDefaultOptions]);
    }
    function buildQueryHooks(name) {
        var useQuerySubscription = function (arg, _c) {
            var _d = _c === void 0 ? {} : _c, refetchOnReconnect = _d.refetchOnReconnect, refetchOnFocus = _d.refetchOnFocus, refetchOnMountOrArgChange = _d.refetchOnMountOrArgChange, _e = _d.skip, skip = _e === void 0 ? false : _e, _f = _d.pollingInterval, pollingInterval = _f === void 0 ? 0 : _f;
            var initiate = api.endpoints[name].initiate;
            var dispatch = useDispatch();
            var stableArg = useStableQueryArgs(skip ? skipToken : arg, defaultSerializeQueryArgs, context.endpointDefinitions[name], name);
            var stableSubscriptionOptions = useShallowStableValue({
                refetchOnReconnect: refetchOnReconnect,
                refetchOnFocus: refetchOnFocus,
                pollingInterval: pollingInterval
            });
            var lastRenderHadSubscription = useRef3(false);
            var promiseRef = useRef3();
            var _g = promiseRef.current || {}, queryCacheKey = _g.queryCacheKey, requestId = _g.requestId;
            var currentRenderHasSubscription = false;
            if (queryCacheKey && requestId) {
                var returnedValue = dispatch(api.internalActions.internal_probeSubscription({
                    queryCacheKey: queryCacheKey,
                    requestId: requestId
                }));
                if (process.env.NODE_ENV !== "production") {
                    if (typeof returnedValue !== "boolean") {
                        throw new Error("Warning: Middleware for RTK-Query API at reducerPath \"" + api.reducerPath + "\" has not been added to the store.\n    You must add the middleware for RTK-Query to function correctly!");
                    }
                }
                currentRenderHasSubscription = !!returnedValue;
            }
            var subscriptionRemoved = !currentRenderHasSubscription && lastRenderHadSubscription.current;
            usePossiblyImmediateEffect(function () {
                lastRenderHadSubscription.current = currentRenderHasSubscription;
            });
            usePossiblyImmediateEffect(function () {
                if (subscriptionRemoved) {
                    promiseRef.current = void 0;
                }
            }, [subscriptionRemoved]);
            usePossiblyImmediateEffect(function () {
                var _a;
                var lastPromise = promiseRef.current;
                if (typeof process !== "undefined" && process.env.NODE_ENV === "removeMeOnCompilation") {
                    console.log(subscriptionRemoved);
                }
                if (stableArg === skipToken) {
                    lastPromise == null ? void 0 : lastPromise.unsubscribe();
                    promiseRef.current = void 0;
                    return;
                }
                var lastSubscriptionOptions = (_a = promiseRef.current) == null ? void 0 : _a.subscriptionOptions;
                if (!lastPromise || lastPromise.arg !== stableArg) {
                    lastPromise == null ? void 0 : lastPromise.unsubscribe();
                    var promise = dispatch(initiate(stableArg, {
                        subscriptionOptions: stableSubscriptionOptions,
                        forceRefetch: refetchOnMountOrArgChange
                    }));
                    promiseRef.current = promise;
                }
                else if (stableSubscriptionOptions !== lastSubscriptionOptions) {
                    lastPromise.updateSubscriptionOptions(stableSubscriptionOptions);
                }
            }, [
                dispatch,
                initiate,
                refetchOnMountOrArgChange,
                stableArg,
                stableSubscriptionOptions,
                subscriptionRemoved
            ]);
            useEffect3(function () {
                return function () {
                    var _a;
                    (_a = promiseRef.current) == null ? void 0 : _a.unsubscribe();
                    promiseRef.current = void 0;
                };
            }, []);
            return useMemo2(function () { return ({
                refetch: function () {
                    var _a;
                    if (!promiseRef.current)
                        throw new Error("Cannot refetch a query that has not been started yet.");
                    return (_a = promiseRef.current) == null ? void 0 : _a.refetch();
                }
            }); }, []);
        };
        var useLazyQuerySubscription = function (_c) {
            var _d = _c === void 0 ? {} : _c, refetchOnReconnect = _d.refetchOnReconnect, refetchOnFocus = _d.refetchOnFocus, _e = _d.pollingInterval, pollingInterval = _e === void 0 ? 0 : _e;
            var initiate = api.endpoints[name].initiate;
            var dispatch = useDispatch();
            var _f = useState(UNINITIALIZED_VALUE), arg = _f[0], setArg = _f[1];
            var promiseRef = useRef3();
            var stableSubscriptionOptions = useShallowStableValue({
                refetchOnReconnect: refetchOnReconnect,
                refetchOnFocus: refetchOnFocus,
                pollingInterval: pollingInterval
            });
            usePossiblyImmediateEffect(function () {
                var _a, _b;
                var lastSubscriptionOptions = (_a = promiseRef.current) == null ? void 0 : _a.subscriptionOptions;
                if (stableSubscriptionOptions !== lastSubscriptionOptions) {
                    (_b = promiseRef.current) == null ? void 0 : _b.updateSubscriptionOptions(stableSubscriptionOptions);
                }
            }, [stableSubscriptionOptions]);
            var subscriptionOptionsRef = useRef3(stableSubscriptionOptions);
            usePossiblyImmediateEffect(function () {
                subscriptionOptionsRef.current = stableSubscriptionOptions;
            }, [stableSubscriptionOptions]);
            var trigger = useCallback(function (arg2, preferCacheValue) {
                if (preferCacheValue === void 0) { preferCacheValue = false; }
                var promise;
                batch(function () {
                    var _a;
                    (_a = promiseRef.current) == null ? void 0 : _a.unsubscribe();
                    promiseRef.current = promise = dispatch(initiate(arg2, {
                        subscriptionOptions: subscriptionOptionsRef.current,
                        forceRefetch: !preferCacheValue
                    }));
                    setArg(arg2);
                });
                return promise;
            }, [dispatch, initiate]);
            useEffect3(function () {
                return function () {
                    var _a;
                    (_a = promiseRef == null ? void 0 : promiseRef.current) == null ? void 0 : _a.unsubscribe();
                };
            }, []);
            useEffect3(function () {
                if (arg !== UNINITIALIZED_VALUE && !promiseRef.current) {
                    trigger(arg, true);
                }
            }, [arg, trigger]);
            return useMemo2(function () { return [trigger, arg]; }, [trigger, arg]);
        };
        var useQueryState = function (arg, _c) {
            var _d = _c === void 0 ? {} : _c, _e = _d.skip, skip = _e === void 0 ? false : _e, selectFromResult = _d.selectFromResult;
            var select = api.endpoints[name].select;
            var stableArg = useStableQueryArgs(skip ? skipToken : arg, serializeQueryArgs, context.endpointDefinitions[name], name);
            var lastValue = useRef3();
            var selectDefaultResult = useMemo2(function () { return createSelector([
                select(stableArg),
                function (_, lastResult) { return lastResult; },
                function (_) { return stableArg; }
            ], queryStatePreSelector); }, [select, stableArg]);
            var querySelector = useMemo2(function () { return selectFromResult ? createSelector([selectDefaultResult], selectFromResult) : selectDefaultResult; }, [selectDefaultResult, selectFromResult]);
            var currentState = useSelector(function (state) { return querySelector(state, lastValue.current); }, shallowEqual2);
            var store = useStore();
            var newLastValue = selectDefaultResult(store.getState(), lastValue.current);
            useIsomorphicLayoutEffect(function () {
                lastValue.current = newLastValue;
            }, [newLastValue]);
            return currentState;
        };
        return {
            useQueryState: useQueryState,
            useQuerySubscription: useQuerySubscription,
            useLazyQuerySubscription: useLazyQuerySubscription,
            useLazyQuery: function (options) {
                var _c = useLazyQuerySubscription(options), trigger = _c[0], arg = _c[1];
                var queryStateResults = useQueryState(arg, __spreadProps(__spreadValues({}, options), {
                    skip: arg === UNINITIALIZED_VALUE
                }));
                var info = useMemo2(function () { return ({ lastArg: arg }); }, [arg]);
                return useMemo2(function () { return [trigger, queryStateResults, info]; }, [trigger, queryStateResults, info]);
            },
            useQuery: function (arg, options) {
                var querySubscriptionResults = useQuerySubscription(arg, options);
                var queryStateResults = useQueryState(arg, __spreadValues({
                    selectFromResult: arg === skipToken || (options == null ? void 0 : options.skip) ? void 0 : noPendingQueryStateSelector
                }, options));
                var data = queryStateResults.data, status = queryStateResults.status, isLoading = queryStateResults.isLoading, isSuccess = queryStateResults.isSuccess, isError = queryStateResults.isError, error = queryStateResults.error;
                useDebugValue({ data: data, status: status, isLoading: isLoading, isSuccess: isSuccess, isError: isError, error: error });
                return useMemo2(function () { return __spreadValues(__spreadValues({}, queryStateResults), querySubscriptionResults); }, [queryStateResults, querySubscriptionResults]);
            }
        };
    }
    function buildMutationHook(name) {
        return function (_c) {
            var _d = _c === void 0 ? {} : _c, _e = _d.selectFromResult, selectFromResult = _e === void 0 ? defaultMutationStateSelector : _e, fixedCacheKey = _d.fixedCacheKey;
            var _f = api.endpoints[name], select = _f.select, initiate = _f.initiate;
            var dispatch = useDispatch();
            var _g = useState(), promise = _g[0], setPromise = _g[1];
            useEffect3(function () { return function () {
                if (!(promise == null ? void 0 : promise.arg.fixedCacheKey)) {
                    promise == null ? void 0 : promise.reset();
                }
            }; }, [promise]);
            var triggerMutation = useCallback(function (arg) {
                var promise2 = dispatch(initiate(arg, { fixedCacheKey: fixedCacheKey }));
                setPromise(promise2);
                return promise2;
            }, [dispatch, initiate, fixedCacheKey]);
            var requestId = (promise || {}).requestId;
            var mutationSelector = useMemo2(function () { return createSelector([select({ fixedCacheKey: fixedCacheKey, requestId: promise == null ? void 0 : promise.requestId })], selectFromResult); }, [select, promise, selectFromResult, fixedCacheKey]);
            var currentState = useSelector(mutationSelector, shallowEqual2);
            var originalArgs = fixedCacheKey == null ? promise == null ? void 0 : promise.arg.originalArgs : void 0;
            var reset = useCallback(function () {
                batch(function () {
                    if (promise) {
                        setPromise(void 0);
                    }
                    if (fixedCacheKey) {
                        dispatch(api.internalActions.removeMutationResult({
                            requestId: requestId,
                            fixedCacheKey: fixedCacheKey
                        }));
                    }
                });
            }, [dispatch, fixedCacheKey, promise, requestId]);
            var endpointName = currentState.endpointName, data = currentState.data, status = currentState.status, isLoading = currentState.isLoading, isSuccess = currentState.isSuccess, isError = currentState.isError, error = currentState.error;
            useDebugValue({
                endpointName: endpointName,
                data: data,
                status: status,
                isLoading: isLoading,
                isSuccess: isSuccess,
                isError: isError,
                error: error
            });
            var finalState = useMemo2(function () { return __spreadProps(__spreadValues({}, currentState), { originalArgs: originalArgs, reset: reset }); }, [currentState, originalArgs, reset]);
            return useMemo2(function () { return [triggerMutation, finalState]; }, [triggerMutation, finalState]);
        };
    }
}
// src/query/endpointDefinitions.ts
var DefinitionType;
(function (DefinitionType2) {
    DefinitionType2["query"] = "query";
    DefinitionType2["mutation"] = "mutation";
})(DefinitionType || (DefinitionType = {}));
function isQueryDefinition(e) {
    return e.type === DefinitionType.query;
}
function isMutationDefinition(e) {
    return e.type === DefinitionType.mutation;
}
// src/query/utils/capitalize.ts
function capitalize(str) {
    return str.replace(str[0], str[0].toUpperCase());
}
// src/query/tsHelpers.ts
function safeAssign(target) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    Object.assign.apply(Object, __spreadArray([target], args));
}
// src/query/react/module.ts
import { useDispatch as rrUseDispatch, useSelector as rrUseSelector, useStore as rrUseStore, batch as rrBatch } from "react-redux";
var reactHooksModuleName = /* @__PURE__ */ Symbol();
var reactHooksModule = function (_c) {
    var _d = _c === void 0 ? {} : _c, _e = _d.batch, batch = _e === void 0 ? rrBatch : _e, _f = _d.useDispatch, useDispatch = _f === void 0 ? rrUseDispatch : _f, _g = _d.useSelector, useSelector = _g === void 0 ? rrUseSelector : _g, _h = _d.useStore, useStore = _h === void 0 ? rrUseStore : _h, _j = _d.unstable__sideEffectsInRender, unstable__sideEffectsInRender = _j === void 0 ? false : _j;
    return ({
        name: reactHooksModuleName,
        init: function (api, _c, context) {
            var serializeQueryArgs = _c.serializeQueryArgs;
            var anyApi = api;
            var _d = buildHooks({
                api: api,
                moduleOptions: {
                    batch: batch,
                    useDispatch: useDispatch,
                    useSelector: useSelector,
                    useStore: useStore,
                    unstable__sideEffectsInRender: unstable__sideEffectsInRender
                },
                serializeQueryArgs: serializeQueryArgs,
                context: context
            }), buildQueryHooks = _d.buildQueryHooks, buildMutationHook = _d.buildMutationHook, usePrefetch = _d.usePrefetch;
            safeAssign(anyApi, { usePrefetch: usePrefetch });
            safeAssign(context, { batch: batch });
            return {
                injectEndpoint: function (endpointName, definition) {
                    if (isQueryDefinition(definition)) {
                        var _c = buildQueryHooks(endpointName), useQuery = _c.useQuery, useLazyQuery = _c.useLazyQuery, useLazyQuerySubscription = _c.useLazyQuerySubscription, useQueryState = _c.useQueryState, useQuerySubscription = _c.useQuerySubscription;
                        safeAssign(anyApi.endpoints[endpointName], {
                            useQuery: useQuery,
                            useLazyQuery: useLazyQuery,
                            useLazyQuerySubscription: useLazyQuerySubscription,
                            useQueryState: useQueryState,
                            useQuerySubscription: useQuerySubscription
                        });
                        api["use" + capitalize(endpointName) + "Query"] = useQuery;
                        api["useLazy" + capitalize(endpointName) + "Query"] = useLazyQuery;
                    }
                    else if (isMutationDefinition(definition)) {
                        var useMutation = buildMutationHook(endpointName);
                        safeAssign(anyApi.endpoints[endpointName], {
                            useMutation: useMutation
                        });
                        api["use" + capitalize(endpointName) + "Mutation"] = useMutation;
                    }
                }
            };
        }
    });
};
// src/query/react/index.ts
export * from "@reduxjs/toolkit/query";
// src/query/react/ApiProvider.tsx
import { configureStore } from "@reduxjs/toolkit";
import { useEffect as useEffect4 } from "react";
import React from "react";
import { Provider } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";
function ApiProvider(props) {
    var store = React.useState(function () {
        var _c;
        return configureStore({
            reducer: (_c = {},
                _c[props.api.reducerPath] = props.api.reducer,
                _c),
            middleware: function (gDM) { return gDM().concat(props.api.middleware); }
        });
    })[0];
    useEffect4(function () { return props.setupListeners === false ? void 0 : setupListeners(store.dispatch, props.setupListeners); }, [props.setupListeners, store.dispatch]);
    return /* @__PURE__ */ React.createElement(Provider, {
        store: store,
        context: props.context
    }, props.children);
}
// src/query/react/index.ts
var createApi = /* @__PURE__ */ buildCreateApi(coreModule(), reactHooksModule());
export { ApiProvider, createApi, reactHooksModule, reactHooksModuleName };
//# sourceMappingURL=rtk-query-react.esm.js.map