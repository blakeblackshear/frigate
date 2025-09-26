/**
 * @import {
 *   JSXElement as JsxElement,
 *   JSXExpressionContainer as JsxExpressionContainer,
 *   JSXFragment as JsxFragment,
 *   JSXSpreadChild as JsxSpreadChild,
 *   JSXText as JsxText,
 * } from 'estree-jsx'
 * @import {State} from 'hast-util-to-estree'
 * @import {Root as HastRoot} from 'hast'
 */

import {whitespace} from 'hast-util-whitespace'

/**
 * Turn a hast root node into an estree node.
 *
 * @param {HastRoot} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxFragment}
 *   estree JSX fragment.
 */
export function root(node, state) {
  const children = state.all(node)
  /** @type {Array<JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText>} */
  const cleanChildren = []
  let index = -1
  /** @type {Array<JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText> | undefined} */
  let queue

  // Remove surrounding whitespace nodes from the fragment.
  while (++index < children.length) {
    const child = children[index]

    if (
      child.type === 'JSXExpressionContainer' &&
      child.expression.type === 'Literal' &&
      whitespace(String(child.expression.value))
    ) {
      if (queue) queue.push(child)
    } else {
      if (queue) cleanChildren.push(...queue)
      cleanChildren.push(child)
      queue = []
    }
  }

  /** @type {JsxFragment} */
  const result = {
    type: 'JSXFragment',
    openingFragment: {type: 'JSXOpeningFragment'},
    closingFragment: {type: 'JSXClosingFragment'},
    children: cleanChildren
  }
  state.inherit(node, result)
  return result
}
