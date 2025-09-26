/**
 * @typedef {typeof import('acorn').Parser} ParserClass
 * @typedef {import('acorn').Position} Position
 * @typedef {import('estree-jsx').Comment} Comment
 * @typedef {import('estree-jsx').Program} Program
 */

/**
 * @typedef {Uint8Array | string} Value
 *   Input value
 *
 *   When a typed array, must be UTF-8.
 *
 * @typedef AcornErrorFields
 *   Extra fields in acorn errors.
 * @property {number} pos
 *   Index.
 * @property {Position} loc
 *   Acorn position.
 *
 * @typedef {Error & AcornErrorFields} AcornError
 *   Acorn error.
 *
 * @callback Plugin
 *   Acorn plugin.
 * @param {ParserClass} Parser
 *   Base parser class.
 * @returns {ParserClass}
 *   Resulting parser class.
 *
 * @typedef {2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 'latest'} Version
 *   JavaScript version.
 *
 *   `'latest'` is equivalent to the latest supported year.
 *
 * @typedef Options
 *   Configuration.
 * @property {Version | null | undefined} [version='latest']
 *   JavaScript version (year between 2015 and 2023 or `'latest'`,
 *   default: `'latest'`).
 *
 *   When a number, must be a year in the range `2015` and `2023` (both
 *   including).
 *   `'latest'` is the same as passing the latest supported year.
 *
 *   > ☢️ **Danger**: `'latest'` is a sliding thing, you could consider it as
 *   > breaking semver.
 *   > Pass an actual year to lock that down.
 * @property {boolean | null | undefined} [module=false]
 *   Whether this is a module (ESM) or a script (default: `false`).
 * @property {boolean | null | undefined} [allowReturnOutsideFunction=false]
 *   Whether a return statement is allowed in the top scope (default: `false`).
 * @property {boolean | null | undefined} [allowImportExportEverywhere=false]
 *   Whether import/export statements are allowed in the every scope (default:
 *   `false`).
 * @property {boolean | null | undefined} [allowAwaitOutsideFunction]
 *   Whether `await` is allowed in the top scope (default: `version >= 2022`).
 * @property {boolean | null | undefined} [allowSuperOutsideMethod=false]
 *   Whether `super` is allowed outside methods (default: `false`).
 * @property {boolean | null | undefined} [allowHashBang=false]
 *   Whether a shell hasbang is allowed (default: `false`).
 * @property {Array<Plugin> | null | undefined} [plugins=[]]
 *   List of acorn plugins (default: `[]`); examples are `acorn-jsx` and
 *   `acorn-stage3`.
 */

import {Parser} from 'acorn'
import {fromEstree} from 'esast-util-from-estree'
import {VFileMessage} from 'vfile-message'

/**
 * Parse JavaScript to an esast.
 *
 * @param {Value} value
 *   Serialized JavaScript to parse.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Program}
 *   Program node (as esast).
 */
export function fromJs(value, options) {
  const options_ = options || {}
  /** @type {ParserClass} */
  let parser = Parser
  /** @type {Array<Comment>} */
  const comments = []
  /** @type {Program} */
  let tree

  if (options_.plugins) {
    parser = parser.extend(...options_.plugins)
  }

  const text =
    typeof value === 'string'
      ? value.toString()
      : new TextDecoder().decode(value)

  try {
    // @ts-expect-error: Acorn looks enough like estree.
    tree = parser.parse(text, {
      ecmaVersion: options_.version || 'latest',
      sourceType: options_.module ? 'module' : 'script',
      allowReturnOutsideFunction:
        options_.allowReturnOutsideFunction || undefined,
      allowImportExportEverywhere:
        options_.allowImportExportEverywhere || undefined,
      allowAwaitOutsideFunction:
        options_.allowAwaitOutsideFunction || undefined,
      allowHashBang: options_.allowHashBang || undefined,
      allowSuperOutsideMethod: options_.allowSuperOutsideMethod || undefined,
      locations: true,
      // @ts-expect-error: Acorn looks enough like estree.
      onComment: comments
    })
  } catch (error) {
    const cause = /** @type {AcornError} */ (error)

    const message = new VFileMessage('Could not parse JavaScript with Acorn', {
      cause,
      place: {
        line: cause.loc.line,
        column: cause.loc.column + 1,
        offset: cause.pos
      },
      ruleId: 'acorn',
      source: 'esast-util-from-js'
    })

    message.url = 'https://github.com/syntax-tree/esast-util-from-js#throws'

    throw message
  }

  tree.comments = comments

  return fromEstree(tree)
}
