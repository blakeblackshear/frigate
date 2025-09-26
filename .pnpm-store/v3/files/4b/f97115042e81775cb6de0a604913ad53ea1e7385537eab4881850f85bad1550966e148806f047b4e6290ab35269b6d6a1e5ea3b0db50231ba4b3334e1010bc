/**
 * @import {CompileContext, Extension as FromMarkdownExtension, Handle as FromMarkdownHandle, OnEnterError, OnExitError, Token} from 'mdast-util-from-markdown'
 * @import {Handle as ToMarkdownHandle, Options as ToMarkdownExtension, State, Tracker} from 'mdast-util-to-markdown'
 * @import {Point} from 'unist'
 * @import {MdxJsxAttribute, MdxJsxAttributeValueExpression, MdxJsxExpressionAttribute, MdxJsxFlowElement, MdxJsxTextElement} from '../index.js'
 */

/**
 * @typedef Tag
 *   Single tag.
 * @property {string | undefined} name
 *   Name of tag, or `undefined` for fragment.
 *
 *   > 👉 **Note**: `null` is used in the AST for fragments, as it serializes in
 *   > JSON.
 * @property {Array<MdxJsxAttribute | MdxJsxExpressionAttribute>} attributes
 *   Attributes.
 * @property {boolean} close
 *   Whether the tag is closing (`</x>`).
 * @property {boolean} selfClosing
 *   Whether the tag is self-closing (`<x/>`).
 * @property {Token['start']} start
 *   Start point.
 * @property {Token['start']} end
 *   End point.
 *
 * @typedef ToMarkdownOptions
 *   Configuration.
 * @property {'"' | "'" | null | undefined} [quote='"']
 *   Preferred quote to use around attribute values (default: `'"'`).
 * @property {boolean | null | undefined} [quoteSmart=false]
 *   Use the other quote if that results in less bytes (default: `false`).
 * @property {boolean | null | undefined} [tightSelfClosing=false]
 *   Do not use an extra space when closing self-closing elements: `<img/>`
 *   instead of `<img />` (default: `false`).
 * @property {number | null | undefined} [printWidth=Infinity]
 *   Try and wrap syntax at this width (default: `Infinity`).
 *
 *   When set to a finite number (say, `80`), the formatter will print
 *   attributes on separate lines when a tag doesn’t fit on one line.
 *   The normal behavior is to print attributes with spaces between them
 *   instead of line endings.
 */

import {ccount} from 'ccount'
import {ok as assert} from 'devlop'
import {parseEntities} from 'parse-entities'
import {stringifyEntitiesLight} from 'stringify-entities'
import {stringifyPosition} from 'unist-util-stringify-position'
import {VFileMessage} from 'vfile-message'

const indent = '  '

/**
 * Create an extension for `mdast-util-from-markdown` to enable MDX JSX.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable MDX JSX.
 *
 *   When using the syntax extension with `addResult`, nodes will have a
 *   `data.estree` field set to an ESTree `Program` node.
 */
export function mdxJsxFromMarkdown() {
  return {
    canContainEols: ['mdxJsxTextElement'],
    enter: {
      mdxJsxFlowTag: enterMdxJsxTag,
      mdxJsxFlowTagClosingMarker: enterMdxJsxTagClosingMarker,
      mdxJsxFlowTagAttribute: enterMdxJsxTagAttribute,
      mdxJsxFlowTagExpressionAttribute: enterMdxJsxTagExpressionAttribute,
      mdxJsxFlowTagAttributeValueLiteral: buffer,
      mdxJsxFlowTagAttributeValueExpression: buffer,
      mdxJsxFlowTagSelfClosingMarker: enterMdxJsxTagSelfClosingMarker,

      mdxJsxTextTag: enterMdxJsxTag,
      mdxJsxTextTagClosingMarker: enterMdxJsxTagClosingMarker,
      mdxJsxTextTagAttribute: enterMdxJsxTagAttribute,
      mdxJsxTextTagExpressionAttribute: enterMdxJsxTagExpressionAttribute,
      mdxJsxTextTagAttributeValueLiteral: buffer,
      mdxJsxTextTagAttributeValueExpression: buffer,
      mdxJsxTextTagSelfClosingMarker: enterMdxJsxTagSelfClosingMarker
    },
    exit: {
      mdxJsxFlowTagClosingMarker: exitMdxJsxTagClosingMarker,
      mdxJsxFlowTagNamePrimary: exitMdxJsxTagNamePrimary,
      mdxJsxFlowTagNameMember: exitMdxJsxTagNameMember,
      mdxJsxFlowTagNameLocal: exitMdxJsxTagNameLocal,
      mdxJsxFlowTagExpressionAttribute: exitMdxJsxTagExpressionAttribute,
      mdxJsxFlowTagExpressionAttributeValue: data,
      mdxJsxFlowTagAttributeNamePrimary: exitMdxJsxTagAttributeNamePrimary,
      mdxJsxFlowTagAttributeNameLocal: exitMdxJsxTagAttributeNameLocal,
      mdxJsxFlowTagAttributeValueLiteral: exitMdxJsxTagAttributeValueLiteral,
      mdxJsxFlowTagAttributeValueLiteralValue: data,
      mdxJsxFlowTagAttributeValueExpression:
        exitMdxJsxTagAttributeValueExpression,
      mdxJsxFlowTagAttributeValueExpressionValue: data,
      mdxJsxFlowTagSelfClosingMarker: exitMdxJsxTagSelfClosingMarker,
      mdxJsxFlowTag: exitMdxJsxTag,

      mdxJsxTextTagClosingMarker: exitMdxJsxTagClosingMarker,
      mdxJsxTextTagNamePrimary: exitMdxJsxTagNamePrimary,
      mdxJsxTextTagNameMember: exitMdxJsxTagNameMember,
      mdxJsxTextTagNameLocal: exitMdxJsxTagNameLocal,
      mdxJsxTextTagExpressionAttribute: exitMdxJsxTagExpressionAttribute,
      mdxJsxTextTagExpressionAttributeValue: data,
      mdxJsxTextTagAttributeNamePrimary: exitMdxJsxTagAttributeNamePrimary,
      mdxJsxTextTagAttributeNameLocal: exitMdxJsxTagAttributeNameLocal,
      mdxJsxTextTagAttributeValueLiteral: exitMdxJsxTagAttributeValueLiteral,
      mdxJsxTextTagAttributeValueLiteralValue: data,
      mdxJsxTextTagAttributeValueExpression:
        exitMdxJsxTagAttributeValueExpression,
      mdxJsxTextTagAttributeValueExpressionValue: data,
      mdxJsxTextTagSelfClosingMarker: exitMdxJsxTagSelfClosingMarker,
      mdxJsxTextTag: exitMdxJsxTag
    }
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function buffer() {
    this.buffer()
  }

  /**
   * Copy a point-like value.
   *
   * @param {Point} d
   *   Point-like value.
   * @returns {Point}
   *   unist point.
   */
  function point(d) {
    return {line: d.line, column: d.column, offset: d.offset}
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function data(token) {
    this.config.enter.data.call(this, token)
    this.config.exit.data.call(this, token)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMdxJsxTag(token) {
    /** @type {Tag} */
    const tag = {
      name: undefined,
      attributes: [],
      close: false,
      selfClosing: false,
      start: token.start,
      end: token.end
    }
    if (!this.data.mdxJsxTagStack) this.data.mdxJsxTagStack = []
    this.data.mdxJsxTag = tag
    this.buffer()
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMdxJsxTagClosingMarker(token) {
    const stack = this.data.mdxJsxTagStack
    assert(stack, 'expected `mdxJsxTagStack`')

    if (stack.length === 0) {
      throw new VFileMessage(
        'Unexpected closing slash `/` in tag, expected an open tag first',
        {start: token.start, end: token.end},
        'mdast-util-mdx-jsx:unexpected-closing-slash'
      )
    }
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMdxJsxTagAnyAttribute(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')

    if (tag.close) {
      throw new VFileMessage(
        'Unexpected attribute in closing tag, expected the end of the tag',
        {start: token.start, end: token.end},
        'mdast-util-mdx-jsx:unexpected-attribute'
      )
    }
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMdxJsxTagSelfClosingMarker(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')

    if (tag.close) {
      throw new VFileMessage(
        'Unexpected self-closing slash `/` in closing tag, expected the end of the tag',
        {start: token.start, end: token.end},
        'mdast-util-mdx-jsx:unexpected-self-closing-slash'
      )
    }
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagClosingMarker() {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    tag.close = true
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagNamePrimary(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    tag.name = this.sliceSerialize(token)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagNameMember(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    tag.name += '.' + this.sliceSerialize(token)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagNameLocal(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    tag.name += ':' + this.sliceSerialize(token)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMdxJsxTagAttribute(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    enterMdxJsxTagAnyAttribute.call(this, token)
    tag.attributes.push({
      type: 'mdxJsxAttribute',
      name: '',
      value: null,
      position: {
        start: point(token.start),
        // @ts-expect-error: `end` will be patched later.
        end: undefined
      }
    })
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMdxJsxTagExpressionAttribute(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    enterMdxJsxTagAnyAttribute.call(this, token)
    tag.attributes.push({
      type: 'mdxJsxExpressionAttribute',
      value: '',
      position: {
        start: point(token.start),
        // @ts-expect-error: `end` will be patched later.
        end: undefined
      }
    })
    this.buffer()
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagExpressionAttribute(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    const tail = tag.attributes[tag.attributes.length - 1]
    assert(tail.type === 'mdxJsxExpressionAttribute')
    const estree = token.estree

    tail.value = this.resume()
    assert(tail.position !== undefined)
    tail.position.end = point(token.end)

    if (estree) {
      tail.data = {estree}
    }
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagAttributeNamePrimary(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    const node = tag.attributes[tag.attributes.length - 1]
    assert(node.type === 'mdxJsxAttribute')
    node.name = this.sliceSerialize(token)
    assert(node.position !== undefined)
    node.position.end = point(token.end)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagAttributeNameLocal(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    const node = tag.attributes[tag.attributes.length - 1]
    assert(node.type === 'mdxJsxAttribute')
    node.name += ':' + this.sliceSerialize(token)
    assert(node.position !== undefined)
    node.position.end = point(token.end)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagAttributeValueLiteral(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    const node = tag.attributes[tag.attributes.length - 1]
    node.value = parseEntities(this.resume(), {nonTerminated: false})
    assert(node.position !== undefined)
    node.position.end = point(token.end)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagAttributeValueExpression(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    const tail = tag.attributes[tag.attributes.length - 1]
    assert(tail.type === 'mdxJsxAttribute')
    /** @type {MdxJsxAttributeValueExpression} */
    const node = {type: 'mdxJsxAttributeValueExpression', value: this.resume()}
    const estree = token.estree

    if (estree) {
      node.data = {estree}
    }

    tail.value = node
    assert(tail.position !== undefined)
    tail.position.end = point(token.end)
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTagSelfClosingMarker() {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')

    tag.selfClosing = true
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMdxJsxTag(token) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')
    const stack = this.data.mdxJsxTagStack
    assert(stack, 'expected `mdxJsxTagStack`')
    const tail = stack[stack.length - 1]

    if (tag.close && tail.name !== tag.name) {
      throw new VFileMessage(
        'Unexpected closing tag `' +
          serializeAbbreviatedTag(tag) +
          '`, expected corresponding closing tag for `' +
          serializeAbbreviatedTag(tail) +
          '` (' +
          stringifyPosition(tail) +
          ')',
        {start: token.start, end: token.end},
        'mdast-util-mdx-jsx:end-tag-mismatch'
      )
    }

    // End of a tag, so drop the buffer.
    this.resume()

    if (tag.close) {
      stack.pop()
    } else {
      this.enter(
        {
          type:
            token.type === 'mdxJsxTextTag'
              ? 'mdxJsxTextElement'
              : 'mdxJsxFlowElement',
          name: tag.name || null,
          attributes: tag.attributes,
          children: []
        },
        token,
        onErrorRightIsTag
      )
    }

    if (tag.selfClosing || tag.close) {
      this.exit(token, onErrorLeftIsTag)
    } else {
      stack.push(tag)
    }
  }

  /**
   * @this {CompileContext}
   * @type {OnEnterError}
   */
  function onErrorRightIsTag(closing, open) {
    const stack = this.data.mdxJsxTagStack
    assert(stack, 'expected `mdxJsxTagStack`')
    const tag = stack[stack.length - 1]
    assert(tag, 'expected `mdxJsxTag`')
    const place = closing ? ' before the end of `' + closing.type + '`' : ''
    const position = closing
      ? {start: closing.start, end: closing.end}
      : undefined

    throw new VFileMessage(
      'Expected a closing tag for `' +
        serializeAbbreviatedTag(tag) +
        '` (' +
        stringifyPosition({start: open.start, end: open.end}) +
        ')' +
        place,
      position,
      'mdast-util-mdx-jsx:end-tag-mismatch'
    )
  }

  /**
   * @this {CompileContext}
   * @type {OnExitError}
   */
  function onErrorLeftIsTag(a, b) {
    const tag = this.data.mdxJsxTag
    assert(tag, 'expected `mdxJsxTag`')

    throw new VFileMessage(
      'Expected the closing tag `' +
        serializeAbbreviatedTag(tag) +
        '` either after the end of `' +
        b.type +
        '` (' +
        stringifyPosition(b.end) +
        ') or another opening tag after the start of `' +
        b.type +
        '` (' +
        stringifyPosition(b.start) +
        ')',
      {start: a.start, end: a.end},
      'mdast-util-mdx-jsx:end-tag-mismatch'
    )
  }

  /**
   * Serialize a tag, excluding attributes.
   * `self-closing` is not supported, because we don’t need it yet.
   *
   * @param {Tag} tag
   * @returns {string}
   */
  function serializeAbbreviatedTag(tag) {
    return '<' + (tag.close ? '/' : '') + (tag.name || '') + '>'
  }
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable MDX JSX.
 *
 * This extension configures `mdast-util-to-markdown` with
 * `options.fences: true` and `options.resourceLink: true` too, do not
 * overwrite them!
 *
 * @param {ToMarkdownOptions | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable MDX JSX.
 */
export function mdxJsxToMarkdown(options) {
  const options_ = options || {}
  const quote = options_.quote || '"'
  const quoteSmart = options_.quoteSmart || false
  const tightSelfClosing = options_.tightSelfClosing || false
  const printWidth = options_.printWidth || Number.POSITIVE_INFINITY
  const alternative = quote === '"' ? "'" : '"'

  if (quote !== '"' && quote !== "'") {
    throw new Error(
      'Cannot serialize attribute values with `' +
        quote +
        '` for `options.quote`, expected `"`, or `\'`'
    )
  }

  mdxElement.peek = peekElement

  return {
    handlers: {
      mdxJsxFlowElement: mdxElement,
      mdxJsxTextElement: mdxElement
    },
    unsafe: [
      {character: '<', inConstruct: ['phrasing']},
      {atBreak: true, character: '<'}
    ],
    // Always generate fenced code (never indented code).
    fences: true,
    // Always generate links with resources (never autolinks).
    resourceLink: true
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {MdxJsxFlowElement | MdxJsxTextElement} node
   */
  // eslint-disable-next-line complexity
  function mdxElement(node, _, state, info) {
    const flow = node.type === 'mdxJsxFlowElement'
    const selfClosing = node.name
      ? !node.children || node.children.length === 0
      : false
    const depth = inferDepth(state)
    const currentIndent = createIndent(depth)
    const trackerOneLine = state.createTracker(info)
    const trackerMultiLine = state.createTracker(info)
    /** @type {Array<string>} */
    const serializedAttributes = []
    const prefix = (flow ? currentIndent : '') + '<' + (node.name || '')
    const exit = state.enter(node.type)

    trackerOneLine.move(prefix)
    trackerMultiLine.move(prefix)

    // None.
    if (node.attributes && node.attributes.length > 0) {
      if (!node.name) {
        throw new Error('Cannot serialize fragment w/ attributes')
      }

      let index = -1
      while (++index < node.attributes.length) {
        const attribute = node.attributes[index]
        /** @type {string} */
        let result

        if (attribute.type === 'mdxJsxExpressionAttribute') {
          result = '{' + (attribute.value || '') + '}'
        } else {
          if (!attribute.name) {
            throw new Error('Cannot serialize attribute w/o name')
          }

          const value = attribute.value
          const left = attribute.name
          /** @type {string} */
          let right = ''

          if (value === null || value === undefined) {
            // Empty.
          } else if (typeof value === 'object') {
            right = '{' + (value.value || '') + '}'
          } else {
            // If the alternative is less common than `quote`, switch.
            const appliedQuote =
              quoteSmart && ccount(value, quote) > ccount(value, alternative)
                ? alternative
                : quote
            right =
              appliedQuote +
              stringifyEntitiesLight(value, {subset: [appliedQuote]}) +
              appliedQuote
          }

          result = left + (right ? '=' : '') + right
        }

        serializedAttributes.push(result)
      }
    }

    let attributesOnTheirOwnLine = false
    const attributesOnOneLine = serializedAttributes.join(' ')

    if (
      // Block:
      flow &&
      // Including a line ending (expressions).
      (/\r?\n|\r/.test(attributesOnOneLine) ||
        // Current position (including `<tag`).
        trackerOneLine.current().now.column +
          // -1 because columns, +1 for ` ` before attributes.
          // Attributes joined by spaces.
          attributesOnOneLine.length +
          // ` />`.
          (selfClosing ? (tightSelfClosing ? 2 : 3) : 1) >
          printWidth)
    ) {
      attributesOnTheirOwnLine = true
    }

    let tracker = trackerOneLine
    let value = prefix

    if (attributesOnTheirOwnLine) {
      tracker = trackerMultiLine

      let index = -1

      while (++index < serializedAttributes.length) {
        // Only indent first line of of attributes, we can’t indent attribute
        // values.
        serializedAttributes[index] =
          currentIndent + indent + serializedAttributes[index]
      }

      value += tracker.move(
        '\n' + serializedAttributes.join('\n') + '\n' + currentIndent
      )
    } else if (attributesOnOneLine) {
      value += tracker.move(' ' + attributesOnOneLine)
    }

    if (selfClosing) {
      value += tracker.move(
        (tightSelfClosing || attributesOnTheirOwnLine ? '' : ' ') + '/'
      )
    }

    value += tracker.move('>')

    if (node.children && node.children.length > 0) {
      if (node.type === 'mdxJsxTextElement') {
        value += tracker.move(
          state.containerPhrasing(node, {
            ...tracker.current(),
            before: '>',
            after: '<'
          })
        )
      } else {
        tracker.shift(2)
        value += tracker.move('\n')
        value += tracker.move(containerFlow(node, state, tracker.current()))
        value += tracker.move('\n')
      }
    }

    if (!selfClosing) {
      value += tracker.move(
        (flow ? currentIndent : '') + '</' + (node.name || '') + '>'
      )
    }

    exit()
    return value
  }
}

// Modified copy of:
// <https://github.com/syntax-tree/mdast-util-to-markdown/blob/a381cbc/lib/util/container-flow.js>.
//
// To do: add `indent` support to `mdast-util-to-markdown`.
// As indents are only used for JSX, it’s fine for now, but perhaps better
// there.
/**
 * @param {MdxJsxFlowElement} parent
 *   Parent of flow nodes.
 * @param {State} state
 *   Info passed around about the current state.
 * @param {ReturnType<Tracker['current']>} info
 *   Info on where we are in the document we are generating.
 * @returns {string}
 *   Serialized children, joined by (blank) lines.
 */
function containerFlow(parent, state, info) {
  const indexStack = state.indexStack
  const children = parent.children
  const tracker = state.createTracker(info)
  const currentIndent = createIndent(inferDepth(state))
  /** @type {Array<string>} */
  const results = []
  let index = -1

  indexStack.push(-1)

  while (++index < children.length) {
    const child = children[index]

    indexStack[indexStack.length - 1] = index

    const childInfo = {before: '\n', after: '\n', ...tracker.current()}

    const result = state.handle(child, parent, state, childInfo)

    const serializedChild =
      child.type === 'mdxJsxFlowElement'
        ? result
        : state.indentLines(result, function (line, _, blank) {
            return (blank ? '' : currentIndent) + line
          })

    results.push(tracker.move(serializedChild))

    if (child.type !== 'list') {
      state.bulletLastUsed = undefined
    }

    if (index < children.length - 1) {
      results.push(tracker.move('\n\n'))
    }
  }

  indexStack.pop()

  return results.join('')
}

/**
 * @param {State} state
 * @returns {number}
 */
function inferDepth(state) {
  let depth = 0
  let index = state.stack.length

  while (--index > -1) {
    const name = state.stack[index]

    if (name === 'blockquote' || name === 'listItem') break
    if (name === 'mdxJsxFlowElement') depth++
  }

  return depth
}

/**
 * @param {number} depth
 * @returns {string}
 */
function createIndent(depth) {
  return indent.repeat(depth)
}

/**
 * @type {ToMarkdownHandle}
 */
function peekElement() {
  return '<'
}
