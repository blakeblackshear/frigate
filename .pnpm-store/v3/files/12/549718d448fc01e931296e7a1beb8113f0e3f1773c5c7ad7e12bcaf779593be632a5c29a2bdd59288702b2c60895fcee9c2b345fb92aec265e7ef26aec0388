import type { Emitter } from 'strict-event-emitter'
import type { UnhandledRequestStrategy } from './utils/request/onUnhandledRequest'

export interface SharedOptions {
  /**
   * Specifies how to react to a request that has no corresponding
   * request handler. Warns on unhandled requests by default.
   *
   * @example worker.start({ onUnhandledRequest: 'bypass' })
   * @example worker.start({ onUnhandledRequest: 'warn' })
   * @example server.listen({ onUnhandledRequest: 'error' })
   */
  onUnhandledRequest?: UnhandledRequestStrategy
}

export type LifeCycleEventsMap = {
  'request:start': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'request:match': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'request:unhandled': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'request:end': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'response:mocked': [
    args: {
      response: Response
      request: Request
      requestId: string
    },
  ]
  'response:bypass': [
    args: {
      response: Response
      request: Request
      requestId: string
    },
  ]
  unhandledException: [
    args: {
      error: Error
      request: Request
      requestId: string
    },
  ]
}

export type LifeCycleEventEmitter<
  EventsMap extends Record<string | symbol, any>,
> = Pick<Emitter<EventsMap>, 'on' | 'removeListener' | 'removeAllListeners'>
