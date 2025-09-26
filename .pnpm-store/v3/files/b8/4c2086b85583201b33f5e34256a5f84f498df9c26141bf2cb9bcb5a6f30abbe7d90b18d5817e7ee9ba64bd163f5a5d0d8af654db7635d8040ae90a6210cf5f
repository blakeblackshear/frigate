import { EventMap, Emitter } from 'strict-event-emitter';
import { R as RequestHandler } from './HttpResponse-B4YmE-GJ.mjs';
import { LifeCycleEventEmitter } from './sharedOptions.mjs';
import { Disposable } from './utils/internal/Disposable.mjs';
import { WebSocketHandler } from './handlers/WebSocketHandler.mjs';
import '@mswjs/interceptors';
import './utils/internal/isIterable.mjs';
import './typeUtils.mjs';
import 'graphql';
import './utils/matching/matchRequestUrl.mjs';
import './utils/request/onUnhandledRequest.mjs';
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
