/**
 * @import {Program} from 'estree'
 * @import {Options} from 'recma-stringify'
 * @import {Processor} from 'unified'
 * @import {VFile} from 'vfile'
 */

import {toJs} from 'estree-util-to-js'

/**
 * Plugin to add support for serializing as JavaScript.
 *
 * @this {Processor<undefined, undefined, undefined, Program, string>}
 *   Processor instance.
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export default function recmaStringify(options) {
  const self = this

  this.compiler = compiler

  /**
   * @param {Program} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {string}
   *   JavaScript.
   */
  function compiler(tree, file) {
    const settings = {...self.data('settings'), ...options}
    const result = toJs(tree, {
      SourceMapGenerator: settings.SourceMapGenerator,
      filePath: file.path || 'unknown.js',
      handlers: settings.handlers
    })

    file.map = result.map

    return result.value
  }
}
