import { DeferredPromise } from '@open-draft/deferred-promise'
import type { StartOptions, SetupWorkerInternalContext } from '../../glossary'
import { printStartMessage } from './printStartMessage'

/**
 * Signals the worker to enable the interception of requests.
 */
export function enableMocking(
  context: SetupWorkerInternalContext,
  options: StartOptions,
): Promise<boolean> {
  const mockingEnabledPromise = new DeferredPromise<boolean>()

  context.workerChannel.postMessage('MOCK_ACTIVATE')
  context.workerChannel.once('MOCKING_ENABLED', async (event) => {
    context.isMockingEnabled = true
    const worker = await context.workerPromise

    printStartMessage({
      quiet: options.quiet,
      workerScope: context.registration?.scope,
      workerUrl: worker.scriptURL,
      client: event.data.client,
    })

    mockingEnabledPromise.resolve(true)
  })

  return mockingEnabledPromise
}
