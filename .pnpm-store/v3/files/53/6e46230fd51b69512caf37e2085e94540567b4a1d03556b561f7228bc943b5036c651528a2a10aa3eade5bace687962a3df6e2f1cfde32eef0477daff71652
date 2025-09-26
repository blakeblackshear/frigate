/**
 * @import {
      AssignmentProperty,
      ExportSpecifier,
      Expression,
      Identifier,
      ImportDefaultSpecifier,
      ImportNamespaceSpecifier,
      ImportSpecifier,
      Literal,
      VariableDeclarator
 * } from 'estree-jsx'
 */

import {ok as assert} from 'devlop'
import {create} from './estree-util-create.js'

/**
 * @param {ReadonlyArray<Readonly<ExportSpecifier> | Readonly<ImportDefaultSpecifier> | Readonly<ImportNamespaceSpecifier> | Readonly<ImportSpecifier>>} specifiers
 *   Specifiers.
 * @param {Readonly<Expression>} init
 *   Initializer.
 * @returns {Array<VariableDeclarator>}
 *   Declarations.
 */
export function specifiersToDeclarations(specifiers, init) {
  let index = -1
  /** @type {Array<VariableDeclarator>} */
  const declarations = []
  /** @type {Array<ExportSpecifier | ImportDefaultSpecifier | ImportSpecifier>} */
  const otherSpecifiers = []
  // Can only be one according to JS syntax.
  /** @type {ImportNamespaceSpecifier | undefined} */
  let importNamespaceSpecifier

  while (++index < specifiers.length) {
    const specifier = specifiers[index]

    if (specifier.type === 'ImportNamespaceSpecifier') {
      importNamespaceSpecifier = specifier
    } else {
      otherSpecifiers.push(specifier)
    }
  }

  if (importNamespaceSpecifier) {
    /** @type {VariableDeclarator} */
    const declarator = {
      type: 'VariableDeclarator',
      id: importNamespaceSpecifier.local,
      init
    }
    create(importNamespaceSpecifier, declarator)
    declarations.push(declarator)
  }

  declarations.push({
    type: 'VariableDeclarator',
    id: {
      type: 'ObjectPattern',
      properties: otherSpecifiers.map(function (specifier) {
        /** @type {Identifier | Literal} */
        let key =
          specifier.type === 'ImportSpecifier'
            ? specifier.imported
            : specifier.type === 'ExportSpecifier'
              ? specifier.exported
              : {type: 'Identifier', name: 'default'}
        let value = specifier.local

        // Switch them around if we’re exporting.
        if (specifier.type === 'ExportSpecifier') {
          value = key
          key = specifier.local
        }

        // To do: what to do about literals?
        // `const { a: 'b' } = c()` does not work?
        assert(value.type === 'Identifier')

        /** @type {AssignmentProperty} */
        const property = {
          type: 'Property',
          kind: 'init',
          shorthand:
            key.type === 'Identifier' &&
            value.type === 'Identifier' &&
            key.name === value.name,
          method: false,
          computed: false,
          key,
          value
        }
        create(specifier, property)
        return property
      })
    },
    init: importNamespaceSpecifier
      ? {type: 'Identifier', name: importNamespaceSpecifier.local.name}
      : init
  })

  return declarations
}
