/**
 * @import {Expression} from 'estree-jsx'
 */

import {ok as assert} from 'devlop'

/**
 * @param {ReadonlyArray<Expression>} expressions
 *   Expressions.
 * @returns {Expression}
 *   Addition.
 */
export function toBinaryAddition(expressions) {
  let index = -1
  /** @type {Expression | undefined} */
  let left

  while (++index < expressions.length) {
    const right = expressions[index]
    left = left ? {type: 'BinaryExpression', left, operator: '+', right} : right
  }

  assert(left, 'expected non-empty `expressions` to be passed')
  return left
}
