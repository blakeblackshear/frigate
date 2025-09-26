import { Emitter } from 'strict-event-emitter'
import type { DeferredPromise } from '@open-draft/deferred-promise'
import {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
  SharedOptions,
} from '~/core/sharedOptions'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import type { HttpRequestEventMap, Interceptor } from '@mswjs/interceptors'
import type { RequiredDeep } from '~/core/typeUtils'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import type { WorkerChannel } from '../utils/workerChannel'

export interface StringifiedResponse extends ResponseInit {
  body: string | ArrayBuffer | ReadableStream<Uint8Array> | null
}

export type SetupWorkerInternalContext = {
  isMockingEnabled: boolean
  workerStoppedAt?: number
  startOptions: RequiredDeep<StartOptions>
  workerPromise: DeferredPromise<ServiceWorker>
  registration: ServiceWorkerRegistration | undefined
  getRequestHandlers: () => Array<RequestHandler | WebSocketHandler>
  emitter: Emitter<LifeCycleEventsMap>
  keepAliveInterval?: number
  workerChannel: WorkerChannel
  supports: {
    serviceWorkerApi: boolean
    readableStreamTransfer: boolean
  }
  fallbackInterceptor?: Interceptor<HttpRequestEventMap>
}

export type ServiceWorkerInstanceTuple = [
  ServiceWorker | null,
  ServiceWorkerRegistration,
]

export type FindWorker = (
  scriptUrl: string,
  mockServiceWorkerUrl: string,
) => boolean

export interface StartOptions extends SharedOptions {
  /**
   * Service Worker registration options.
   */
  serviceWorker?: {
    /**
     * Custom url to the worker script.
     * @default "/mockServiceWorker.js"
     */
    url?: string
    options?: RegistrationOptions
  }

  /**
   * Disables the logging of the intercepted requests
   * into browser's console.
   * @default false
   */
  quiet?: boolean

  /**
   * Defers any network requests until the Service Worker
   * instance is activated.
   * @default true
   */
  waitUntilReady?: boolean

  /**
   * A custom lookup function to find a Mock Service Worker in the list
   * of all registered Service Workers on the page.
   */
  findWorker?: FindWorker
}

export type StartReturnType = Promise<ServiceWorkerRegistration | undefined>

export type StartHandler = (
  options: RequiredDeep<StartOptions>,
  initialOptions: StartOptions,
) => StartReturnType

export type StopHandler = () => void

export interface SetupWorker {
  /**
   * Registers and activates the mock Service Worker.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/start `worker.start()` API reference}
   */
  start: (options?: StartOptions) => StartReturnType

  /**
   * Stops requests interception for the current client.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/stop `worker.stop()` API reference}
   */
  stop: StopHandler

  /**
   * Prepends given request handlers to the list of existing handlers.
   * @param {RequestHandler[]} handlers List of runtime request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/use `worker.use()` API reference}
   */
  use: (...handlers: Array<RequestHandler | WebSocketHandler>) => void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/restore-handlers `worker.restoreHandlers()` API reference}
   */
  restoreHandlers: () => void

  /**
   * Resets request handlers to the initial list given to the `setupWorker` call, or to the explicit next request handlers list, if given.
   * @param {RequestHandler[]} nextHandlers List of the new initial request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/reset-handlers `worker.resetHandlers()` API reference}
   */
  resetHandlers: (
    ...nextHandlers: Array<RequestHandler | WebSocketHandler>
  ) => void

  /**
   * Returns a readonly list of currently active request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/list-handlers `worker.listHandlers()` API reference}
   */
  listHandlers(): ReadonlyArray<RequestHandler | WebSocketHandler>

  /**
   * Life-cycle events.
   * Life-cycle events allow you to subscribe to the internal library events occurring during the request/response handling.
   *
   * @see {@link https://mswjs.io/docs/api/life-cycle-events Life-cycle Events API reference}
   */
  events: LifeCycleEventEmitter<LifeCycleEventsMap>
}
