/**
 * @import {
 *   JSXEmptyExpression as JsxEmptyExpression,
 *   JSXExpressionContainer as JsxExpressionContainer,
 * } from 'estree-jsx'
 * @import {Comment} from 'estree'
 * @import {State} from 'hast-util-to-estree'
 * @import {Comment as HastComment} from 'hast'
 */

// Make VS Code show references to the above types.
''

/**
 * Turn a hast comment into an estree node.
 *
 * @param {HastComment} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxExpressionContainer}
 *   estree expression.
 */
export function comment(node, state) {
  /** @type {Comment} */
  const result = {type: 'Block', value: node.value}
  state.inherit(node, result)
  state.comments.push(result)

  /** @type {JsxEmptyExpression} */
  const expression = {
    type: 'JSXEmptyExpression',
    // @ts-expect-error: `comments` is custom.
    comments: [Object.assign({}, result, {leading: false, trailing: true})]
  }
  state.patch(node, expression)

  /** @type {JsxExpressionContainer} */
  const container = {type: 'JSXExpressionContainer', expression}
  state.patch(node, container)
  return container
}
