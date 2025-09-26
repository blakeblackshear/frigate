/**
 * @import {Node, Pattern} from 'estree'
 * @import {Scope, Visitors} from './types.js'
 */

import {ok as assert} from 'devlop'

/**
 * Create state to track what’s defined.
 *
 * @returns {Visitors}
 *   State.
 */
export function createVisitors() {
  /** @type {[topLevel: Scope, ...rest: Array<Scope>]} */
  const scopes = [{block: false, defined: []}]

  return {enter, exit, scopes}

  /**
   * @param {Node} node
   *   Node.
   * @returns {undefined}
   *   Nothing.
   */
  function enter(node) {
    // On arrow functions, create scope, add parameters.
    if (node.type === 'ArrowFunctionExpression') {
      scopes.push({block: false, defined: []})

      for (const parameter of node.params) {
        definePattern(parameter, false)
      }
    }
    // On block statements, create scope.
    // Not sure why `periscopic` only does `Block`/`For`/`ForIn`/`ForOf`.
    // I added `DoWhile`/`While` here just to be sure.
    else if (
      node.type === 'BlockStatement' ||
      node.type === 'DoWhileStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement'
    ) {
      scopes.push({block: true, defined: []})
    }

    // On catch clauses, create scope, add param.
    else if (node.type === 'CatchClause') {
      scopes.push({block: true, defined: []})
      if (node.param) definePattern(node.param, true)
    }

    // Add identifier of class declaration.
    else if (node.type === 'ClassDeclaration') {
      defineIdentifier(node.id.name, false)
    }

    // On function declarations, add name, create scope, add parameters.
    else if (node.type === 'FunctionDeclaration') {
      defineIdentifier(node.id.name, false)
      scopes.push({block: false, defined: []})

      for (const parameter of node.params) {
        definePattern(parameter, false)
      }
    }

    // On function expressions, add name, create scope, add parameters.
    else if (node.type === 'FunctionExpression') {
      if (node.id) defineIdentifier(node.id.name, false)
      scopes.push({block: false, defined: []})

      for (const parameter of node.params) {
        definePattern(parameter, false)
      }
    }

    // Add specifiers of import declarations.
    else if (node.type === 'ImportDeclaration') {
      for (const specifier of node.specifiers) {
        defineIdentifier(specifier.local.name, false)
      }
    }

    // Add patterns of variable declarations.
    else if (node.type === 'VariableDeclaration') {
      for (const declaration of node.declarations) {
        definePattern(declaration.id, node.kind !== 'var')
      }
    }
  }

  /**
   * @param {Node} node
   *   Node.
   * @returns {undefined}
   *   Nothing.
   */
  function exit(node) {
    if (
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression'
    ) {
      const scope = scopes.pop()
      assert(scope, 'expected scope')
      assert(!scope.block, 'expected non-block')
    } else if (
      node.type === 'BlockStatement' ||
      node.type === 'CatchClause' ||
      node.type === 'DoWhileStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement'
    ) {
      const scope = scopes.pop()
      assert(scope, 'expected scope')
      assert(scope.block, 'expected block')
    }
  }

  /**
   * Define an identifier in a scope.
   *
   * @param {string} id
   * @param {boolean} block
   * @returns {undefined}
   */
  function defineIdentifier(id, block) {
    let index = scopes.length
    /** @type {Scope | undefined} */
    let scope

    while (index--) {
      scope = scopes[index]

      if (block || !scope.block) {
        break
      }
    }

    assert(scope)
    scope.defined.push(id)
  }

  /**
   * Define a pattern in a scope.
   *
   * @param {Pattern} pattern
   * @param {boolean} block
   */
  function definePattern(pattern, block) {
    // `[, x]`
    if (pattern.type === 'ArrayPattern') {
      for (const element of pattern.elements) {
        if (element) {
          definePattern(element, block)
        }
      }
    }

    // `{x=y}`
    else if (pattern.type === 'AssignmentPattern') {
      definePattern(pattern.left, block)
    }

    // `x`
    else if (pattern.type === 'Identifier') {
      defineIdentifier(pattern.name, block)
    }

    // `{x}`
    else if (pattern.type === 'ObjectPattern') {
      for (const property of pattern.properties) {
        // `{key}`, `{key = value}`, `{key: value}`
        if (property.type === 'Property') {
          definePattern(property.value, block)
        }
        // `{...x}`
        else {
          assert(property.type === 'RestElement')
          definePattern(property, block)
        }
      }
    }

    // `...x`
    else {
      assert(pattern.type === 'RestElement')
      definePattern(pattern.argument, block)
    }
  }
}
