import type { ServiceWorkerIncomingEventsMap } from '../../glossary'
import { devUtils } from '~/core/utils/internal/devUtils'

interface PrintStartMessageArgs {
  quiet?: boolean
  message?: string
  workerUrl?: string
  workerScope?: string
  client?: ServiceWorkerIncomingEventsMap['MOCKING_ENABLED']['client']
}

/**
 * Prints a worker activation message in the browser's console.
 */
export function printStartMessage(args: PrintStartMessageArgs = {}) {
  if (args.quiet) {
    return
  }

  const message = args.message || 'Mocking enabled.'

  console.groupCollapsed(
    `%c${devUtils.formatMessage(message)}`,
    'color:orangered;font-weight:bold;',
  )
  // eslint-disable-next-line no-console
  console.log(
    '%cDocumentation: %chttps://mswjs.io/docs',
    'font-weight:bold',
    'font-weight:normal',
  )
  // eslint-disable-next-line no-console
  console.log('Found an issue? https://github.com/mswjs/msw/issues')

  if (args.workerUrl) {
    // eslint-disable-next-line no-console
    console.log('Worker script URL:', args.workerUrl)
  }

  if (args.workerScope) {
    // eslint-disable-next-line no-console
    console.log('Worker scope:', args.workerScope)
  }

  if (args.client) {
    // eslint-disable-next-line no-console
    console.log('Client ID: %s (%s)', args.client.id, args.client.frameType)
  }

  console.groupEnd()
}
