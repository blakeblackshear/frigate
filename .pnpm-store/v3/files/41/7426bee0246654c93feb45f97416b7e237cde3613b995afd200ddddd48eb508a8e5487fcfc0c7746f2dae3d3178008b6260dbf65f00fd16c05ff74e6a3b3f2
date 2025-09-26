/**
 * @import {Root} from 'hast'
 * @import {Program} from 'estree'
 * @import {Options} from 'rehype-recma'
 */

import {toEstree} from 'hast-util-to-estree'

/**
 * Plugin to transform HTML (hast) to JS (estree).
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export default function rehypeRecma(options) {
  /**
   * @param {Root} tree
   *   Tree (hast).
   * @returns {Program}
   *   Program (esast).
   */
  return function (tree) {
    return toEstree(tree, options)
  }
}
