/**
 * @import {Program} from 'estree-jsx'
 */

/**
 * @typedef Options
 *   Configuration for internal plugin `recma-build-jsx-transform`.
 * @property {'function-body' | 'program' | null | undefined} [outputFormat='program']
 *   Whether to keep the import of the automatic runtime or get it from
 *   `arguments[0]` instead (default: `'program'`).
 */

import {specifiersToDeclarations} from '../util/estree-util-specifiers-to-declarations.js'
import {toIdOrMemberExpression} from '../util/estree-util-to-id-or-member-expression.js'

/**
 * Plugin to change the tree after compiling JSX away.
 *
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export function recmaBuildJsxTransform(options) {
  /* c8 ignore next -- always given in `@mdx-js/mdx` */
  const {outputFormat} = options || {}

  /**
   * @param {Program} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree) {
    // Remove the pragma comment that we injected ourselves as it is no longer
    // needed.
    if (tree.comments) {
      tree.comments = tree.comments.filter(function (d) {
        return !d.data?._mdxIsPragmaComment
      })
    }

    // When compiling to a function body, replace the import that was just
    // generated, and get `jsx`, `jsxs`, and `Fragment` from `arguments[0]`
    // instead.
    if (outputFormat === 'function-body') {
      let index = 0

      // Skip directives: JS currently only has `use strict`, but Acorn allows
      // arbitrary ones.
      // Practically things like `use client` could be used?
      while (index < tree.body.length) {
        const child = tree.body[index]
        if ('directive' in child && child.directive) {
          index++
        } else {
          break
        }
      }

      const declaration = tree.body[index]

      if (
        declaration &&
        declaration.type === 'ImportDeclaration' &&
        typeof declaration.source.value === 'string' &&
        /\/jsx-(dev-)?runtime$/.test(declaration.source.value)
      ) {
        tree.body[index] = {
          type: 'VariableDeclaration',
          kind: 'const',
          declarations: specifiersToDeclarations(
            declaration.specifiers,
            toIdOrMemberExpression(['arguments', 0])
          )
        }
      }
    }
  }
}
