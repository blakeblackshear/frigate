import { EventMap, Emitter } from 'strict-event-emitter';
import { R as RequestHandler } from './HttpResponse-BbwAqLE_.js';
import { LifeCycleEventEmitter } from './sharedOptions.js';
import { Disposable } from './utils/internal/Disposable.js';
import { WebSocketHandler } from './handlers/WebSocketHandler.js';
import '@mswjs/interceptors';
import './utils/internal/isIterable.js';
import './typeUtils.js';
import 'graphql';
import './utils/matching/matchRequestUrl.js';
import './utils/request/onUnhandledRequest.js';
import '@mswjs/interceptors/WebSocket';

declare abstract class HandlersController {
    abstract prepend(runtimeHandlers: Array<RequestHandler | WebSocketHandler>): void;
    abstract reset(nextHandles: Array<RequestHandler | WebSocketHandler>): void;
    abstract currentHandlers(): Array<RequestHandler | WebSocketHandler>;
}
declare class InMemoryHandlersController implements HandlersController {
    private initialHandlers;
    private handlers;
    constructor(initialHandlers: Array<RequestHandler | WebSocketHandler>);
    prepend(runtimeHandles: Array<RequestHandler | WebSocketHandler>): void;
    reset(nextHandlers: Array<RequestHandler | WebSocketHandler>): void;
    currentHandlers(): Array<RequestHandler | WebSocketHandler>;
}
/**
 * Generic class for the mock API setup.
 */
declare abstract class SetupApi<EventsMap extends EventMap> extends Disposable {
    protected handlersController: HandlersController;
    protected readonly emitter: Emitter<EventsMap>;
    protected readonly publicEmitter: Emitter<EventsMap>;
    readonly events: LifeCycleEventEmitter<EventsMap>;
    constructor(...initialHandlers: Array<RequestHandler | WebSocketHandler>);
    private validateHandlers;
    use(...runtimeHandlers: Array<RequestHandler | WebSocketHandler>): void;
    restoreHandlers(): void;
    resetHandlers(...nextHandlers: Array<RequestHandler | WebSocketHandler>): void;
    listHandlers(): ReadonlyArray<RequestHandler | WebSocketHandler>;
    private createLifeCycleEvents;
}

export { HandlersController, InMemoryHandlersController, SetupApi };
