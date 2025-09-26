/**
 * @import {CompileContext, Extension as FromMarkdownExtension, Handle as FromMarkdownHandle} from 'mdast-util-from-markdown'
 * @import {MdxFlowExpression, MdxTextExpression} from 'mdast-util-mdx-expression'
 * @import {Handle as ToMarkdownHandle, Options as ToMarkdownExtension, State} from 'mdast-util-to-markdown'
 * @import {Parents} from 'mdast'
 */

import {ok as assert} from 'devlop'

/**
 * Create an extension for `mdast-util-from-markdown` to enable MDX expressions
 * in markdown.
 *
 * When using the micromark syntax extension with `addResult`, nodes will have
 * a `data.estree` field set to an ESTree `Program` node.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable MDX expressions.
 */
export function mdxExpressionFromMarkdown() {
  return {
    enter: {
      mdxFlowExpression: enterMdxFlowExpression,
      mdxTextExpression: enterMdxTextExpression
    },
    exit: {
      mdxFlowExpression: exitMdxExpression,
      mdxFlowExpressionChunk: exitMdxExpressionData,
      mdxTextExpression: exitMdxExpression,
      mdxTextExpressionChunk: exitMdxExpressionData
    }
  }
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable MDX expressions
 * in markdown.
 *
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable MDX expressions.
 */
export function mdxExpressionToMarkdown() {
  return {
    handlers: {
      mdxFlowExpression: handleMdxExpression,
      mdxTextExpression: handleMdxExpression
    },
    unsafe: [
      {character: '{', inConstruct: ['phrasing']},
      {atBreak: true, character: '{'}
    ]
  }
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterMdxFlowExpression(token) {
  this.enter({type: 'mdxFlowExpression', value: ''}, token)
  this.buffer()
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterMdxTextExpression(token) {
  this.enter({type: 'mdxTextExpression', value: ''}, token)
  this.buffer()
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitMdxExpression(token) {
  const value = this.resume()
  const estree = token.estree
  const node = this.stack[this.stack.length - 1]
  assert(node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression')
  this.exit(token)
  node.value = value

  if (estree) {
    node.data = {estree}
  }
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitMdxExpressionData(token) {
  this.config.enter.data.call(this, token)
  this.config.exit.data.call(this, token)
}

/**
 * @type {ToMarkdownHandle}
 * @param {MdxFlowExpression | MdxTextExpression} node
 *   Node.
 * @param {Parents | undefined} parent
 *   Parent, if any.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {string}
 *   Serialized markdown.
 */
function handleMdxExpression(node, parent, state) {
  const value = node.value || ''
  const result = state.indentLines(value, function (line, index, blank) {
    // Tab-size to eat has to be the same as what we serialize as.
    // While in some places in markdown that’s 4, in JS it’s more common as 2.
    // Which is what’s also in `mdast-util-mdx-jsx`:
    // <https://github.com/syntax-tree/mdast-util-mdx-jsx/blob/40b951b/lib/index.js#L52>
    return (index === 0 || blank ? '' : '  ') + line
  })
  return '{' + result + '}'
}
