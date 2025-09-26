/**
 * @import {MdxjsEsmHast as MdxjsEsm} from 'mdast-util-mdxjs-esm'
 * @import {State} from 'hast-util-to-estree'
 */

import {attachComments} from 'estree-util-attach-comments'

/**
 * Handle an MDX ESM node.
 *
 * @param {MdxjsEsm} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
export function mdxjsEsm(node, state) {
  const estree = node.data && node.data.estree
  const comments = (estree && estree.comments) || []

  if (estree) {
    state.comments.push(...comments)
    attachComments(estree, comments)
    state.esm.push(...estree.body)
  }
}
