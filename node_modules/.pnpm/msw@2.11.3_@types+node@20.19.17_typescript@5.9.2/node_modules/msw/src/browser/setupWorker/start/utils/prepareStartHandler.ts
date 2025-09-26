import { RequiredDeep } from '~/core/typeUtils'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import {
  SetupWorker,
  SetupWorkerInternalContext,
  StartHandler,
  StartOptions,
} from '../../glossary'

export const DEFAULT_START_OPTIONS: RequiredDeep<StartOptions> = {
  serviceWorker: {
    url: '/mockServiceWorker.js',
    options: null as any,
  },
  quiet: false,
  waitUntilReady: true,
  onUnhandledRequest: 'warn',
  findWorker(scriptURL, mockServiceWorkerUrl) {
    return scriptURL === mockServiceWorkerUrl
  },
}

/**
 * Returns resolved worker start options, merging the default options
 * with the given custom options.
 */
export function resolveStartOptions(
  initialOptions?: StartOptions,
): RequiredDeep<StartOptions> {
  return mergeRight(
    DEFAULT_START_OPTIONS,
    initialOptions || {},
  ) as RequiredDeep<StartOptions>
}

export function prepareStartHandler(
  handler: StartHandler,
  context: SetupWorkerInternalContext,
): SetupWorker['start'] {
  return (initialOptions) => {
    context.startOptions = resolveStartOptions(initialOptions)
    return handler(context.startOptions, initialOptions || {})
  }
}
