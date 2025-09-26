/**
 * @import {Root} from 'hast'
 */

import {visit} from 'unist-util-visit'

/**
 * A tiny plugin that removes raw HTML.
 *
 * This is needed if the format is `md` and `rehype-raw` was not used to parse
 * dangerous HTML into nodes.
 *
 * @returns
 *   Transform.
 */
export function rehypeRemoveRaw() {
  /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree) {
    visit(tree, 'raw', function (_, index, parent) {
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1)
        return index
      }
    })
  }
}
