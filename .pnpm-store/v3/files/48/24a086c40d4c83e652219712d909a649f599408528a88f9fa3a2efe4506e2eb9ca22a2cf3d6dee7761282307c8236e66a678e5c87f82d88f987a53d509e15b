import type { WebSocketConnectionData } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket'
import { RequestHandler } from '../handlers/RequestHandler'
import { WebSocketHandler } from '../handlers/WebSocketHandler'
import { webSocketInterceptor } from './webSocketInterceptor'
import {
  onUnhandledRequest,
  UnhandledRequestStrategy,
} from '../utils/request/onUnhandledRequest'
import { isHandlerKind } from '../utils/internal/isHandlerKind'

interface HandleWebSocketEventOptions {
  getUnhandledRequestStrategy: () => UnhandledRequestStrategy
  getHandlers: () => Array<RequestHandler | WebSocketHandler>
  onMockedConnection: (connection: WebSocketConnectionData) => void
  onPassthroughConnection: (onnection: WebSocketConnectionData) => void
}

export function handleWebSocketEvent(options: HandleWebSocketEventOptions) {
  webSocketInterceptor.on('connection', async (connection) => {
    const handlers = options.getHandlers().filter(isHandlerKind('EventHandler'))

    // Ignore this connection if the user hasn't defined any handlers.
    if (handlers.length > 0) {
      options?.onMockedConnection(connection)

      await Promise.all(
        handlers.map((handler) => {
          // Iterate over the handlers and forward the connection
          // event to WebSocket event handlers. This is equivalent
          // to dispatching that event onto multiple listeners.
          return handler.run(connection)
        }),
      )

      return
    }

    // Construct a request representing this WebSocket connection.
    const request = new Request(connection.client.url, {
      headers: {
        upgrade: 'websocket',
        connection: 'upgrade',
      },
    })
    await onUnhandledRequest(
      request,
      options.getUnhandledRequestStrategy(),
    ).catch((error) => {
      const errorEvent = new Event('error')
      Object.defineProperty(errorEvent, 'cause', {
        enumerable: true,
        configurable: false,
        value: error,
      })
      connection.client.socket.dispatchEvent(errorEvent)
    })

    options?.onPassthroughConnection(connection)

    // If none of the "ws" handlers matched,
    // establish the WebSocket connection as-is.
    connection.server.connect()
  })
}
