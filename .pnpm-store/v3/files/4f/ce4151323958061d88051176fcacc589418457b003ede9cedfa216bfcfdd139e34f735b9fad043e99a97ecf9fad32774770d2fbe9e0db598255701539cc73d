/**
 * @import {Options} from 'esast-util-from-js'
 * @import {Program} from 'estree'
 * @import {Processor} from 'unified'
 */

import {fromJs} from 'esast-util-from-js'

/**
 * Plugin to add support for parsing from JavaScript.
 *
 * @this {Processor<Program>}
 *   Processor instance.
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export default function rehypeParse(options) {
  const self = this

  self.parser = parser

  /**
   * @param {string} value
   *   JavaScript.
   * @returns {Program}
   *   Tree.
   */
  function parser(value) {
    return fromJs(value, {...self.data('settings'), ...options})
  }
}
