import {comment} from './comment.js'
import {element} from './element.js'
import {mdxExpression} from './mdx-expression.js'
import {mdxJsxElement} from './mdx-jsx-element.js'
import {mdxjsEsm} from './mdxjs-esm.js'
import {root} from './root.js'
import {text} from './text.js'

export const handlers = {
  comment,
  doctype: ignore,
  element,
  mdxFlowExpression: mdxExpression,
  mdxJsxFlowElement: mdxJsxElement,
  mdxJsxTextElement: mdxJsxElement,
  mdxTextExpression: mdxExpression,
  mdxjsEsm,
  root,
  text
}

/**
 * Handle a node that is ignored.
 *
 * @returns {undefined}
 *   Nothing.
 */
function ignore() {}
