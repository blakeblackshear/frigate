import { WebSocketConnectionData } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket';
import { R as RequestHandler } from '../HttpResponse-B4YmE-GJ.mjs';
import { WebSocketHandler } from '../handlers/WebSocketHandler.mjs';
import { UnhandledRequestStrategy } from '../utils/request/onUnhandledRequest.mjs';
import '@mswjs/interceptors';
import '../utils/internal/isIterable.mjs';
import '../typeUtils.mjs';
import 'graphql';
import '../utils/matching/matchRequestUrl.mjs';
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
