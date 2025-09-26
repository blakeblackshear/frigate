/**
 * @import {JSXExpressionContainer as JsxExpressionContainer} from 'estree-jsx'
 * @import {Literal} from 'estree'
 * @import {State} from 'hast-util-to-estree'
 * @import {Text as HastText} from 'hast'
 */

// Make VS Code show references to the above types.
''

/**
 * Turn a hast text node into an estree node.
 *
 * @param {HastText} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxExpressionContainer | undefined}
 *   JSX expression.
 */
export function text(node, state) {
  const value = String(node.value || '')

  if (value) {
    /** @type {Literal} */
    const result = {type: 'Literal', value}
    state.inherit(node, result)
    /** @type {JsxExpressionContainer} */
    const container = {type: 'JSXExpressionContainer', expression: result}
    state.patch(node, container)
    return container
  }
}
