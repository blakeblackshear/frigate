/**
 * @import {Root, RootContent} from 'mdast'
 */

import {collapseWhiteSpace} from 'collapse-white-space'
import {walk} from 'estree-walker'
import {visit} from 'unist-util-visit'

/**
 * A tiny plugin that unravels `<p><h1>x</h1></p>` but also
 * `<p><Component /></p>` (so it has no knowledge of “HTML”).
 *
 * It also marks JSX as being explicitly JSX, so when a user passes a `h1`
 * component, it is used for `# heading` but not for `<h1>heading</h1>`.
 *
 * @returns
 *   Transform.
 */
export function remarkMarkAndUnravel() {
  /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree) {
    visit(tree, function (node, index, parent) {
      let offset = -1
      let all = true
      let oneOrMore = false

      if (parent && typeof index === 'number' && node.type === 'paragraph') {
        const children = node.children

        while (++offset < children.length) {
          const child = children[offset]

          if (
            child.type === 'mdxJsxTextElement' ||
            child.type === 'mdxTextExpression'
          ) {
            oneOrMore = true
          } else if (
            child.type === 'text' &&
            collapseWhiteSpace(child.value, {style: 'html', trim: true}) === ''
          ) {
            // Empty.
          } else {
            all = false
            break
          }
        }

        if (all && oneOrMore) {
          offset = -1

          /** @type {Array<RootContent>} */
          const newChildren = []

          while (++offset < children.length) {
            const child = children[offset]

            if (child.type === 'mdxJsxTextElement') {
              // @ts-expect-error: mutate because it is faster; content model is fine.
              child.type = 'mdxJsxFlowElement'
            }

            if (child.type === 'mdxTextExpression') {
              // @ts-expect-error: mutate because it is faster; content model is fine.
              child.type = 'mdxFlowExpression'
            }

            if (
              child.type === 'text' &&
              /^[\t\r\n ]+$/.test(String(child.value))
            ) {
              // Empty.
            } else {
              newChildren.push(child)
            }
          }

          parent.children.splice(index, 1, ...newChildren)
          return index
        }
      }

      if (
        node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement'
      ) {
        const data = node.data || (node.data = {})
        data._mdxExplicitJsx = true
      }

      if (
        (node.type === 'mdxFlowExpression' ||
          node.type === 'mdxTextExpression' ||
          node.type === 'mdxjsEsm') &&
        node.data &&
        node.data.estree
      ) {
        walk(node.data.estree, {
          enter(node) {
            if (node.type === 'JSXElement') {
              const data = node.data || (node.data = {})
              data._mdxExplicitJsx = true
            }
          }
        })
      }
    })
  }
}
