import { PartialDeep } from 'type-fest';
import { RequestHandler } from "../core/handlers/RequestHandler";
import { WebSocketHandler } from "../core/handlers/WebSocketHandler";
import { SharedOptions, LifeCycleEventEmitter, LifeCycleEventsMap } from "../core/sharedOptions";
import { BatchInterceptor, Interceptor, HttpRequestEventMap } from '@mswjs/interceptors';
import { SetupApi } from "../core/SetupApi";

interface SetupServerCommon {
    /**
     * Starts requests interception based on the previously provided request handlers.
     *
     * @see {@link https://mswjs.io/docs/api/setup-server/listen `server.listen()` API reference}
     */
    listen(options?: PartialDeep<SharedOptions>): void;
    /**
     * Stops requests interception by restoring all augmented modules.
     *
     * @see {@link https://mswjs.io/docs/api/setup-server/close `server.close()` API reference}
     */
    close(): void;
    /**
     * Prepends given request handlers to the list of existing handlers.
     *
     * @see {@link https://mswjs.io/docs/api/setup-server/use `server.use()` API reference}
     */
    use(...handlers: Array<RequestHandler | WebSocketHandler>): void;
    /**
     * Marks all request handlers that respond using `res.once()` as unused.
     *
     * @see {@link https://mswjs.io/docs/api/setup-server/restore-handlers `server.restore-handlers()` API reference}
     */
    restoreHandlers(): void;
    /**
     * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
     *
     * @see {@link https://mswjs.io/docs/api/setup-server/reset-handlers `server.reset-handlers()` API reference}
     */
    resetHandlers(...nextHandlers: Array<RequestHandler | WebSocketHandler>): void;
    /**
     * Returns a readonly list of currently active request handlers.
     *
     * @see {@link https://mswjs.io/docs/api/setup-server/list-handlers `server.listHandlers()` API reference}
     */
    listHandlers(): ReadonlyArray<RequestHandler | WebSocketHandler>;
    /**
     * Life-cycle events.
     * Life-cycle events allow you to subscribe to the internal library events occurring during the request/response handling.
     *
     * @see {@link https://mswjs.io/docs/api/life-cycle-events Life-cycle Events API reference}
     */
    events: LifeCycleEventEmitter<LifeCycleEventsMap>;
}
interface SetupServer extends SetupServerCommon {
    /**
     * Wraps the given function in a boundary. Any changes to the
     * network behavior (e.g. adding runtime request handlers via
     * `server.use()`) will be scoped to this boundary only.
     * @param callback A function to run (e.g. a test)
     *
     * @see {@link https://mswjs.io/docs/api/setup-server/boundary `server.boundary()` API reference}
     */
    boundary<Args extends Array<any>, R>(callback: (...args: Args) => R): (...args: Args) => R;
}

declare class SetupServerCommonApi extends SetupApi<LifeCycleEventsMap> implements SetupServerCommon {
    protected readonly interceptor: BatchInterceptor<Array<Interceptor<HttpRequestEventMap>>, HttpRequestEventMap>;
    private resolvedOptions;
    constructor(interceptors: Array<Interceptor<HttpRequestEventMap>>, handlers: Array<RequestHandler | WebSocketHandler>);
    /**
     * Subscribe to all requests that are using the interceptor object
     */
    private init;
    listen(options?: Partial<SharedOptions>): void;
    close(): void;
}

declare class SetupServerApi extends SetupServerCommonApi implements SetupServer {
    constructor(handlers: Array<RequestHandler | WebSocketHandler>, interceptors?: Array<Interceptor<HttpRequestEventMap>>);
    boundary<Args extends Array<any>, R>(callback: (...args: Args) => R): (...args: Args) => R;
    close(): void;
}

/**
 * Sets up a requests interception in Node.js with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
declare const setupServer: (...handlers: Array<RequestHandler | WebSocketHandler>) => SetupServerApi;

export { type SetupServer, SetupServerApi, setupServer };
