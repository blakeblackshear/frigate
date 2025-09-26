/**
 * @import {
      Declaration,
      Expression,
      MaybeNamedClassDeclaration,
      MaybeNamedFunctionDeclaration
 * } from 'estree-jsx'
 */

import {ok as assert} from 'devlop'

/**
 * Turn a declaration into an expression.
 *
 * Doesn’t work for variable declarations, but that’s fine for our use case
 * because currently we’re using this utility for export default declarations,
 * which can’t contain variable declarations.
 *
 * @param {Readonly<Declaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration>} declaration
 *   Declaration.
 * @returns {Expression}
 *   Expression.
 */
export function declarationToExpression(declaration) {
  if (declaration.type === 'FunctionDeclaration') {
    return {...declaration, type: 'FunctionExpression'}
  }

  // This is currently an internal utility so the next shouldn’t happen or a
  // maintainer is making a mistake.
  assert(declaration.type === 'ClassDeclaration', 'unexpected node type')
  return {...declaration, type: 'ClassExpression'}
}
