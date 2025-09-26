import { type LoadFunc, type LocalizeFunc } from 'vscode-nls'

const localize: LocalizeFunc = (key, message, ...args) =>
  args.length === 0
    ? message
    : message.replaceAll(/{(\d+)}/g, (match, [index]) =>
        index in args ? String(args[index]) : match
      )

/**
 * Get {@link localize}
 *
 * @returns
 *   See {@link localize}
 */
export function loadMessageBundle(): LocalizeFunc {
  return localize
}

/**
 * Get {@link loadMessageBundle}
 *
 * @returns
 *   See {@link loadMessageBundle}
 */
export function config(): LoadFunc {
  return loadMessageBundle
}
