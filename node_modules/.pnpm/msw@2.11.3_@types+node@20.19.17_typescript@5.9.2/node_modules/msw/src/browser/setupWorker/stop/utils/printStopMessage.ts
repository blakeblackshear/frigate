import { devUtils } from '~/core/utils/internal/devUtils'

export function printStopMessage(args: { quiet?: boolean } = {}): void {
  if (args.quiet) {
    return
  }

  // eslint-disable-next-line no-console
  console.log(
    `%c${devUtils.formatMessage('Mocking disabled.')}`,
    'color:orangered;font-weight:bold;',
  )
}
