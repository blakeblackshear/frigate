import { devUtils } from '~/core/utils/internal/devUtils'
import { getWorkerInstance } from './utils/getWorkerInstance'
import { enableMocking } from './utils/enableMocking'
import type { SetupWorkerInternalContext, StartHandler } from '../glossary'
import { createRequestListener } from './createRequestListener'
import { checkWorkerIntegrity } from '../../utils/checkWorkerIntegrity'
import { createResponseListener } from './createResponseListener'
import { validateWorkerScope } from './utils/validateWorkerScope'
import { DeferredPromise } from '@open-draft/deferred-promise'

export const createStartHandler = (
  context: SetupWorkerInternalContext,
): StartHandler => {
  return function start(options, customOptions) {
    const startWorkerInstance = async () => {
      // Remove all previously existing event listeners.
      // This way none of the listeners persists between Fast refresh
      // of the application's code.
      context.workerChannel.removeAllListeners()

      // Handle requests signaled by the worker.
      context.workerChannel.on(
        'REQUEST',
        createRequestListener(context, options),
      )

      // Handle responses signaled by the worker.
      context.workerChannel.on('RESPONSE', createResponseListener(context))

      const instance = await getWorkerInstance(
        options.serviceWorker.url,
        options.serviceWorker.options,
        options.findWorker,
      )

      const [worker, registration] = instance

      if (!worker) {
        const missingWorkerMessage = customOptions?.findWorker
          ? devUtils.formatMessage(
              `Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "%s".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker
`,
              options.serviceWorker.url,
            )
          : devUtils.formatMessage(
              `Failed to locate the Service Worker registration.

This most likely means that the worker script URL "%s" cannot resolve against the actual public hostname (%s). This may happen if your application runs behind a proxy, or has a dynamic hostname.

Please consider using a custom "serviceWorker.url" option to point to the actual worker script location, or a custom "findWorker" option to resolve the Service Worker registration manually. More details: https://mswjs.io/docs/api/setup-worker/start`,
              options.serviceWorker.url,
              location.host,
            )

        throw new Error(missingWorkerMessage)
      }

      context.workerPromise.resolve(worker)
      context.registration = registration

      window.addEventListener('beforeunload', () => {
        if (worker.state !== 'redundant') {
          // Notify the Service Worker that this client has closed.
          // Internally, it's similar to disabling the mocking, only
          // client close event has a handler that self-terminates
          // the Service Worker when there are no open clients.
          context.workerChannel.postMessage('CLIENT_CLOSED')
        }

        // Make sure we're always clearing the interval - there are reports that not doing this can
        // cause memory leaks in headless browser environments.
        window.clearInterval(context.keepAliveInterval)

        // Notify others about this client disconnecting.
        // E.g. this will purge the in-memory WebSocket clients since
        // starting the worker again will assign them new IDs.
        window.postMessage({ type: 'msw/worker:stop' })
      })

      // Check if the active Service Worker has been generated
      // by the currently installed version of MSW.
      await checkWorkerIntegrity(context).catch((error) => {
        devUtils.error(
          'Error while checking the worker script integrity. Please report this on GitHub (https://github.com/mswjs/msw/issues) and include the original error below.',
        )
        console.error(error)
      })

      context.keepAliveInterval = window.setInterval(
        () => context.workerChannel.postMessage('KEEPALIVE_REQUEST'),
        5000,
      )

      // Warn the user when loading the page that lies outside
      // of the worker's scope.
      validateWorkerScope(registration, context.startOptions)

      return registration
    }

    const workerRegistration = startWorkerInstance().then(
      async (registration) => {
        const pendingInstance = registration.installing || registration.waiting

        if (pendingInstance) {
          const activationPromise = new DeferredPromise<void>()

          pendingInstance.addEventListener('statechange', () => {
            if (pendingInstance.state === 'activated') {
              activationPromise.resolve()
            }
          })

          // Wait until the worker is activated.
          // Assume the worker is already activated if there's no pending registration
          // (i.e. when reloading the page after a successful activation).
          await activationPromise
        }

        // Print the activation message only after the worker has been activated.
        await enableMocking(context, options).catch((error) => {
          devUtils.error(
            'Failed to enable mocking. Please report this on GitHub (https://github.com/mswjs/msw/issues) and include the original error below.',
          )
          throw error
        })

        return registration
      },
    )

    return workerRegistration
  }
}
