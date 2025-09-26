import type { BaseQueryApi, BaseQueryFn } from './baseQueryTypes';
import type { MaybePromise, Override } from './tsHelpers';
export declare type ResponseHandler = 'content-type' | 'json' | 'text' | ((response: Response) => Promise<any>);
declare type CustomRequestInit = Override<RequestInit, {
    headers?: Headers | string[][] | Record<string, string | undefined> | undefined;
}>;
export interface FetchArgs extends CustomRequestInit {
    url: string;
    params?: Record<string, any>;
    body?: any;
    responseHandler?: ResponseHandler;
    validateStatus?: (response: Response, body: any) => boolean;
    /**
     * A number in milliseconds that represents that maximum time a request can take before timing out.
     */
    timeout?: number;
}
export declare type FetchBaseQueryError = {
    /**
     * * `number`:
     *   HTTP status code
     */
    status: number;
    data: unknown;
} | {
    /**
     * * `"FETCH_ERROR"`:
     *   An error that occurred during execution of `fetch` or the `fetchFn` callback option
     **/
    status: 'FETCH_ERROR';
    data?: undefined;
    error: string;
} | {
    /**
     * * `"PARSING_ERROR"`:
     *   An error happened during parsing.
     *   Most likely a non-JSON-response was returned with the default `responseHandler` "JSON",
     *   or an error occurred while executing a custom `responseHandler`.
     **/
    status: 'PARSING_ERROR';
    originalStatus: number;
    data: string;
    error: string;
} | {
    /**
     * * `"TIMEOUT_ERROR"`:
     *   Request timed out
     **/
    status: 'TIMEOUT_ERROR';
    data?: undefined;
    error: string;
} | {
    /**
     * * `"CUSTOM_ERROR"`:
     *   A custom error type that you can return from your `queryFn` where another error might not make sense.
     **/
    status: 'CUSTOM_ERROR';
    data?: unknown;
    error: string;
};
export declare type FetchBaseQueryArgs = {
    baseUrl?: string;
    prepareHeaders?: (headers: Headers, api: Pick<BaseQueryApi, 'getState' | 'extra' | 'endpoint' | 'type' | 'forced'>) => MaybePromise<Headers | void>;
    fetchFn?: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
    paramsSerializer?: (params: Record<string, any>) => string;
    /**
     * By default, we only check for 'application/json' and 'application/vnd.api+json' as the content-types for json. If you need to support another format, you can pass
     * in a predicate function for your given api to get the same automatic stringifying behavior
     * @example
     * ```ts
     * const isJsonContentType = (headers: Headers) => ["application/vnd.api+json", "application/json", "application/vnd.hal+json"].includes(headers.get("content-type")?.trim());
     * ```
     */
    isJsonContentType?: (headers: Headers) => boolean;
    /**
     * Defaults to `application/json`;
     */
    jsonContentType?: string;
    /**
     * Custom replacer function used when calling `JSON.stringify()`;
     */
    jsonReplacer?: (this: any, key: string, value: any) => any;
} & RequestInit & Pick<FetchArgs, 'responseHandler' | 'validateStatus' | 'timeout'>;
export declare type FetchBaseQueryMeta = {
    request: Request;
    response?: Response;
};
/**
 * This is a very small wrapper around fetch that aims to simplify requests.
 *
 * @example
 * ```ts
 * const baseQuery = fetchBaseQuery({
 *   baseUrl: 'https://api.your-really-great-app.com/v1/',
 *   prepareHeaders: (headers, { getState }) => {
 *     const token = (getState() as RootState).auth.token;
 *     // If we have a token set in state, let's assume that we should be passing it.
 *     if (token) {
 *       headers.set('authorization', `Bearer ${token}`);
 *     }
 *     return headers;
 *   },
 * })
 * ```
 *
 * @param {string} baseUrl
 * The base URL for an API service.
 * Typically in the format of https://example.com/
 *
 * @param {(headers: Headers, api: { getState: () => unknown; extra: unknown; endpoint: string; type: 'query' | 'mutation'; forced: boolean; }) => Headers} prepareHeaders
 * An optional function that can be used to inject headers on requests.
 * Provides a Headers object, as well as most of the `BaseQueryApi` (`dispatch` is not available).
 * Useful for setting authentication or headers that need to be set conditionally.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Headers
 *
 * @param {(input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>} fetchFn
 * Accepts a custom `fetch` function if you do not want to use the default on the window.
 * Useful in SSR environments if you need to use a library such as `isomorphic-fetch` or `cross-fetch`
 *
 * @param {(params: Record<string, unknown>) => string} paramsSerializer
 * An optional function that can be used to stringify querystring parameters.
 *
 * @param {(headers: Headers) => boolean} isJsonContentType
 * An optional predicate function to determine if `JSON.stringify()` should be called on the `body` arg of `FetchArgs`
 *
 * @param {string} jsonContentType Used when automatically setting the content-type header for a request with a jsonifiable body that does not have an explicit content-type header. Defaults to `application/json`.
 *
 * @param {(this: any, key: string, value: any) => any} jsonReplacer Custom replacer function used when calling `JSON.stringify()`.
 *
 * @param {number} timeout
 * A number in milliseconds that represents the maximum time a request can take before timing out.
 */
export declare function fetchBaseQuery({ baseUrl, prepareHeaders, fetchFn, paramsSerializer, isJsonContentType, jsonContentType, jsonReplacer, timeout: defaultTimeout, responseHandler: globalResponseHandler, validateStatus: globalValidateStatus, ...baseFetchOptions }?: FetchBaseQueryArgs): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta>;
export {};
