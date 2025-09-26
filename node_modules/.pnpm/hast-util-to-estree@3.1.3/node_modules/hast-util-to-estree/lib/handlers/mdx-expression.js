/**
 * @import {
 *   JSXEmptyExpression as JsxEmptyExpression,
 *   JSXExpressionContainer as JsxExpressionContainer
 * } from 'estree-jsx'
 * @import {Expression} from 'estree'
 * @import {
 *   MdxFlowExpressionHast as MdxFlowExpression,
 *   MdxTextExpressionHast as MdxTextExpression
 * } from 'mdast-util-mdx-expression'
 * @import {State} from 'hast-util-to-estree'
 */

import {attachComments} from 'estree-util-attach-comments'

/**
 * Turn an MDX expression node into an estree node.
 *
 * @param {MdxFlowExpression | MdxTextExpression} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxExpressionContainer}
 *   estree expression.
 */
export function mdxExpression(node, state) {
  const estree = node.data && node.data.estree
  const comments = (estree && estree.comments) || []
  /** @type {Expression | JsxEmptyExpression | undefined} */
  let expression

  if (estree) {
    state.comments.push(...comments)
    attachComments(estree, estree.comments)
    expression =
      (estree.body[0] &&
        estree.body[0].type === 'ExpressionStatement' &&
        estree.body[0].expression) ||
      undefined
  }

  if (!expression) {
    expression = {type: 'JSXEmptyExpression'}
    state.patch(node, expression)
  }

  /** @type {JsxExpressionContainer} */
  const result = {type: 'JSXExpressionContainer', expression}
  state.inherit(node, result)
  return result
}
