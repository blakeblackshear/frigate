/**
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-mdx-jsx').ToMarkdownOptions} ToMarkdownOptions
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 */

import {
  mdxExpressionFromMarkdown,
  mdxExpressionToMarkdown
} from 'mdast-util-mdx-expression'
import {mdxJsxFromMarkdown, mdxJsxToMarkdown} from 'mdast-util-mdx-jsx'
import {mdxjsEsmFromMarkdown, mdxjsEsmToMarkdown} from 'mdast-util-mdxjs-esm'

/**
 * Create an extension for `mdast-util-from-markdown` to enable MDX (ESM, JSX,
 * expressions).
 *
 * @returns {Array<FromMarkdownExtension>}
 *   Extension for `mdast-util-from-markdown` to enable MDX (ESM, JSX,
 *   expressions).
 *
 *   When using the syntax extensions with `addResult`, ESM and expression
 *   nodes will have `data.estree` fields set to ESTree `Program` node.
 */
export function mdxFromMarkdown() {
  return [
    mdxExpressionFromMarkdown(),
    mdxJsxFromMarkdown(),
    mdxjsEsmFromMarkdown()
  ]
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable MDX (ESM, JSX,
 * expressions).
 *
 * @param {ToMarkdownOptions | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable MDX (ESM, JSX,
 *   expressions).
 */
export function mdxToMarkdown(options) {
  return {
    extensions: [
      mdxExpressionToMarkdown(),
      mdxJsxToMarkdown(options),
      mdxjsEsmToMarkdown()
    ]
  }
}
