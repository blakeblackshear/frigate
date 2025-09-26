import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import type {
  SetupWorkerInternalContext,
  StartReturnType,
  StartOptions,
  SetupWorker,
} from './glossary'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { DEFAULT_START_OPTIONS } from './start/utils/prepareStartHandler'
import { createStartHandler } from './start/createStartHandler'
import { devUtils } from '~/core/utils/internal/devUtils'
import { SetupApi } from '~/core/SetupApi'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import type { LifeCycleEventsMap } from '~/core/sharedOptions'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { supportsReadableStreamTransfer } from '../utils/supportsReadableStreamTransfer'
import { webSocketInterceptor } from '~/core/ws/webSocketInterceptor'
import { handleWebSocketEvent } from '~/core/ws/handleWebSocketEvent'
import { attachWebSocketLogger } from '~/core/ws/utils/attachWebSocketLogger'
import { WorkerChannel } from '../utils/workerChannel'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { createFallbackRequestListener } from './start/createFallbackRequestListener'
import { printStartMessage } from './start/utils/printStartMessage'
import { printStopMessage } from './stop/utils/printStopMessage'

export class SetupWorkerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupWorker
{
  private context: SetupWorkerInternalContext

  constructor(...handlers: Array<RequestHandler | WebSocketHandler>) {
    super(...handlers)

    invariant(
      !isNodeProcess(),
      devUtils.formatMessage(
        'Failed to execute `setupWorker` in a non-browser environment. Consider using `setupServer` for Node.js environment instead.',
      ),
    )

    this.context = this.createWorkerContext()
  }

  private createWorkerContext(): SetupWorkerInternalContext {
    const workerPromise = new DeferredPromise<ServiceWorker>()

    return {
      // Mocking is not considered enabled until the worker
      // signals back the successful activation event.
      isMockingEnabled: false,
      startOptions: null as any,
      workerPromise,
      registration: undefined,
      getRequestHandlers: () => {
        return this.handlersController.currentHandlers()
      },
      emitter: this.emitter,
      workerChannel: new WorkerChannel({
        worker: workerPromise,
      }),
      supports: {
        serviceWorkerApi:
          'serviceWorker' in navigator && location.protocol !== 'file:',
        readableStreamTransfer: supportsReadableStreamTransfer(),
      },
    }
  }

  public async start(options: StartOptions = {}): StartReturnType {
    if ('waitUntilReady' in options) {
      devUtils.warn(
        'The "waitUntilReady" option has been deprecated. Please remove it from this "worker.start()" call. Follow the recommended Browser integration (https://mswjs.io/docs/integrations/browser) to eliminate any race conditions between the Service Worker registration and any requests made by your application on initial render.',
      )
    }

    // Warn the developer on multiple "worker.start()" calls.
    // While this will not affect the worker in any way,
    // it likely indicates an issue with the developer's code.
    if (this.context.isMockingEnabled) {
      devUtils.warn(
        `Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.`,
      )
      return this.context.registration
    }

    this.context.workerStoppedAt = undefined

    this.context.startOptions = mergeRight(
      DEFAULT_START_OPTIONS,
      options,
    ) as SetupWorkerInternalContext['startOptions']

    // Enable the WebSocket interception.
    handleWebSocketEvent({
      getUnhandledRequestStrategy: () => {
        return this.context.startOptions.onUnhandledRequest
      },
      getHandlers: () => {
        return this.handlersController.currentHandlers()
      },
      onMockedConnection: (connection) => {
        if (!this.context.startOptions.quiet) {
          // Attach the logger for mocked connections since
          // those won't be visible in the browser's devtools.
          attachWebSocketLogger(connection)
        }
      },
      onPassthroughConnection() {},
    })
    webSocketInterceptor.apply()

    this.subscriptions.push(() => {
      webSocketInterceptor.dispose()
    })

    // Use a fallback interception algorithm in the environments
    // where the Service Worker API isn't supported.
    if (!this.context.supports.serviceWorkerApi) {
      const fallbackInterceptor = createFallbackRequestListener(
        this.context,
        this.context.startOptions,
      )

      this.subscriptions.push(() => {
        fallbackInterceptor.dispose()
      })

      this.context.isMockingEnabled = true

      printStartMessage({
        message: 'Mocking enabled (fallback mode).',
        quiet: this.context.startOptions.quiet,
      })

      return undefined
    }

    const startHandler = createStartHandler(this.context)
    const registration = await startHandler(this.context.startOptions, options)

    this.context.isMockingEnabled = true

    return registration
  }

  public stop(): void {
    super.dispose()

    if (!this.context.isMockingEnabled) {
      devUtils.warn(
        'Found a redundant "worker.stop()" call. Notice that stopping the worker after it has already been stopped has no effect. Consider removing this "worker.stop()" call.',
      )
      return
    }

    this.context.isMockingEnabled = false
    this.context.workerStoppedAt = Date.now()
    this.context.emitter.removeAllListeners()

    if (this.context.supports.serviceWorkerApi) {
      this.context.workerChannel.removeAllListeners('RESPONSE')
      window.clearInterval(this.context.keepAliveInterval)
    }

    // Post the internal stop message on the window
    // to let any logic know when the worker has stopped.
    // E.g. the WebSocket client manager needs this to know
    // when to clear its in-memory clients list.
    window.postMessage({ type: 'msw/worker:stop' })

    printStopMessage({
      quiet: this.context.startOptions?.quiet,
    })
  }
}

/**
 * Sets up a requests interception in the browser with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker()` API reference}
 */
export function setupWorker(
  ...handlers: Array<RequestHandler | WebSocketHandler>
): SetupWorker {
  return new SetupWorkerApi(...handlers)
}
