import { WebSocketConnectionData } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket';
import { R as RequestHandler } from '../HttpResponse-BbwAqLE_.js';
import { WebSocketHandler } from '../handlers/WebSocketHandler.js';
import { UnhandledRequestStrategy } from '../utils/request/onUnhandledRequest.js';
import '@mswjs/interceptors';
import '../utils/internal/isIterable.js';
import '../typeUtils.js';
import 'graphql';
import '../utils/matching/matchRequestUrl.js';
import 'strict-event-emitter';
import '@mswjs/interceptors/WebSocket';

interface HandleWebSocketEventOptions {
    getUnhandledRequestStrategy: () => UnhandledRequestStrategy;
    getHandlers: () => Array<RequestHandler | WebSocketHandler>;
    onMockedConnection: (connection: WebSocketConnectionData) => void;
    onPassthroughConnection: (onnection: WebSocketConnectionData) => void;
}
declare function handleWebSocketEvent(options: HandleWebSocketEventOptions): void;

export { handleWebSocketEvent };
