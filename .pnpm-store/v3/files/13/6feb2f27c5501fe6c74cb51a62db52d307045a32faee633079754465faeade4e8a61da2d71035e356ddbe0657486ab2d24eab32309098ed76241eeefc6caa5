var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
        if (__hasOwnProp.call(b, prop))
            __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
        for (var prop of __getOwnPropSymbols(b)) {
            if (__propIsEnum.call(b, prop))
                __defNormalProp(a, prop, b[prop]);
        }
    return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
        if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
            target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
        for (var prop of __getOwnPropSymbols(source)) {
            if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
                target[prop] = source[prop];
        }
    return target;
};
// src/query/core/apiState.ts
var QueryStatus;
(function (QueryStatus2) {
    QueryStatus2["uninitialized"] = "uninitialized";
    QueryStatus2["pending"] = "pending";
    QueryStatus2["fulfilled"] = "fulfilled";
    QueryStatus2["rejected"] = "rejected";
})(QueryStatus || (QueryStatus = {}));
function getRequestStatusFlags(status) {
    return {
        status,
        isUninitialized: status === QueryStatus.uninitialized,
        isLoading: status === QueryStatus.pending,
        isSuccess: status === QueryStatus.fulfilled,
        isError: status === QueryStatus.rejected
    };
}
// src/query/utils/isAbsoluteUrl.ts
function isAbsoluteUrl(url) {
    return new RegExp(`(^|:)//`).test(url);
}
// src/query/utils/joinUrls.ts
var withoutTrailingSlash = (url) => url.replace(/\/$/, "");
var withoutLeadingSlash = (url) => url.replace(/^\//, "");
function joinUrls(base, url) {
    if (!base) {
        return url;
    }
    if (!url) {
        return base;
    }
    if (isAbsoluteUrl(url)) {
        return url;
    }
    const delimiter = base.endsWith("/") || !url.startsWith("?") ? "/" : "";
    base = withoutTrailingSlash(base);
    url = withoutLeadingSlash(url);
    return `${base}${delimiter}${url}`;
}
// src/query/utils/flatten.ts
var flatten = (arr) => [].concat(...arr);
// src/query/utils/isOnline.ts
function isOnline() {
    return typeof navigator === "undefined" ? true : navigator.onLine === void 0 ? true : navigator.onLine;
}
// src/query/utils/isDocumentVisible.ts
function isDocumentVisible() {
    if (typeof document === "undefined") {
        return true;
    }
    return document.visibilityState !== "hidden";
}
// src/query/utils/copyWithStructuralSharing.ts
import { isPlainObject as _iPO } from "@reduxjs/toolkit";
var isPlainObject = _iPO;
function copyWithStructuralSharing(oldObj, newObj) {
    if (oldObj === newObj || !(isPlainObject(oldObj) && isPlainObject(newObj) || Array.isArray(oldObj) && Array.isArray(newObj))) {
        return newObj;
    }
    const newKeys = Object.keys(newObj);
    const oldKeys = Object.keys(oldObj);
    let isSameObject = newKeys.length === oldKeys.length;
    const mergeObj = Array.isArray(newObj) ? [] : {};
    for (const key of newKeys) {
        mergeObj[key] = copyWithStructuralSharing(oldObj[key], newObj[key]);
        if (isSameObject)
            isSameObject = oldObj[key] === mergeObj[key];
    }
    return isSameObject ? oldObj : mergeObj;
}
// src/query/fetchBaseQuery.ts
import { isPlainObject as isPlainObject2 } from "@reduxjs/toolkit";
var defaultFetchFn = (...args) => fetch(...args);
var defaultValidateStatus = (response) => response.status >= 200 && response.status <= 299;
var defaultIsJsonContentType = (headers) => /ion\/(vnd\.api\+)?json/.test(headers.get("content-type") || "");
function stripUndefined(obj) {
    if (!isPlainObject2(obj)) {
        return obj;
    }
    const copy = __spreadValues({}, obj);
    for (const [k, v] of Object.entries(copy)) {
        if (v === void 0)
            delete copy[k];
    }
    return copy;
}
function fetchBaseQuery(_a = {}) {
    var _b = _a, { baseUrl, prepareHeaders = (x) => x, fetchFn = defaultFetchFn, paramsSerializer, isJsonContentType = defaultIsJsonContentType, jsonContentType = "application/json", jsonReplacer, timeout: defaultTimeout, responseHandler: globalResponseHandler, validateStatus: globalValidateStatus } = _b, baseFetchOptions = __objRest(_b, [
        "baseUrl",
        "prepareHeaders",
        "fetchFn",
        "paramsSerializer",
        "isJsonContentType",
        "jsonContentType",
        "jsonReplacer",
        "timeout",
        "responseHandler",
        "validateStatus"
    ]);
    if (typeof fetch === "undefined" && fetchFn === defaultFetchFn) {
        console.warn("Warning: `fetch` is not available. Please supply a custom `fetchFn` property to use `fetchBaseQuery` on SSR environments.");
    }
    return async (arg, api) => {
        const { signal, getState, extra, endpoint, forced, type } = api;
        let meta;
        let _a2 = typeof arg == "string" ? { url: arg } : arg, { url, headers = new Headers(baseFetchOptions.headers), params = void 0, responseHandler = globalResponseHandler != null ? globalResponseHandler : "json", validateStatus = globalValidateStatus != null ? globalValidateStatus : defaultValidateStatus, timeout = defaultTimeout } = _a2, rest = __objRest(_a2, [
            "url",
            "headers",
            "params",
            "responseHandler",
            "validateStatus",
            "timeout"
        ]);
        let config = __spreadValues(__spreadProps(__spreadValues({}, baseFetchOptions), {
            signal
        }), rest);
        headers = new Headers(stripUndefined(headers));
        config.headers = await prepareHeaders(headers, {
            getState,
            extra,
            endpoint,
            forced,
            type
        }) || headers;
        const isJsonifiable = (body) => typeof body === "object" && (isPlainObject2(body) || Array.isArray(body) || typeof body.toJSON === "function");
        if (!config.headers.has("content-type") && isJsonifiable(config.body)) {
            config.headers.set("content-type", jsonContentType);
        }
        if (isJsonifiable(config.body) && isJsonContentType(config.headers)) {
            config.body = JSON.stringify(config.body, jsonReplacer);
        }
        if (params) {
            const divider = ~url.indexOf("?") ? "&" : "?";
            const query = paramsSerializer ? paramsSerializer(params) : new URLSearchParams(stripUndefined(params));
            url += divider + query;
        }
        url = joinUrls(baseUrl, url);
        const request = new Request(url, config);
        const requestClone = new Request(url, config);
        meta = { request: requestClone };
        let response, timedOut = false, timeoutId = timeout && setTimeout(() => {
            timedOut = true;
            api.abort();
        }, timeout);
        try {
            response = await fetchFn(request);
        }
        catch (e) {
            return {
                error: {
                    status: timedOut ? "TIMEOUT_ERROR" : "FETCH_ERROR",
                    error: String(e)
                },
                meta
            };
        }
        finally {
            if (timeoutId)
                clearTimeout(timeoutId);
        }
        const responseClone = response.clone();
        meta.response = responseClone;
        let resultData;
        let responseText = "";
        try {
            let handleResponseError;
            await Promise.all([
                handleResponse(response, responseHandler).then((r) => resultData = r, (e) => handleResponseError = e),
                responseClone.text().then((r) => responseText = r, () => {
                })
            ]);
            if (handleResponseError)
                throw handleResponseError;
        }
        catch (e) {
            return {
                error: {
                    status: "PARSING_ERROR",
                    originalStatus: response.status,
                    data: responseText,
                    error: String(e)
                },
                meta
            };
        }
        return validateStatus(response, resultData) ? {
            data: resultData,
            meta
        } : {
            error: {
                status: response.status,
                data: resultData
            },
            meta
        };
    };
    async function handleResponse(response, responseHandler) {
        if (typeof responseHandler === "function") {
            return responseHandler(response);
        }
        if (responseHandler === "content-type") {
            responseHandler = isJsonContentType(response.headers) ? "json" : "text";
        }
        if (responseHandler === "json") {
            const text = await response.text();
            return text.length ? JSON.parse(text) : null;
        }
        return response.text();
    }
}
// src/query/HandledError.ts
var HandledError = class {
    constructor(value, meta = void 0) {
        this.value = value;
        this.meta = meta;
    }
};
// src/query/retry.ts
async function defaultBackoff(attempt = 0, maxRetries = 5) {
    const attempts = Math.min(attempt, maxRetries);
    const timeout = ~~((Math.random() + 0.4) * (300 << attempts));
    await new Promise((resolve) => setTimeout((res) => resolve(res), timeout));
}
function fail(e) {
    throw Object.assign(new HandledError({ error: e }), {
        throwImmediately: true
    });
}
var EMPTY_OPTIONS = {};
var retryWithBackoff = (baseQuery, defaultOptions) => async (args, api, extraOptions) => {
    const possibleMaxRetries = [
        5,
        (defaultOptions || EMPTY_OPTIONS).maxRetries,
        (extraOptions || EMPTY_OPTIONS).maxRetries
    ].filter((x) => x !== void 0);
    const [maxRetries] = possibleMaxRetries.slice(-1);
    const defaultRetryCondition = (_, __, { attempt }) => attempt <= maxRetries;
    const options = __spreadValues(__spreadValues({
        maxRetries,
        backoff: defaultBackoff,
        retryCondition: defaultRetryCondition
    }, defaultOptions), extraOptions);
    let retry2 = 0;
    while (true) {
        try {
            const result = await baseQuery(args, api, extraOptions);
            if (result.error) {
                throw new HandledError(result);
            }
            return result;
        }
        catch (e) {
            retry2++;
            if (e.throwImmediately) {
                if (e instanceof HandledError) {
                    return e.value;
                }
                throw e;
            }
            if (e instanceof HandledError && !options.retryCondition(e.value.error, args, {
                attempt: retry2,
                baseQueryApi: api,
                extraOptions
            })) {
                return e.value;
            }
            await options.backoff(retry2, options.maxRetries);
        }
    }
};
var retry = /* @__PURE__ */ Object.assign(retryWithBackoff, { fail });
// src/query/core/setupListeners.ts
import { createAction } from "@reduxjs/toolkit";
var onFocus = /* @__PURE__ */ createAction("__rtkq/focused");
var onFocusLost = /* @__PURE__ */ createAction("__rtkq/unfocused");
var onOnline = /* @__PURE__ */ createAction("__rtkq/online");
var onOffline = /* @__PURE__ */ createAction("__rtkq/offline");
var initialized = false;
function setupListeners(dispatch, customHandler) {
    function defaultHandler() {
        const handleFocus = () => dispatch(onFocus());
        const handleFocusLost = () => dispatch(onFocusLost());
        const handleOnline = () => dispatch(onOnline());
        const handleOffline = () => dispatch(onOffline());
        const handleVisibilityChange = () => {
            if (window.document.visibilityState === "visible") {
                handleFocus();
            }
            else {
                handleFocusLost();
            }
        };
        if (!initialized) {
            if (typeof window !== "undefined" && window.addEventListener) {
                window.addEventListener("visibilitychange", handleVisibilityChange, false);
                window.addEventListener("focus", handleFocus, false);
                window.addEventListener("online", handleOnline, false);
                window.addEventListener("offline", handleOffline, false);
                initialized = true;
            }
        }
        const unsubscribe = () => {
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            initialized = false;
        };
        return unsubscribe;
    }
    return customHandler ? customHandler(dispatch, { onFocus, onFocusLost, onOffline, onOnline }) : defaultHandler();
}
// src/query/core/buildSelectors.ts
import { createNextState as createNextState2, createSelector } from "@reduxjs/toolkit";
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
function calculateProvidedBy(description, result, error, queryArg, meta, assertTagTypes) {
    if (isFunction(description)) {
        return description(result, error, queryArg, meta).map(expandTagDescription).map(assertTagTypes);
    }
    if (Array.isArray(description)) {
        return description.map(expandTagDescription).map(assertTagTypes);
    }
    return [];
}
function isFunction(t) {
    return typeof t === "function";
}
function expandTagDescription(description) {
    return typeof description === "string" ? { type: description } : description;
}
// src/query/core/buildSlice.ts
import { combineReducers, createAction as createAction2, createSlice, isAnyOf, isFulfilled as isFulfilled2, isRejectedWithValue as isRejectedWithValue2, createNextState, prepareAutoBatched } from "@reduxjs/toolkit";
// src/query/utils/isNotNullish.ts
function isNotNullish(v) {
    return v != null;
}
// src/query/core/buildInitiate.ts
var forceQueryFnSymbol = Symbol("forceQueryFn");
var isUpsertQuery = (arg) => typeof arg[forceQueryFnSymbol] === "function";
function buildInitiate({ serializeQueryArgs, queryThunk, mutationThunk, api, context }) {
    const runningQueries = new Map();
    const runningMutations = new Map();
    const { unsubscribeQueryResult, removeMutationResult, updateSubscriptionOptions } = api.internalActions;
    return {
        buildInitiateQuery,
        buildInitiateMutation,
        getRunningQueryThunk,
        getRunningMutationThunk,
        getRunningQueriesThunk,
        getRunningMutationsThunk,
        getRunningOperationPromises,
        removalWarning
    };
    function removalWarning() {
        throw new Error(`This method had to be removed due to a conceptual bug in RTK.
       Please see https://github.com/reduxjs/redux-toolkit/pull/2481 for details.
       See https://redux-toolkit.js.org/rtk-query/usage/server-side-rendering for new guidance on SSR.`);
    }
    function getRunningOperationPromises() {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
            removalWarning();
        }
        else {
            const extract = (v) => Array.from(v.values()).flatMap((queriesForStore) => queriesForStore ? Object.values(queriesForStore) : []);
            return [...extract(runningQueries), ...extract(runningMutations)].filter(isNotNullish);
        }
    }
    function getRunningQueryThunk(endpointName, queryArgs) {
        return (dispatch) => {
            var _a;
            const endpointDefinition = context.endpointDefinitions[endpointName];
            const queryCacheKey = serializeQueryArgs({
                queryArgs,
                endpointDefinition,
                endpointName
            });
            return (_a = runningQueries.get(dispatch)) == null ? void 0 : _a[queryCacheKey];
        };
    }
    function getRunningMutationThunk(_endpointName, fixedCacheKeyOrRequestId) {
        return (dispatch) => {
            var _a;
            return (_a = runningMutations.get(dispatch)) == null ? void 0 : _a[fixedCacheKeyOrRequestId];
        };
    }
    function getRunningQueriesThunk() {
        return (dispatch) => Object.values(runningQueries.get(dispatch) || {}).filter(isNotNullish);
    }
    function getRunningMutationsThunk() {
        return (dispatch) => Object.values(runningMutations.get(dispatch) || {}).filter(isNotNullish);
    }
    function middlewareWarning(dispatch) {
        if (process.env.NODE_ENV !== "production") {
            if (middlewareWarning.triggered)
                return;
            const registered = dispatch(api.internalActions.internal_probeSubscription({
                queryCacheKey: "DOES_NOT_EXIST",
                requestId: "DUMMY_REQUEST_ID"
            }));
            middlewareWarning.triggered = true;
            if (typeof registered !== "boolean") {
                throw new Error(`Warning: Middleware for RTK-Query API at reducerPath "${api.reducerPath}" has not been added to the store.
You must add the middleware for RTK-Query to function correctly!`);
            }
        }
    }
    function buildInitiateQuery(endpointName, endpointDefinition) {
        const queryAction = (arg, { subscribe = true, forceRefetch, subscriptionOptions, [forceQueryFnSymbol]: forceQueryFn } = {}) => (dispatch, getState) => {
            var _a;
            const queryCacheKey = serializeQueryArgs({
                queryArgs: arg,
                endpointDefinition,
                endpointName
            });
            const thunk = queryThunk({
                type: "query",
                subscribe,
                forceRefetch,
                subscriptionOptions,
                endpointName,
                originalArgs: arg,
                queryCacheKey,
                [forceQueryFnSymbol]: forceQueryFn
            });
            const selector = api.endpoints[endpointName].select(arg);
            const thunkResult = dispatch(thunk);
            const stateAfter = selector(getState());
            middlewareWarning(dispatch);
            const { requestId, abort } = thunkResult;
            const skippedSynchronously = stateAfter.requestId !== requestId;
            const runningQuery = (_a = runningQueries.get(dispatch)) == null ? void 0 : _a[queryCacheKey];
            const selectFromState = () => selector(getState());
            const statePromise = Object.assign(forceQueryFn ? thunkResult.then(selectFromState) : skippedSynchronously && !runningQuery ? Promise.resolve(stateAfter) : Promise.all([runningQuery, thunkResult]).then(selectFromState), {
                arg,
                requestId,
                subscriptionOptions,
                queryCacheKey,
                abort,
                async unwrap() {
                    const result = await statePromise;
                    if (result.isError) {
                        throw result.error;
                    }
                    return result.data;
                },
                refetch: () => dispatch(queryAction(arg, { subscribe: false, forceRefetch: true })),
                unsubscribe() {
                    if (subscribe)
                        dispatch(unsubscribeQueryResult({
                            queryCacheKey,
                            requestId
                        }));
                },
                updateSubscriptionOptions(options) {
                    statePromise.subscriptionOptions = options;
                    dispatch(updateSubscriptionOptions({
                        endpointName,
                        requestId,
                        queryCacheKey,
                        options
                    }));
                }
            });
            if (!runningQuery && !skippedSynchronously && !forceQueryFn) {
                const running = runningQueries.get(dispatch) || {};
                running[queryCacheKey] = statePromise;
                runningQueries.set(dispatch, running);
                statePromise.then(() => {
                    delete running[queryCacheKey];
                    if (!Object.keys(running).length) {
                        runningQueries.delete(dispatch);
                    }
                });
            }
            return statePromise;
        };
        return queryAction;
    }
    function buildInitiateMutation(endpointName) {
        return (arg, { track = true, fixedCacheKey } = {}) => (dispatch, getState) => {
            const thunk = mutationThunk({
                type: "mutation",
                endpointName,
                originalArgs: arg,
                track,
                fixedCacheKey
            });
            const thunkResult = dispatch(thunk);
            middlewareWarning(dispatch);
            const { requestId, abort, unwrap } = thunkResult;
            const returnValuePromise = thunkResult.unwrap().then((data) => ({ data })).catch((error) => ({ error }));
            const reset = () => {
                dispatch(removeMutationResult({ requestId, fixedCacheKey }));
            };
            const ret = Object.assign(returnValuePromise, {
                arg: thunkResult.arg,
                requestId,
                abort,
                unwrap,
                unsubscribe: reset,
                reset
            });
            const running = runningMutations.get(dispatch) || {};
            runningMutations.set(dispatch, running);
            running[requestId] = ret;
            ret.then(() => {
                delete running[requestId];
                if (!Object.keys(running).length) {
                    runningMutations.delete(dispatch);
                }
            });
            if (fixedCacheKey) {
                running[fixedCacheKey] = ret;
                ret.then(() => {
                    if (running[fixedCacheKey] === ret) {
                        delete running[fixedCacheKey];
                        if (!Object.keys(running).length) {
                            runningMutations.delete(dispatch);
                        }
                    }
                });
            }
            return ret;
        };
    }
}
// src/query/core/buildThunks.ts
import { isAllOf, isFulfilled, isPending, isRejected, isRejectedWithValue } from "@reduxjs/toolkit";
import { isDraftable, produceWithPatches } from "immer";
import { createAsyncThunk, SHOULD_AUTOBATCH } from "@reduxjs/toolkit";
function defaultTransformResponse(baseQueryReturnValue) {
    return baseQueryReturnValue;
}
function buildThunks({ reducerPath, baseQuery, context: { endpointDefinitions }, serializeQueryArgs, api, assertTagType }) {
    const patchQueryData = (endpointName, args, patches, updateProvided) => (dispatch, getState) => {
        const endpointDefinition = endpointDefinitions[endpointName];
        const queryCacheKey = serializeQueryArgs({
            queryArgs: args,
            endpointDefinition,
            endpointName
        });
        dispatch(api.internalActions.queryResultPatched({ queryCacheKey, patches }));
        if (!updateProvided) {
            return;
        }
        const newValue = api.endpoints[endpointName].select(args)(getState());
        const providedTags = calculateProvidedBy(endpointDefinition.providesTags, newValue.data, void 0, args, {}, assertTagType);
        dispatch(api.internalActions.updateProvidedBy({ queryCacheKey, providedTags }));
    };
    const updateQueryData = (endpointName, args, updateRecipe, updateProvided = true) => (dispatch, getState) => {
        const endpointDefinition = api.endpoints[endpointName];
        const currentState = endpointDefinition.select(args)(getState());
        let ret = {
            patches: [],
            inversePatches: [],
            undo: () => dispatch(api.util.patchQueryData(endpointName, args, ret.inversePatches, updateProvided))
        };
        if (currentState.status === QueryStatus.uninitialized) {
            return ret;
        }
        let newValue;
        if ("data" in currentState) {
            if (isDraftable(currentState.data)) {
                const [value, patches, inversePatches] = produceWithPatches(currentState.data, updateRecipe);
                ret.patches.push(...patches);
                ret.inversePatches.push(...inversePatches);
                newValue = value;
            }
            else {
                newValue = updateRecipe(currentState.data);
                ret.patches.push({ op: "replace", path: [], value: newValue });
                ret.inversePatches.push({
                    op: "replace",
                    path: [],
                    value: currentState.data
                });
            }
        }
        dispatch(api.util.patchQueryData(endpointName, args, ret.patches, updateProvided));
        return ret;
    };
    const upsertQueryData = (endpointName, args, value) => (dispatch) => {
        return dispatch(api.endpoints[endpointName].initiate(args, {
            subscribe: false,
            forceRefetch: true,
            [forceQueryFnSymbol]: () => ({
                data: value
            })
        }));
    };
    const executeEndpoint = async (arg, { signal, abort, rejectWithValue, fulfillWithValue, dispatch, getState, extra }) => {
        const endpointDefinition = endpointDefinitions[arg.endpointName];
        try {
            let transformResponse = defaultTransformResponse;
            let result;
            const baseQueryApi = {
                signal,
                abort,
                dispatch,
                getState,
                extra,
                endpoint: arg.endpointName,
                type: arg.type,
                forced: arg.type === "query" ? isForcedQuery(arg, getState()) : void 0
            };
            const forceQueryFn = arg.type === "query" ? arg[forceQueryFnSymbol] : void 0;
            if (forceQueryFn) {
                result = forceQueryFn();
            }
            else if (endpointDefinition.query) {
                result = await baseQuery(endpointDefinition.query(arg.originalArgs), baseQueryApi, endpointDefinition.extraOptions);
                if (endpointDefinition.transformResponse) {
                    transformResponse = endpointDefinition.transformResponse;
                }
            }
            else {
                result = await endpointDefinition.queryFn(arg.originalArgs, baseQueryApi, endpointDefinition.extraOptions, (arg2) => baseQuery(arg2, baseQueryApi, endpointDefinition.extraOptions));
            }
            if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
                const what = endpointDefinition.query ? "`baseQuery`" : "`queryFn`";
                let err;
                if (!result) {
                    err = `${what} did not return anything.`;
                }
                else if (typeof result !== "object") {
                    err = `${what} did not return an object.`;
                }
                else if (result.error && result.data) {
                    err = `${what} returned an object containing both \`error\` and \`result\`.`;
                }
                else if (result.error === void 0 && result.data === void 0) {
                    err = `${what} returned an object containing neither a valid \`error\` and \`result\`. At least one of them should not be \`undefined\``;
                }
                else {
                    for (const key of Object.keys(result)) {
                        if (key !== "error" && key !== "data" && key !== "meta") {
                            err = `The object returned by ${what} has the unknown property ${key}.`;
                            break;
                        }
                    }
                }
                if (err) {
                    console.error(`Error encountered handling the endpoint ${arg.endpointName}.
              ${err}
              It needs to return an object with either the shape \`{ data: <value> }\` or \`{ error: <value> }\` that may contain an optional \`meta\` property.
              Object returned was:`, result);
                }
            }
            if (result.error)
                throw new HandledError(result.error, result.meta);
            return fulfillWithValue(await transformResponse(result.data, result.meta, arg.originalArgs), {
                fulfilledTimeStamp: Date.now(),
                baseQueryMeta: result.meta,
                [SHOULD_AUTOBATCH]: true
            });
        }
        catch (error) {
            let catchedError = error;
            if (catchedError instanceof HandledError) {
                let transformErrorResponse = defaultTransformResponse;
                if (endpointDefinition.query && endpointDefinition.transformErrorResponse) {
                    transformErrorResponse = endpointDefinition.transformErrorResponse;
                }
                try {
                    return rejectWithValue(await transformErrorResponse(catchedError.value, catchedError.meta, arg.originalArgs), { baseQueryMeta: catchedError.meta, [SHOULD_AUTOBATCH]: true });
                }
                catch (e) {
                    catchedError = e;
                }
            }
            if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
                console.error(`An unhandled error occurred processing a request for the endpoint "${arg.endpointName}".
In the case of an unhandled error, no tags will be "provided" or "invalidated".`, catchedError);
            }
            else {
                console.error(catchedError);
            }
            throw catchedError;
        }
    };
    function isForcedQuery(arg, state) {
        var _a, _b, _c, _d;
        const requestState = (_b = (_a = state[reducerPath]) == null ? void 0 : _a.queries) == null ? void 0 : _b[arg.queryCacheKey];
        const baseFetchOnMountOrArgChange = (_c = state[reducerPath]) == null ? void 0 : _c.config.refetchOnMountOrArgChange;
        const fulfilledVal = requestState == null ? void 0 : requestState.fulfilledTimeStamp;
        const refetchVal = (_d = arg.forceRefetch) != null ? _d : arg.subscribe && baseFetchOnMountOrArgChange;
        if (refetchVal) {
            return refetchVal === true || (Number(new Date()) - Number(fulfilledVal)) / 1e3 >= refetchVal;
        }
        return false;
    }
    const queryThunk = createAsyncThunk(`${reducerPath}/executeQuery`, executeEndpoint, {
        getPendingMeta() {
            return { startedTimeStamp: Date.now(), [SHOULD_AUTOBATCH]: true };
        },
        condition(queryThunkArgs, { getState }) {
            var _a, _b, _c;
            const state = getState();
            const requestState = (_b = (_a = state[reducerPath]) == null ? void 0 : _a.queries) == null ? void 0 : _b[queryThunkArgs.queryCacheKey];
            const fulfilledVal = requestState == null ? void 0 : requestState.fulfilledTimeStamp;
            const currentArg = queryThunkArgs.originalArgs;
            const previousArg = requestState == null ? void 0 : requestState.originalArgs;
            const endpointDefinition = endpointDefinitions[queryThunkArgs.endpointName];
            if (isUpsertQuery(queryThunkArgs)) {
                return true;
            }
            if ((requestState == null ? void 0 : requestState.status) === "pending") {
                return false;
            }
            if (isForcedQuery(queryThunkArgs, state)) {
                return true;
            }
            if (isQueryDefinition(endpointDefinition) && ((_c = endpointDefinition == null ? void 0 : endpointDefinition.forceRefetch) == null ? void 0 : _c.call(endpointDefinition, {
                currentArg,
                previousArg,
                endpointState: requestState,
                state
            }))) {
                return true;
            }
            if (fulfilledVal) {
                return false;
            }
            return true;
        },
        dispatchConditionRejection: true
    });
    const mutationThunk = createAsyncThunk(`${reducerPath}/executeMutation`, executeEndpoint, {
        getPendingMeta() {
            return { startedTimeStamp: Date.now(), [SHOULD_AUTOBATCH]: true };
        }
    });
    const hasTheForce = (options) => "force" in options;
    const hasMaxAge = (options) => "ifOlderThan" in options;
    const prefetch = (endpointName, arg, options) => (dispatch, getState) => {
        const force = hasTheForce(options) && options.force;
        const maxAge = hasMaxAge(options) && options.ifOlderThan;
        const queryAction = (force2 = true) => api.endpoints[endpointName].initiate(arg, { forceRefetch: force2 });
        const latestStateValue = api.endpoints[endpointName].select(arg)(getState());
        if (force) {
            dispatch(queryAction());
        }
        else if (maxAge) {
            const lastFulfilledTs = latestStateValue == null ? void 0 : latestStateValue.fulfilledTimeStamp;
            if (!lastFulfilledTs) {
                dispatch(queryAction());
                return;
            }
            const shouldRetrigger = (Number(new Date()) - Number(new Date(lastFulfilledTs))) / 1e3 >= maxAge;
            if (shouldRetrigger) {
                dispatch(queryAction());
            }
        }
        else {
            dispatch(queryAction(false));
        }
    };
    function matchesEndpoint(endpointName) {
        return (action) => {
            var _a, _b;
            return ((_b = (_a = action == null ? void 0 : action.meta) == null ? void 0 : _a.arg) == null ? void 0 : _b.endpointName) === endpointName;
        };
    }
    function buildMatchThunkActions(thunk, endpointName) {
        return {
            matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpointName)),
            matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpointName)),
            matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpointName))
        };
    }
    return {
        queryThunk,
        mutationThunk,
        prefetch,
        updateQueryData,
        upsertQueryData,
        patchQueryData,
        buildMatchThunkActions
    };
}
function calculateProvidedByThunk(action, type, endpointDefinitions, assertTagType) {
    return calculateProvidedBy(endpointDefinitions[action.meta.arg.endpointName][type], isFulfilled(action) ? action.payload : void 0, isRejectedWithValue(action) ? action.payload : void 0, action.meta.arg.originalArgs, "baseQueryMeta" in action.meta ? action.meta.baseQueryMeta : void 0, assertTagType);
}
// src/query/core/buildSlice.ts
import { isDraft } from "immer";
import { applyPatches, original } from "immer";
function updateQuerySubstateIfExists(state, queryCacheKey, update) {
    const substate = state[queryCacheKey];
    if (substate) {
        update(substate);
    }
}
function getMutationCacheKey(id) {
    var _a;
    return (_a = "arg" in id ? id.arg.fixedCacheKey : id.fixedCacheKey) != null ? _a : id.requestId;
}
function updateMutationSubstateIfExists(state, id, update) {
    const substate = state[getMutationCacheKey(id)];
    if (substate) {
        update(substate);
    }
}
var initialState = {};
function buildSlice({ reducerPath, queryThunk, mutationThunk, context: { endpointDefinitions: definitions, apiUid, extractRehydrationInfo, hasRehydrationInfo }, assertTagType, config }) {
    const resetApiState = createAction2(`${reducerPath}/resetApiState`);
    const querySlice = createSlice({
        name: `${reducerPath}/queries`,
        initialState,
        reducers: {
            removeQueryResult: {
                reducer(draft, { payload: { queryCacheKey } }) {
                    delete draft[queryCacheKey];
                },
                prepare: prepareAutoBatched()
            },
            queryResultPatched: {
                reducer(draft, { payload: { queryCacheKey, patches } }) {
                    updateQuerySubstateIfExists(draft, queryCacheKey, (substate) => {
                        substate.data = applyPatches(substate.data, patches.concat());
                    });
                },
                prepare: prepareAutoBatched()
            }
        },
        extraReducers(builder) {
            builder.addCase(queryThunk.pending, (draft, { meta, meta: { arg } }) => {
                var _a, _b;
                const upserting = isUpsertQuery(arg);
                if (arg.subscribe || upserting) {
                    (_b = draft[_a = arg.queryCacheKey]) != null ? _b : draft[_a] = {
                        status: QueryStatus.uninitialized,
                        endpointName: arg.endpointName
                    };
                }
                updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
                    substate.status = QueryStatus.pending;
                    substate.requestId = upserting && substate.requestId ? substate.requestId : meta.requestId;
                    if (arg.originalArgs !== void 0) {
                        substate.originalArgs = arg.originalArgs;
                    }
                    substate.startedTimeStamp = meta.startedTimeStamp;
                });
            }).addCase(queryThunk.fulfilled, (draft, { meta, payload }) => {
                updateQuerySubstateIfExists(draft, meta.arg.queryCacheKey, (substate) => {
                    var _a;
                    if (substate.requestId !== meta.requestId && !isUpsertQuery(meta.arg))
                        return;
                    const { merge } = definitions[meta.arg.endpointName];
                    substate.status = QueryStatus.fulfilled;
                    if (merge) {
                        if (substate.data !== void 0) {
                            const { fulfilledTimeStamp, arg, baseQueryMeta, requestId } = meta;
                            let newData = createNextState(substate.data, (draftSubstateData) => {
                                return merge(draftSubstateData, payload, {
                                    arg: arg.originalArgs,
                                    baseQueryMeta,
                                    fulfilledTimeStamp,
                                    requestId
                                });
                            });
                            substate.data = newData;
                        }
                        else {
                            substate.data = payload;
                        }
                    }
                    else {
                        substate.data = ((_a = definitions[meta.arg.endpointName].structuralSharing) != null ? _a : true) ? copyWithStructuralSharing(isDraft(substate.data) ? original(substate.data) : substate.data, payload) : payload;
                    }
                    delete substate.error;
                    substate.fulfilledTimeStamp = meta.fulfilledTimeStamp;
                });
            }).addCase(queryThunk.rejected, (draft, { meta: { condition, arg, requestId }, error, payload }) => {
                updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
                    if (condition) {
                    }
                    else {
                        if (substate.requestId !== requestId)
                            return;
                        substate.status = QueryStatus.rejected;
                        substate.error = payload != null ? payload : error;
                    }
                });
            }).addMatcher(hasRehydrationInfo, (draft, action) => {
                const { queries } = extractRehydrationInfo(action);
                for (const [key, entry] of Object.entries(queries)) {
                    if ((entry == null ? void 0 : entry.status) === QueryStatus.fulfilled || (entry == null ? void 0 : entry.status) === QueryStatus.rejected) {
                        draft[key] = entry;
                    }
                }
            });
        }
    });
    const mutationSlice = createSlice({
        name: `${reducerPath}/mutations`,
        initialState,
        reducers: {
            removeMutationResult: {
                reducer(draft, { payload }) {
                    const cacheKey = getMutationCacheKey(payload);
                    if (cacheKey in draft) {
                        delete draft[cacheKey];
                    }
                },
                prepare: prepareAutoBatched()
            }
        },
        extraReducers(builder) {
            builder.addCase(mutationThunk.pending, (draft, { meta, meta: { requestId, arg, startedTimeStamp } }) => {
                if (!arg.track)
                    return;
                draft[getMutationCacheKey(meta)] = {
                    requestId,
                    status: QueryStatus.pending,
                    endpointName: arg.endpointName,
                    startedTimeStamp
                };
            }).addCase(mutationThunk.fulfilled, (draft, { payload, meta }) => {
                if (!meta.arg.track)
                    return;
                updateMutationSubstateIfExists(draft, meta, (substate) => {
                    if (substate.requestId !== meta.requestId)
                        return;
                    substate.status = QueryStatus.fulfilled;
                    substate.data = payload;
                    substate.fulfilledTimeStamp = meta.fulfilledTimeStamp;
                });
            }).addCase(mutationThunk.rejected, (draft, { payload, error, meta }) => {
                if (!meta.arg.track)
                    return;
                updateMutationSubstateIfExists(draft, meta, (substate) => {
                    if (substate.requestId !== meta.requestId)
                        return;
                    substate.status = QueryStatus.rejected;
                    substate.error = payload != null ? payload : error;
                });
            }).addMatcher(hasRehydrationInfo, (draft, action) => {
                const { mutations } = extractRehydrationInfo(action);
                for (const [key, entry] of Object.entries(mutations)) {
                    if (((entry == null ? void 0 : entry.status) === QueryStatus.fulfilled || (entry == null ? void 0 : entry.status) === QueryStatus.rejected) && key !== (entry == null ? void 0 : entry.requestId)) {
                        draft[key] = entry;
                    }
                }
            });
        }
    });
    const invalidationSlice = createSlice({
        name: `${reducerPath}/invalidation`,
        initialState,
        reducers: {
            updateProvidedBy: {
                reducer(draft, action) {
                    var _a, _b, _c, _d;
                    const { queryCacheKey, providedTags } = action.payload;
                    for (const tagTypeSubscriptions of Object.values(draft)) {
                        for (const idSubscriptions of Object.values(tagTypeSubscriptions)) {
                            const foundAt = idSubscriptions.indexOf(queryCacheKey);
                            if (foundAt !== -1) {
                                idSubscriptions.splice(foundAt, 1);
                            }
                        }
                    }
                    for (const { type, id } of providedTags) {
                        const subscribedQueries = (_d = (_b = (_a = draft[type]) != null ? _a : draft[type] = {})[_c = id || "__internal_without_id"]) != null ? _d : _b[_c] = [];
                        const alreadySubscribed = subscribedQueries.includes(queryCacheKey);
                        if (!alreadySubscribed) {
                            subscribedQueries.push(queryCacheKey);
                        }
                    }
                },
                prepare: prepareAutoBatched()
            }
        },
        extraReducers(builder) {
            builder.addCase(querySlice.actions.removeQueryResult, (draft, { payload: { queryCacheKey } }) => {
                for (const tagTypeSubscriptions of Object.values(draft)) {
                    for (const idSubscriptions of Object.values(tagTypeSubscriptions)) {
                        const foundAt = idSubscriptions.indexOf(queryCacheKey);
                        if (foundAt !== -1) {
                            idSubscriptions.splice(foundAt, 1);
                        }
                    }
                }
            }).addMatcher(hasRehydrationInfo, (draft, action) => {
                var _a, _b, _c, _d;
                const { provided } = extractRehydrationInfo(action);
                for (const [type, incomingTags] of Object.entries(provided)) {
                    for (const [id, cacheKeys] of Object.entries(incomingTags)) {
                        const subscribedQueries = (_d = (_b = (_a = draft[type]) != null ? _a : draft[type] = {})[_c = id || "__internal_without_id"]) != null ? _d : _b[_c] = [];
                        for (const queryCacheKey of cacheKeys) {
                            const alreadySubscribed = subscribedQueries.includes(queryCacheKey);
                            if (!alreadySubscribed) {
                                subscribedQueries.push(queryCacheKey);
                            }
                        }
                    }
                }
            }).addMatcher(isAnyOf(isFulfilled2(queryThunk), isRejectedWithValue2(queryThunk)), (draft, action) => {
                const providedTags = calculateProvidedByThunk(action, "providesTags", definitions, assertTagType);
                const { queryCacheKey } = action.meta.arg;
                invalidationSlice.caseReducers.updateProvidedBy(draft, invalidationSlice.actions.updateProvidedBy({
                    queryCacheKey,
                    providedTags
                }));
            });
        }
    });
    const subscriptionSlice = createSlice({
        name: `${reducerPath}/subscriptions`,
        initialState,
        reducers: {
            updateSubscriptionOptions(d, a) {
            },
            unsubscribeQueryResult(d, a) {
            },
            internal_probeSubscription(d, a) {
            }
        }
    });
    const internalSubscriptionsSlice = createSlice({
        name: `${reducerPath}/internalSubscriptions`,
        initialState,
        reducers: {
            subscriptionsUpdated: {
                reducer(state, action) {
                    return applyPatches(state, action.payload);
                },
                prepare: prepareAutoBatched()
            }
        }
    });
    const configSlice = createSlice({
        name: `${reducerPath}/config`,
        initialState: __spreadValues({
            online: isOnline(),
            focused: isDocumentVisible(),
            middlewareRegistered: false
        }, config),
        reducers: {
            middlewareRegistered(state, { payload }) {
                state.middlewareRegistered = state.middlewareRegistered === "conflict" || apiUid !== payload ? "conflict" : true;
            }
        },
        extraReducers: (builder) => {
            builder.addCase(onOnline, (state) => {
                state.online = true;
            }).addCase(onOffline, (state) => {
                state.online = false;
            }).addCase(onFocus, (state) => {
                state.focused = true;
            }).addCase(onFocusLost, (state) => {
                state.focused = false;
            }).addMatcher(hasRehydrationInfo, (draft) => __spreadValues({}, draft));
        }
    });
    const combinedReducer = combineReducers({
        queries: querySlice.reducer,
        mutations: mutationSlice.reducer,
        provided: invalidationSlice.reducer,
        subscriptions: internalSubscriptionsSlice.reducer,
        config: configSlice.reducer
    });
    const reducer = (state, action) => combinedReducer(resetApiState.match(action) ? void 0 : state, action);
    const actions = __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, configSlice.actions), querySlice.actions), subscriptionSlice.actions), internalSubscriptionsSlice.actions), mutationSlice.actions), invalidationSlice.actions), {
        unsubscribeMutationResult: mutationSlice.actions.removeMutationResult,
        resetApiState
    });
    return { reducer, actions };
}
// src/query/core/buildSelectors.ts
var skipToken = /* @__PURE__ */ Symbol.for("RTKQ/skipToken");
var skipSelector = skipToken;
var initialSubState = {
    status: QueryStatus.uninitialized
};
var defaultQuerySubState = /* @__PURE__ */ createNextState2(initialSubState, () => {
});
var defaultMutationSubState = /* @__PURE__ */ createNextState2(initialSubState, () => {
});
function buildSelectors({ serializeQueryArgs, reducerPath }) {
    const selectSkippedQuery = (state) => defaultQuerySubState;
    const selectSkippedMutation = (state) => defaultMutationSubState;
    return { buildQuerySelector, buildMutationSelector, selectInvalidatedBy };
    function withRequestFlags(substate) {
        return __spreadValues(__spreadValues({}, substate), getRequestStatusFlags(substate.status));
    }
    function selectInternalState(rootState) {
        const state = rootState[reducerPath];
        if (process.env.NODE_ENV !== "production") {
            if (!state) {
                if (selectInternalState.triggered)
                    return state;
                selectInternalState.triggered = true;
                console.error(`Error: No data found at \`state.${reducerPath}\`. Did you forget to add the reducer to the store?`);
            }
        }
        return state;
    }
    function buildQuerySelector(endpointName, endpointDefinition) {
        return (queryArgs) => {
            const serializedArgs = serializeQueryArgs({
                queryArgs,
                endpointDefinition,
                endpointName
            });
            const selectQuerySubstate = (state) => {
                var _a, _b, _c;
                return (_c = (_b = (_a = selectInternalState(state)) == null ? void 0 : _a.queries) == null ? void 0 : _b[serializedArgs]) != null ? _c : defaultQuerySubState;
            };
            const finalSelectQuerySubState = queryArgs === skipToken ? selectSkippedQuery : selectQuerySubstate;
            return createSelector(finalSelectQuerySubState, withRequestFlags);
        };
    }
    function buildMutationSelector() {
        return (id) => {
            var _a;
            let mutationId;
            if (typeof id === "object") {
                mutationId = (_a = getMutationCacheKey(id)) != null ? _a : skipToken;
            }
            else {
                mutationId = id;
            }
            const selectMutationSubstate = (state) => {
                var _a2, _b, _c;
                return (_c = (_b = (_a2 = selectInternalState(state)) == null ? void 0 : _a2.mutations) == null ? void 0 : _b[mutationId]) != null ? _c : defaultMutationSubState;
            };
            const finalSelectMutationSubstate = mutationId === skipToken ? selectSkippedMutation : selectMutationSubstate;
            return createSelector(finalSelectMutationSubstate, withRequestFlags);
        };
    }
    function selectInvalidatedBy(state, tags) {
        var _a;
        const apiState = state[reducerPath];
        const toInvalidate = new Set();
        for (const tag of tags.map(expandTagDescription)) {
            const provided = apiState.provided[tag.type];
            if (!provided) {
                continue;
            }
            let invalidateSubscriptions = (_a = tag.id !== void 0 ? provided[tag.id] : flatten(Object.values(provided))) != null ? _a : [];
            for (const invalidate of invalidateSubscriptions) {
                toInvalidate.add(invalidate);
            }
        }
        return flatten(Array.from(toInvalidate.values()).map((queryCacheKey) => {
            const querySubState = apiState.queries[queryCacheKey];
            return querySubState ? [
                {
                    queryCacheKey,
                    endpointName: querySubState.endpointName,
                    originalArgs: querySubState.originalArgs
                }
            ] : [];
        }));
    }
}
// src/query/defaultSerializeQueryArgs.ts
import { isPlainObject as isPlainObject3 } from "@reduxjs/toolkit";
var cache = WeakMap ? new WeakMap() : void 0;
var defaultSerializeQueryArgs = ({ endpointName, queryArgs }) => {
    let serialized = "";
    const cached = cache == null ? void 0 : cache.get(queryArgs);
    if (typeof cached === "string") {
        serialized = cached;
    }
    else {
        const stringified = JSON.stringify(queryArgs, (key, value) => isPlainObject3(value) ? Object.keys(value).sort().reduce((acc, key2) => {
            acc[key2] = value[key2];
            return acc;
        }, {}) : value);
        if (isPlainObject3(queryArgs)) {
            cache == null ? void 0 : cache.set(queryArgs, stringified);
        }
        serialized = stringified;
    }
    return `${endpointName}(${serialized})`;
};
// src/query/createApi.ts
import { nanoid } from "@reduxjs/toolkit";
import { defaultMemoize } from "reselect";
function buildCreateApi(...modules) {
    return function baseCreateApi(options) {
        const extractRehydrationInfo = defaultMemoize((action) => {
            var _a, _b;
            return (_b = options.extractRehydrationInfo) == null ? void 0 : _b.call(options, action, {
                reducerPath: (_a = options.reducerPath) != null ? _a : "api"
            });
        });
        const optionsWithDefaults = __spreadProps(__spreadValues({
            reducerPath: "api",
            keepUnusedDataFor: 60,
            refetchOnMountOrArgChange: false,
            refetchOnFocus: false,
            refetchOnReconnect: false
        }, options), {
            extractRehydrationInfo,
            serializeQueryArgs(queryArgsApi) {
                let finalSerializeQueryArgs = defaultSerializeQueryArgs;
                if ("serializeQueryArgs" in queryArgsApi.endpointDefinition) {
                    const endpointSQA = queryArgsApi.endpointDefinition.serializeQueryArgs;
                    finalSerializeQueryArgs = (queryArgsApi2) => {
                        const initialResult = endpointSQA(queryArgsApi2);
                        if (typeof initialResult === "string") {
                            return initialResult;
                        }
                        else {
                            return defaultSerializeQueryArgs(__spreadProps(__spreadValues({}, queryArgsApi2), {
                                queryArgs: initialResult
                            }));
                        }
                    };
                }
                else if (options.serializeQueryArgs) {
                    finalSerializeQueryArgs = options.serializeQueryArgs;
                }
                return finalSerializeQueryArgs(queryArgsApi);
            },
            tagTypes: [...options.tagTypes || []]
        });
        const context = {
            endpointDefinitions: {},
            batch(fn) {
                fn();
            },
            apiUid: nanoid(),
            extractRehydrationInfo,
            hasRehydrationInfo: defaultMemoize((action) => extractRehydrationInfo(action) != null)
        };
        const api = {
            injectEndpoints,
            enhanceEndpoints({ addTagTypes, endpoints }) {
                if (addTagTypes) {
                    for (const eT of addTagTypes) {
                        if (!optionsWithDefaults.tagTypes.includes(eT)) {
                            ;
                            optionsWithDefaults.tagTypes.push(eT);
                        }
                    }
                }
                if (endpoints) {
                    for (const [endpointName, partialDefinition] of Object.entries(endpoints)) {
                        if (typeof partialDefinition === "function") {
                            partialDefinition(context.endpointDefinitions[endpointName]);
                        }
                        else {
                            Object.assign(context.endpointDefinitions[endpointName] || {}, partialDefinition);
                        }
                    }
                }
                return api;
            }
        };
        const initializedModules = modules.map((m) => m.init(api, optionsWithDefaults, context));
        function injectEndpoints(inject) {
            const evaluatedEndpoints = inject.endpoints({
                query: (x) => __spreadProps(__spreadValues({}, x), { type: DefinitionType.query }),
                mutation: (x) => __spreadProps(__spreadValues({}, x), { type: DefinitionType.mutation })
            });
            for (const [endpointName, definition] of Object.entries(evaluatedEndpoints)) {
                if (!inject.overrideExisting && endpointName in context.endpointDefinitions) {
                    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
                        console.error(`called \`injectEndpoints\` to override already-existing endpointName ${endpointName} without specifying \`overrideExisting: true\``);
                    }
                    continue;
                }
                context.endpointDefinitions[endpointName] = definition;
                for (const m of initializedModules) {
                    m.injectEndpoint(endpointName, definition);
                }
            }
            return api;
        }
        return api.injectEndpoints({ endpoints: options.endpoints });
    };
}
// src/query/fakeBaseQuery.ts
function fakeBaseQuery() {
    return function () {
        throw new Error("When using `fakeBaseQuery`, all queries & mutations must use the `queryFn` definition syntax.");
    };
}
// src/query/core/buildMiddleware/index.ts
import { createAction as createAction3 } from "@reduxjs/toolkit";
// src/query/core/buildMiddleware/cacheCollection.ts
function isObjectEmpty(obj) {
    for (let k in obj) {
        return false;
    }
    return true;
}
var THIRTY_TWO_BIT_MAX_TIMER_SECONDS = 2147483647 / 1e3 - 1;
var buildCacheCollectionHandler = ({ reducerPath, api, context, internalState }) => {
    const { removeQueryResult, unsubscribeQueryResult } = api.internalActions;
    function anySubscriptionsRemainingForKey(queryCacheKey) {
        const subscriptions = internalState.currentSubscriptions[queryCacheKey];
        return !!subscriptions && !isObjectEmpty(subscriptions);
    }
    const currentRemovalTimeouts = {};
    const handler = (action, mwApi, internalState2) => {
        var _a;
        if (unsubscribeQueryResult.match(action)) {
            const state = mwApi.getState()[reducerPath];
            const { queryCacheKey } = action.payload;
            handleUnsubscribe(queryCacheKey, (_a = state.queries[queryCacheKey]) == null ? void 0 : _a.endpointName, mwApi, state.config);
        }
        if (api.util.resetApiState.match(action)) {
            for (const [key, timeout] of Object.entries(currentRemovalTimeouts)) {
                if (timeout)
                    clearTimeout(timeout);
                delete currentRemovalTimeouts[key];
            }
        }
        if (context.hasRehydrationInfo(action)) {
            const state = mwApi.getState()[reducerPath];
            const { queries } = context.extractRehydrationInfo(action);
            for (const [queryCacheKey, queryState] of Object.entries(queries)) {
                handleUnsubscribe(queryCacheKey, queryState == null ? void 0 : queryState.endpointName, mwApi, state.config);
            }
        }
    };
    function handleUnsubscribe(queryCacheKey, endpointName, api2, config) {
        var _a;
        const endpointDefinition = context.endpointDefinitions[endpointName];
        const keepUnusedDataFor = (_a = endpointDefinition == null ? void 0 : endpointDefinition.keepUnusedDataFor) != null ? _a : config.keepUnusedDataFor;
        if (keepUnusedDataFor === Infinity) {
            return;
        }
        const finalKeepUnusedDataFor = Math.max(0, Math.min(keepUnusedDataFor, THIRTY_TWO_BIT_MAX_TIMER_SECONDS));
        if (!anySubscriptionsRemainingForKey(queryCacheKey)) {
            const currentTimeout = currentRemovalTimeouts[queryCacheKey];
            if (currentTimeout) {
                clearTimeout(currentTimeout);
            }
            currentRemovalTimeouts[queryCacheKey] = setTimeout(() => {
                if (!anySubscriptionsRemainingForKey(queryCacheKey)) {
                    api2.dispatch(removeQueryResult({ queryCacheKey }));
                }
                delete currentRemovalTimeouts[queryCacheKey];
            }, finalKeepUnusedDataFor * 1e3);
        }
    }
    return handler;
};
// src/query/core/buildMiddleware/invalidationByTags.ts
import { isAnyOf as isAnyOf2, isFulfilled as isFulfilled3, isRejectedWithValue as isRejectedWithValue3 } from "@reduxjs/toolkit";
var buildInvalidationByTagsHandler = ({ reducerPath, context, context: { endpointDefinitions }, mutationThunk, api, assertTagType, refetchQuery }) => {
    const { removeQueryResult } = api.internalActions;
    const isThunkActionWithTags = isAnyOf2(isFulfilled3(mutationThunk), isRejectedWithValue3(mutationThunk));
    const handler = (action, mwApi) => {
        if (isThunkActionWithTags(action)) {
            invalidateTags(calculateProvidedByThunk(action, "invalidatesTags", endpointDefinitions, assertTagType), mwApi);
        }
        if (api.util.invalidateTags.match(action)) {
            invalidateTags(calculateProvidedBy(action.payload, void 0, void 0, void 0, void 0, assertTagType), mwApi);
        }
    };
    function invalidateTags(tags, mwApi) {
        const rootState = mwApi.getState();
        const state = rootState[reducerPath];
        const toInvalidate = api.util.selectInvalidatedBy(rootState, tags);
        context.batch(() => {
            var _a;
            const valuesArray = Array.from(toInvalidate.values());
            for (const { queryCacheKey } of valuesArray) {
                const querySubState = state.queries[queryCacheKey];
                const subscriptionSubState = (_a = state.subscriptions[queryCacheKey]) != null ? _a : {};
                if (querySubState) {
                    if (Object.keys(subscriptionSubState).length === 0) {
                        mwApi.dispatch(removeQueryResult({
                            queryCacheKey
                        }));
                    }
                    else if (querySubState.status !== QueryStatus.uninitialized) {
                        mwApi.dispatch(refetchQuery(querySubState, queryCacheKey));
                    }
                }
            }
        });
    }
    return handler;
};
// src/query/core/buildMiddleware/polling.ts
var buildPollingHandler = ({ reducerPath, queryThunk, api, refetchQuery, internalState }) => {
    const currentPolls = {};
    const handler = (action, mwApi) => {
        if (api.internalActions.updateSubscriptionOptions.match(action) || api.internalActions.unsubscribeQueryResult.match(action)) {
            updatePollingInterval(action.payload, mwApi);
        }
        if (queryThunk.pending.match(action) || queryThunk.rejected.match(action) && action.meta.condition) {
            updatePollingInterval(action.meta.arg, mwApi);
        }
        if (queryThunk.fulfilled.match(action) || queryThunk.rejected.match(action) && !action.meta.condition) {
            startNextPoll(action.meta.arg, mwApi);
        }
        if (api.util.resetApiState.match(action)) {
            clearPolls();
        }
    };
    function startNextPoll({ queryCacheKey }, api2) {
        const state = api2.getState()[reducerPath];
        const querySubState = state.queries[queryCacheKey];
        const subscriptions = internalState.currentSubscriptions[queryCacheKey];
        if (!querySubState || querySubState.status === QueryStatus.uninitialized)
            return;
        const lowestPollingInterval = findLowestPollingInterval(subscriptions);
        if (!Number.isFinite(lowestPollingInterval))
            return;
        const currentPoll = currentPolls[queryCacheKey];
        if (currentPoll == null ? void 0 : currentPoll.timeout) {
            clearTimeout(currentPoll.timeout);
            currentPoll.timeout = void 0;
        }
        const nextPollTimestamp = Date.now() + lowestPollingInterval;
        const currentInterval = currentPolls[queryCacheKey] = {
            nextPollTimestamp,
            pollingInterval: lowestPollingInterval,
            timeout: setTimeout(() => {
                currentInterval.timeout = void 0;
                api2.dispatch(refetchQuery(querySubState, queryCacheKey));
            }, lowestPollingInterval)
        };
    }
    function updatePollingInterval({ queryCacheKey }, api2) {
        const state = api2.getState()[reducerPath];
        const querySubState = state.queries[queryCacheKey];
        const subscriptions = internalState.currentSubscriptions[queryCacheKey];
        if (!querySubState || querySubState.status === QueryStatus.uninitialized) {
            return;
        }
        const lowestPollingInterval = findLowestPollingInterval(subscriptions);
        if (!Number.isFinite(lowestPollingInterval)) {
            cleanupPollForKey(queryCacheKey);
            return;
        }
        const currentPoll = currentPolls[queryCacheKey];
        const nextPollTimestamp = Date.now() + lowestPollingInterval;
        if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
            startNextPoll({ queryCacheKey }, api2);
        }
    }
    function cleanupPollForKey(key) {
        const existingPoll = currentPolls[key];
        if (existingPoll == null ? void 0 : existingPoll.timeout) {
            clearTimeout(existingPoll.timeout);
        }
        delete currentPolls[key];
    }
    function clearPolls() {
        for (const key of Object.keys(currentPolls)) {
            cleanupPollForKey(key);
        }
    }
    function findLowestPollingInterval(subscribers = {}) {
        let lowestPollingInterval = Number.POSITIVE_INFINITY;
        for (let key in subscribers) {
            if (!!subscribers[key].pollingInterval) {
                lowestPollingInterval = Math.min(subscribers[key].pollingInterval, lowestPollingInterval);
            }
        }
        return lowestPollingInterval;
    }
    return handler;
};
// src/query/core/buildMiddleware/windowEventHandling.ts
var buildWindowEventHandler = ({ reducerPath, context, api, refetchQuery, internalState }) => {
    const { removeQueryResult } = api.internalActions;
    const handler = (action, mwApi) => {
        if (onFocus.match(action)) {
            refetchValidQueries(mwApi, "refetchOnFocus");
        }
        if (onOnline.match(action)) {
            refetchValidQueries(mwApi, "refetchOnReconnect");
        }
    };
    function refetchValidQueries(api2, type) {
        const state = api2.getState()[reducerPath];
        const queries = state.queries;
        const subscriptions = internalState.currentSubscriptions;
        context.batch(() => {
            for (const queryCacheKey of Object.keys(subscriptions)) {
                const querySubState = queries[queryCacheKey];
                const subscriptionSubState = subscriptions[queryCacheKey];
                if (!subscriptionSubState || !querySubState)
                    continue;
                const shouldRefetch = Object.values(subscriptionSubState).some((sub) => sub[type] === true) || Object.values(subscriptionSubState).every((sub) => sub[type] === void 0) && state.config[type];
                if (shouldRefetch) {
                    if (Object.keys(subscriptionSubState).length === 0) {
                        api2.dispatch(removeQueryResult({
                            queryCacheKey
                        }));
                    }
                    else if (querySubState.status !== QueryStatus.uninitialized) {
                        api2.dispatch(refetchQuery(querySubState, queryCacheKey));
                    }
                }
            }
        });
    }
    return handler;
};
// src/query/core/buildMiddleware/cacheLifecycle.ts
import { isAsyncThunkAction, isFulfilled as isFulfilled4 } from "@reduxjs/toolkit";
var neverResolvedError = new Error("Promise never resolved before cacheEntryRemoved.");
var buildCacheLifecycleHandler = ({ api, reducerPath, context, queryThunk, mutationThunk, internalState }) => {
    const isQueryThunk = isAsyncThunkAction(queryThunk);
    const isMutationThunk = isAsyncThunkAction(mutationThunk);
    const isFulfilledThunk = isFulfilled4(queryThunk, mutationThunk);
    const lifecycleMap = {};
    const handler = (action, mwApi, stateBefore) => {
        const cacheKey = getCacheKey(action);
        if (queryThunk.pending.match(action)) {
            const oldState = stateBefore[reducerPath].queries[cacheKey];
            const state = mwApi.getState()[reducerPath].queries[cacheKey];
            if (!oldState && state) {
                handleNewKey(action.meta.arg.endpointName, action.meta.arg.originalArgs, cacheKey, mwApi, action.meta.requestId);
            }
        }
        else if (mutationThunk.pending.match(action)) {
            const state = mwApi.getState()[reducerPath].mutations[cacheKey];
            if (state) {
                handleNewKey(action.meta.arg.endpointName, action.meta.arg.originalArgs, cacheKey, mwApi, action.meta.requestId);
            }
        }
        else if (isFulfilledThunk(action)) {
            const lifecycle = lifecycleMap[cacheKey];
            if (lifecycle == null ? void 0 : lifecycle.valueResolved) {
                lifecycle.valueResolved({
                    data: action.payload,
                    meta: action.meta.baseQueryMeta
                });
                delete lifecycle.valueResolved;
            }
        }
        else if (api.internalActions.removeQueryResult.match(action) || api.internalActions.removeMutationResult.match(action)) {
            const lifecycle = lifecycleMap[cacheKey];
            if (lifecycle) {
                delete lifecycleMap[cacheKey];
                lifecycle.cacheEntryRemoved();
            }
        }
        else if (api.util.resetApiState.match(action)) {
            for (const [cacheKey2, lifecycle] of Object.entries(lifecycleMap)) {
                delete lifecycleMap[cacheKey2];
                lifecycle.cacheEntryRemoved();
            }
        }
    };
    function getCacheKey(action) {
        if (isQueryThunk(action))
            return action.meta.arg.queryCacheKey;
        if (isMutationThunk(action))
            return action.meta.requestId;
        if (api.internalActions.removeQueryResult.match(action))
            return action.payload.queryCacheKey;
        if (api.internalActions.removeMutationResult.match(action))
            return getMutationCacheKey(action.payload);
        return "";
    }
    function handleNewKey(endpointName, originalArgs, queryCacheKey, mwApi, requestId) {
        const endpointDefinition = context.endpointDefinitions[endpointName];
        const onCacheEntryAdded = endpointDefinition == null ? void 0 : endpointDefinition.onCacheEntryAdded;
        if (!onCacheEntryAdded)
            return;
        let lifecycle = {};
        const cacheEntryRemoved = new Promise((resolve) => {
            lifecycle.cacheEntryRemoved = resolve;
        });
        const cacheDataLoaded = Promise.race([
            new Promise((resolve) => {
                lifecycle.valueResolved = resolve;
            }),
            cacheEntryRemoved.then(() => {
                throw neverResolvedError;
            })
        ]);
        cacheDataLoaded.catch(() => {
        });
        lifecycleMap[queryCacheKey] = lifecycle;
        const selector = api.endpoints[endpointName].select(endpointDefinition.type === DefinitionType.query ? originalArgs : queryCacheKey);
        const extra = mwApi.dispatch((_, __, extra2) => extra2);
        const lifecycleApi = __spreadProps(__spreadValues({}, mwApi), {
            getCacheEntry: () => selector(mwApi.getState()),
            requestId,
            extra,
            updateCachedData: endpointDefinition.type === DefinitionType.query ? (updateRecipe) => mwApi.dispatch(api.util.updateQueryData(endpointName, originalArgs, updateRecipe)) : void 0,
            cacheDataLoaded,
            cacheEntryRemoved
        });
        const runningHandler = onCacheEntryAdded(originalArgs, lifecycleApi);
        Promise.resolve(runningHandler).catch((e) => {
            if (e === neverResolvedError)
                return;
            throw e;
        });
    }
    return handler;
};
// src/query/core/buildMiddleware/queryLifecycle.ts
import { isPending as isPending2, isRejected as isRejected2, isFulfilled as isFulfilled5 } from "@reduxjs/toolkit";
var buildQueryLifecycleHandler = ({ api, context, queryThunk, mutationThunk }) => {
    const isPendingThunk = isPending2(queryThunk, mutationThunk);
    const isRejectedThunk = isRejected2(queryThunk, mutationThunk);
    const isFullfilledThunk = isFulfilled5(queryThunk, mutationThunk);
    const lifecycleMap = {};
    const handler = (action, mwApi) => {
        var _a, _b, _c;
        if (isPendingThunk(action)) {
            const { requestId, arg: { endpointName, originalArgs } } = action.meta;
            const endpointDefinition = context.endpointDefinitions[endpointName];
            const onQueryStarted = endpointDefinition == null ? void 0 : endpointDefinition.onQueryStarted;
            if (onQueryStarted) {
                const lifecycle = {};
                const queryFulfilled = new Promise((resolve, reject) => {
                    lifecycle.resolve = resolve;
                    lifecycle.reject = reject;
                });
                queryFulfilled.catch(() => {
                });
                lifecycleMap[requestId] = lifecycle;
                const selector = api.endpoints[endpointName].select(endpointDefinition.type === DefinitionType.query ? originalArgs : requestId);
                const extra = mwApi.dispatch((_, __, extra2) => extra2);
                const lifecycleApi = __spreadProps(__spreadValues({}, mwApi), {
                    getCacheEntry: () => selector(mwApi.getState()),
                    requestId,
                    extra,
                    updateCachedData: endpointDefinition.type === DefinitionType.query ? (updateRecipe) => mwApi.dispatch(api.util.updateQueryData(endpointName, originalArgs, updateRecipe)) : void 0,
                    queryFulfilled
                });
                onQueryStarted(originalArgs, lifecycleApi);
            }
        }
        else if (isFullfilledThunk(action)) {
            const { requestId, baseQueryMeta } = action.meta;
            (_a = lifecycleMap[requestId]) == null ? void 0 : _a.resolve({
                data: action.payload,
                meta: baseQueryMeta
            });
            delete lifecycleMap[requestId];
        }
        else if (isRejectedThunk(action)) {
            const { requestId, rejectedWithValue, baseQueryMeta } = action.meta;
            (_c = lifecycleMap[requestId]) == null ? void 0 : _c.reject({
                error: (_b = action.payload) != null ? _b : action.error,
                isUnhandledError: !rejectedWithValue,
                meta: baseQueryMeta
            });
            delete lifecycleMap[requestId];
        }
    };
    return handler;
};
// src/query/core/buildMiddleware/devMiddleware.ts
var buildDevCheckHandler = ({ api, context: { apiUid }, reducerPath }) => {
    return (action, mwApi) => {
        var _a, _b;
        if (api.util.resetApiState.match(action)) {
            mwApi.dispatch(api.internalActions.middlewareRegistered(apiUid));
        }
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
            if (api.internalActions.middlewareRegistered.match(action) && action.payload === apiUid && ((_b = (_a = mwApi.getState()[reducerPath]) == null ? void 0 : _a.config) == null ? void 0 : _b.middlewareRegistered) === "conflict") {
                console.warn(`There is a mismatch between slice and middleware for the reducerPath "${reducerPath}".
You can only have one api per reducer path, this will lead to crashes in various situations!${reducerPath === "api" ? `
If you have multiple apis, you *have* to specify the reducerPath option when using createApi!` : ""}`);
            }
        }
    };
};
// src/query/core/buildMiddleware/batchActions.ts
import { produceWithPatches as produceWithPatches2 } from "immer";
var promise;
var queueMicrotaskShim = typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : globalThis) : (cb) => (promise || (promise = Promise.resolve())).then(cb).catch((err) => setTimeout(() => {
    throw err;
}, 0));
var buildBatchedActionsHandler = ({ api, queryThunk, internalState }) => {
    const subscriptionsPrefix = `${api.reducerPath}/subscriptions`;
    let previousSubscriptions = null;
    let dispatchQueued = false;
    const { updateSubscriptionOptions, unsubscribeQueryResult } = api.internalActions;
    const actuallyMutateSubscriptions = (mutableState, action) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        if (updateSubscriptionOptions.match(action)) {
            const { queryCacheKey, requestId, options } = action.payload;
            if ((_a = mutableState == null ? void 0 : mutableState[queryCacheKey]) == null ? void 0 : _a[requestId]) {
                mutableState[queryCacheKey][requestId] = options;
            }
            return true;
        }
        if (unsubscribeQueryResult.match(action)) {
            const { queryCacheKey, requestId } = action.payload;
            if (mutableState[queryCacheKey]) {
                delete mutableState[queryCacheKey][requestId];
            }
            return true;
        }
        if (api.internalActions.removeQueryResult.match(action)) {
            delete mutableState[action.payload.queryCacheKey];
            return true;
        }
        if (queryThunk.pending.match(action)) {
            const { meta: { arg, requestId } } = action;
            if (arg.subscribe) {
                const substate = (_c = mutableState[_b = arg.queryCacheKey]) != null ? _c : mutableState[_b] = {};
                substate[requestId] = (_e = (_d = arg.subscriptionOptions) != null ? _d : substate[requestId]) != null ? _e : {};
                return true;
            }
        }
        if (queryThunk.rejected.match(action)) {
            const { meta: { condition, arg, requestId } } = action;
            if (condition && arg.subscribe) {
                const substate = (_g = mutableState[_f = arg.queryCacheKey]) != null ? _g : mutableState[_f] = {};
                substate[requestId] = (_i = (_h = arg.subscriptionOptions) != null ? _h : substate[requestId]) != null ? _i : {};
                return true;
            }
        }
        return false;
    };
    return (action, mwApi) => {
        var _a, _b;
        if (!previousSubscriptions) {
            previousSubscriptions = JSON.parse(JSON.stringify(internalState.currentSubscriptions));
        }
        if (api.util.resetApiState.match(action)) {
            previousSubscriptions = internalState.currentSubscriptions = {};
            return [true, false];
        }
        if (api.internalActions.internal_probeSubscription.match(action)) {
            const { queryCacheKey, requestId } = action.payload;
            const hasSubscription = !!((_a = internalState.currentSubscriptions[queryCacheKey]) == null ? void 0 : _a[requestId]);
            return [false, hasSubscription];
        }
        const didMutate = actuallyMutateSubscriptions(internalState.currentSubscriptions, action);
        if (didMutate) {
            if (!dispatchQueued) {
                queueMicrotaskShim(() => {
                    const newSubscriptions = JSON.parse(JSON.stringify(internalState.currentSubscriptions));
                    const [, patches] = produceWithPatches2(previousSubscriptions, () => newSubscriptions);
                    mwApi.next(api.internalActions.subscriptionsUpdated(patches));
                    previousSubscriptions = newSubscriptions;
                    dispatchQueued = false;
                });
                dispatchQueued = true;
            }
            const isSubscriptionSliceAction = !!((_b = action.type) == null ? void 0 : _b.startsWith(subscriptionsPrefix));
            const isAdditionalSubscriptionAction = queryThunk.rejected.match(action) && action.meta.condition && !!action.meta.arg.subscribe;
            const actionShouldContinue = !isSubscriptionSliceAction && !isAdditionalSubscriptionAction;
            return [actionShouldContinue, false];
        }
        return [true, false];
    };
};
// src/query/core/buildMiddleware/index.ts
function buildMiddleware(input) {
    const { reducerPath, queryThunk, api, context } = input;
    const { apiUid } = context;
    const actions = {
        invalidateTags: createAction3(`${reducerPath}/invalidateTags`)
    };
    const isThisApiSliceAction = (action) => {
        return !!action && typeof action.type === "string" && action.type.startsWith(`${reducerPath}/`);
    };
    const handlerBuilders = [
        buildDevCheckHandler,
        buildCacheCollectionHandler,
        buildInvalidationByTagsHandler,
        buildPollingHandler,
        buildCacheLifecycleHandler,
        buildQueryLifecycleHandler
    ];
    const middleware = (mwApi) => {
        let initialized2 = false;
        let internalState = {
            currentSubscriptions: {}
        };
        const builderArgs = __spreadProps(__spreadValues({}, input), {
            internalState,
            refetchQuery
        });
        const handlers = handlerBuilders.map((build) => build(builderArgs));
        const batchedActionsHandler = buildBatchedActionsHandler(builderArgs);
        const windowEventsHandler = buildWindowEventHandler(builderArgs);
        return (next) => {
            return (action) => {
                if (!initialized2) {
                    initialized2 = true;
                    mwApi.dispatch(api.internalActions.middlewareRegistered(apiUid));
                }
                const mwApiWithNext = __spreadProps(__spreadValues({}, mwApi), { next });
                const stateBefore = mwApi.getState();
                const [actionShouldContinue, hasSubscription] = batchedActionsHandler(action, mwApiWithNext, stateBefore);
                let res;
                if (actionShouldContinue) {
                    res = next(action);
                }
                else {
                    res = hasSubscription;
                }
                if (!!mwApi.getState()[reducerPath]) {
                    windowEventsHandler(action, mwApiWithNext, stateBefore);
                    if (isThisApiSliceAction(action) || context.hasRehydrationInfo(action)) {
                        for (let handler of handlers) {
                            handler(action, mwApiWithNext, stateBefore);
                        }
                    }
                }
                return res;
            };
        };
    };
    return { middleware, actions };
    function refetchQuery(querySubState, queryCacheKey, override = {}) {
        return queryThunk(__spreadValues({
            type: "query",
            endpointName: querySubState.endpointName,
            originalArgs: querySubState.originalArgs,
            subscribe: false,
            forceRefetch: true,
            queryCacheKey
        }, override));
    }
}
// src/query/tsHelpers.ts
function assertCast(v) {
}
function safeAssign(target, ...args) {
    Object.assign(target, ...args);
}
// src/query/core/module.ts
import { enablePatches } from "immer";
var coreModuleName = /* @__PURE__ */ Symbol();
var coreModule = () => ({
    name: coreModuleName,
    init(api, { baseQuery, tagTypes, reducerPath, serializeQueryArgs, keepUnusedDataFor, refetchOnMountOrArgChange, refetchOnFocus, refetchOnReconnect }, context) {
        enablePatches();
        assertCast(serializeQueryArgs);
        const assertTagType = (tag) => {
            if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
                if (!tagTypes.includes(tag.type)) {
                    console.error(`Tag type '${tag.type}' was used, but not specified in \`tagTypes\`!`);
                }
            }
            return tag;
        };
        Object.assign(api, {
            reducerPath,
            endpoints: {},
            internalActions: {
                onOnline,
                onOffline,
                onFocus,
                onFocusLost
            },
            util: {}
        });
        const { queryThunk, mutationThunk, patchQueryData, updateQueryData, upsertQueryData, prefetch, buildMatchThunkActions } = buildThunks({
            baseQuery,
            reducerPath,
            context,
            api,
            serializeQueryArgs,
            assertTagType
        });
        const { reducer, actions: sliceActions } = buildSlice({
            context,
            queryThunk,
            mutationThunk,
            reducerPath,
            assertTagType,
            config: {
                refetchOnFocus,
                refetchOnReconnect,
                refetchOnMountOrArgChange,
                keepUnusedDataFor,
                reducerPath
            }
        });
        safeAssign(api.util, {
            patchQueryData,
            updateQueryData,
            upsertQueryData,
            prefetch,
            resetApiState: sliceActions.resetApiState
        });
        safeAssign(api.internalActions, sliceActions);
        const { middleware, actions: middlewareActions } = buildMiddleware({
            reducerPath,
            context,
            queryThunk,
            mutationThunk,
            api,
            assertTagType
        });
        safeAssign(api.util, middlewareActions);
        safeAssign(api, { reducer, middleware });
        const { buildQuerySelector, buildMutationSelector, selectInvalidatedBy } = buildSelectors({
            serializeQueryArgs,
            reducerPath
        });
        safeAssign(api.util, { selectInvalidatedBy });
        const { buildInitiateQuery, buildInitiateMutation, getRunningMutationThunk, getRunningMutationsThunk, getRunningQueriesThunk, getRunningQueryThunk, getRunningOperationPromises, removalWarning } = buildInitiate({
            queryThunk,
            mutationThunk,
            api,
            serializeQueryArgs,
            context
        });
        safeAssign(api.util, {
            getRunningOperationPromises,
            getRunningOperationPromise: removalWarning,
            getRunningMutationThunk,
            getRunningMutationsThunk,
            getRunningQueryThunk,
            getRunningQueriesThunk
        });
        return {
            name: coreModuleName,
            injectEndpoint(endpointName, definition) {
                var _a, _b;
                const anyApi = api;
                (_b = (_a = anyApi.endpoints)[endpointName]) != null ? _b : _a[endpointName] = {};
                if (isQueryDefinition(definition)) {
                    safeAssign(anyApi.endpoints[endpointName], {
                        name: endpointName,
                        select: buildQuerySelector(endpointName, definition),
                        initiate: buildInitiateQuery(endpointName, definition)
                    }, buildMatchThunkActions(queryThunk, endpointName));
                }
                else if (isMutationDefinition(definition)) {
                    safeAssign(anyApi.endpoints[endpointName], {
                        name: endpointName,
                        select: buildMutationSelector(),
                        initiate: buildInitiateMutation(endpointName)
                    }, buildMatchThunkActions(mutationThunk, endpointName));
                }
            }
        };
    }
});
// src/query/core/index.ts
var createApi = /* @__PURE__ */ buildCreateApi(coreModule());
export { QueryStatus, buildCreateApi, copyWithStructuralSharing, coreModule, coreModuleName, createApi, defaultSerializeQueryArgs, fakeBaseQuery, fetchBaseQuery, retry, setupListeners, skipSelector, skipToken };
//# sourceMappingURL=rtk-query.modern.js.map