/**
 * @import {Program} from 'estree'
 * @import {Options} from 'recma-build-jsx'
 * @import {VFile} from 'vfile'
 */

import {buildJsx} from 'estree-util-build-jsx'

/**
 * Plugin to build JSX.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export default function recmaJsx(options) {
  /**
   * @param {Program} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree, file) {
    buildJsx(tree, {filePath: file.history[0], ...options})
  }
}
