/**
 * @import {
      Identifier,
      JSXIdentifier,
      JSXMemberExpression,
      Literal,
      MemberExpression
 * } from 'estree-jsx'
 */

import {ok as assert} from 'devlop'
import {name as isIdentifierName} from 'estree-util-is-identifier-name'

/**
 * @param {ReadonlyArray<number | string>} ids
 *   Identifiers (example: `['list', 0]).
 * @returns {Identifier | MemberExpression}
 *   Identifier or member expression.
 */
export function toIdOrMemberExpression(ids) {
  let index = -1
  /** @type {Identifier | Literal | MemberExpression | undefined} */
  let object

  while (++index < ids.length) {
    const name = ids[index]
    /** @type {Identifier | Literal} */
    const id =
      typeof name === 'string' && isIdentifierName(name)
        ? {type: 'Identifier', name}
        : {type: 'Literal', value: name}
    object = object
      ? {
          type: 'MemberExpression',
          object,
          property: id,
          computed: id.type === 'Literal',
          optional: false
        }
      : id
  }

  assert(object, 'expected non-empty `ids` to be passed')
  assert(object.type !== 'Literal', 'expected identifier as left-most value')
  return object
}

/**
 * @param {ReadonlyArray<number | string>} ids
 *   Identifiers (example: `['list', 0]).
 * @returns {JSXIdentifier | JSXMemberExpression}
 *   Identifier or member expression.
 */
export function toJsxIdOrMemberExpression(ids) {
  let index = -1
  /** @type {JSXIdentifier | JSXMemberExpression | undefined} */
  let object

  while (++index < ids.length) {
    const name = ids[index]
    assert(
      typeof name === 'string' && isIdentifierName(name, {jsx: true}),
      'expected valid jsx identifier, not `' + name + '`'
    )

    /** @type {JSXIdentifier} */
    const id = {type: 'JSXIdentifier', name}
    object = object ? {type: 'JSXMemberExpression', object, property: id} : id
  }

  assert(object, 'expected non-empty `ids` to be passed')
  return object
}
