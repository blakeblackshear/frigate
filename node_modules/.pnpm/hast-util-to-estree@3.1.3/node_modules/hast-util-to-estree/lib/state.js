/**
 * @import {
 *   JSXElement as JsxElement,
 *   JSXExpressionContainer as JsxExpressionContainer,
 *   JSXFragment as JsxFragment,
 *   JSXIdentifier as JsxIdentifier,
 *   JSXMemberExpression as JsxMemberExpression,
 *   JSXNamespacedName as JsxNamespacedName,
 *   JSXSpreadChild as JsxSpreadChild,
 *   JSXText as JsxText,
 * } from 'estree-jsx'
 * @import {Comment, Directive, ModuleDeclaration, Node as EstreeNode, Statement} from 'estree'
 * @import {MdxJsxAttribute, MdxJsxAttributeValueExpression, MdxJsxExpressionAttribute} from 'mdast-util-mdx-jsx'
 * @import {Nodes as HastNodes, Parents as HastParents} from 'hast'
 * @import {Schema} from 'property-information'
 */

/**
 * @typedef {'html' | 'react'} ElementAttributeNameCase
 *   Specify casing to use for attribute names.
 *
 *   HTML casing is for example `class`, `stroke-linecap`, `xml:lang`.
 *   React casing is for example `className`, `strokeLinecap`, `xmlLang`.
 *
 * @callback Handle
 *   Turn a hast node into an estree node.
 * @param {any} node
 *   Expected hast node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText | null | undefined}
 *   estree node.
 *
 * @typedef Options
 *   Configuration.
 * @property {ElementAttributeNameCase | null | undefined} [elementAttributeNameCase='react']
 *   Specify casing to use for attribute names (default: `'react'`).
 *
 *   This casing is used for hast elements, not for embedded MDX JSX nodes
 *   (components that someone authored manually).
 * @property {Record<string, Handle | null | undefined> | null | undefined} [handlers={}]
 *   Custom handlers (optional).
 * @property {Space | null | undefined} [space='html']
 *   Which space the document is in (default: `'html'`).
 *
 *   When an `<svg>` element is found in the HTML space, this package already
 *   automatically switches to and from the SVG space when entering and exiting
 *   it.
 * @property {StylePropertyNameCase | null | undefined} [stylePropertyNameCase='dom']
 *   Specify casing to use for property names in `style` objects (default: `'dom'`).
 *
 *   This casing is used for hast elements, not for embedded MDX JSX nodes
 *   (components that someone authored manually).
 * @property {boolean | null | undefined} [tableCellAlignToStyle=true]
 *   Turn obsolete `align` props on `td` and `th` into CSS `style` props
 *   (default: `true`).
 *
 * @typedef {'html' | 'svg'} Space
 *   Namespace.
 *
 * @typedef {'css' | 'dom'} StylePropertyNameCase
 *   Casing to use for property names in `style` objects.
 *
 *   CSS casing is for example `background-color` and `-webkit-line-clamp`.
 *   DOM casing is for example `backgroundColor` and `WebkitLineClamp`.
 *
 * @typedef State
 *   Info passed around about the current state.
 * @property {(parent: HastParents) => Array<JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText>} all
 *   Transform children of a hast parent to estree.
 * @property {Array<Comment>} comments
 *   List of estree comments.
 * @property {(name: string) => JsxIdentifier | JsxNamespacedName} createJsxAttributeName
 *   Create a JSX attribute name.
 * @property {(name: string) => JsxIdentifier | JsxMemberExpression | JsxNamespacedName} createJsxElementName
 *   Create a JSX element name.
 * @property {ElementAttributeNameCase} elementAttributeNameCase
 *   Casing to use for attribute names.
 * @property {Array<Directive | ModuleDeclaration | Statement>} esm
 *   List of top-level estree nodes.
 * @property {(node: any) => JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText | null | undefined} handle
 *   Transform a hast node to estree.
 * @property {(from: HastNodes | MdxJsxAttribute | MdxJsxAttributeValueExpression | MdxJsxExpressionAttribute, to: Comment | EstreeNode) => undefined} inherit
 *   Take positional info and data from `from` (use `patch` if you don’t want data).
 * @property {(from: HastNodes, to: Comment | EstreeNode) => undefined} patch
 *   Take positional info from `from` (use `inherit` if you also want data).
 * @property {Schema} schema
 *   Current schema.
 * @property {StylePropertyNameCase} stylePropertyNameCase
 *   Casing to use for property names in `style` objects.
 * @property {boolean} tableCellAlignToStyle
 *   Turn obsolete `align` props on `td` and `th` into CSS `style` props.
 */

import {ok as assert} from 'devlop'
import {html, svg} from 'property-information'
import {position} from 'unist-util-position'
import {zwitch} from 'zwitch'
import {handlers} from './handlers/index.js'

const own = {}.hasOwnProperty

// `react-dom` triggers a warning for *any* white space in tables.
// To follow GFM, `mdast-util-to-hast` injects line endings between elements.
// Other tools might do so too, but they don’t do here, so we remove all of
// that.
//
// See: <https://github.com/facebook/react/pull/7081>.
// See: <https://github.com/facebook/react/pull/7515>.
// See: <https://github.com/remarkjs/remark-react/issues/64>.
// See: <https://github.com/rehypejs/rehype-react/pull/29>.
// See: <https://github.com/rehypejs/rehype-react/pull/32>.
// See: <https://github.com/rehypejs/rehype-react/pull/45>.
// See: <https://github.com/mdx-js/mdx/issues/2000>
const tableElements = new Set(['table', 'tbody', 'thead', 'tfoot', 'tr'])

/**
 * Create a state from options.
 *
 * @param {Options} options
 *   Configuration.
 * @returns {State}
 *   Info passed around about the current state.
 */

export function createState(options) {
  /** @type {Handle} */
  const one = zwitch('type', {
    invalid,
    unknown,
    handlers: {...handlers, ...options.handlers}
  })

  return {
    // Current space.
    elementAttributeNameCase: options.elementAttributeNameCase || 'react',
    schema: options.space === 'svg' ? svg : html,
    stylePropertyNameCase: options.stylePropertyNameCase || 'dom',
    tableCellAlignToStyle: options.tableCellAlignToStyle !== false,
    // Results.
    comments: [],
    esm: [],
    // Useful functions.
    all,
    createJsxAttributeName,
    createJsxElementName,
    handle,
    inherit,
    patch
  }

  /**
   * @this {State}
   * @param {any} node
   * @returns {JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText | null | undefined}
   */
  function handle(node) {
    return one(node, this)
  }
}

/**
 * Crash on an invalid value.
 *
 * @param {unknown} value
 *   Non-node.
 * @returns {never}
 *   Nothing (crashes).
 */
function invalid(value) {
  throw new Error('Cannot handle value `' + value + '`, expected node')
}

/**
 * Crash on an unknown node.
 *
 * @param {unknown} node
 *   Unknown node.
 * @returns {never}
 *   Nothing (crashes).
 */
function unknown(node) {
  assert(node && typeof node === 'object')
  assert('type' in node)
  throw new Error('Cannot handle unknown node `' + node.type + '`')
}

/**
 * @this {State} state
 *   Info passed around about the current state.
 * @param {HastParents} parent
 *   hast node whose children to transform.
 * @returns {Array<JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText>}
 *   estree nodes.
 */
function all(parent) {
  const children = parent.children || []
  let index = -1
  /** @type {Array<JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText>} */
  const results = []
  const ignoreLineBreak =
    this.schema.space === 'html' &&
    parent.type === 'element' &&
    tableElements.has(parent.tagName.toLowerCase())

  while (++index < children.length) {
    const child = children[index]

    if (ignoreLineBreak && child.type === 'text' && child.value === '\n') {
      continue
    }

    const result = this.handle(child)

    if (Array.isArray(result)) {
      results.push(...result)
    } else if (result) {
      results.push(result)
    }
  }

  return results
}

/**
 * Take positional info and data from `hast`.
 *
 * Use `patch` if you don’t want data.
 *
 * @param {HastNodes | MdxJsxAttribute | MdxJsxAttributeValueExpression | MdxJsxExpressionAttribute} from
 *   hast node to take positional info and data from.
 * @param {Comment | EstreeNode} to
 *   estree node to add positional info and data to.
 * @returns {undefined}
 *   Nothing.
 */
function inherit(from, to) {
  const left = /** @type {Record<string, unknown> | undefined} */ (from.data)
  /** @type {Record<string, unknown> | undefined} */
  let right
  /** @type {string} */
  let key

  patch(from, to)

  if (left) {
    for (key in left) {
      if (own.call(left, key) && key !== 'estree') {
        if (!right) right = {}
        right[key] = left[key]
      }
    }

    if (right) {
      // @ts-expect-error `esast` extension.
      to.data = right
    }
  }
}

/**
 * Take positional info from `from`.
 *
 * Use `inherit` if you also want data.
 *
 * @param {HastNodes | MdxJsxAttribute | MdxJsxAttributeValueExpression | MdxJsxExpressionAttribute} from
 *   hast node to take positional info from.
 * @param {Comment | EstreeNode} to
 *   estree node to add positional info to.
 * @returns {undefined}
 *   Nothing.
 */
function patch(from, to) {
  const p = position(from)

  if (p && p.start.offset !== undefined && p.end.offset !== undefined) {
    // @ts-expect-error acorn-style.
    to.start = p.start.offset
    // @ts-expect-error acorn-style.
    to.end = p.end.offset
    to.loc = {
      start: {line: p.start.line, column: p.start.column - 1},
      end: {line: p.end.line, column: p.end.column - 1}
    }
    to.range = [p.start.offset, p.end.offset]
  }
}

/**
 * Create a JSX attribute name.
 *
 * @param {string} name
 * @returns {JsxIdentifier | JsxNamespacedName}
 */
function createJsxAttributeName(name) {
  const node = createJsxNameFromString(name)

  // MDX never generates this.
  /* c8 ignore next 3 */
  if (node.type === 'JSXMemberExpression') {
    throw new Error('Member expressions in attribute names are not supported')
  }

  return node
}

/**
 * Create a JSX element name.
 *
 * @param {string} name
 * @returns {JsxIdentifier | JsxMemberExpression | JsxNamespacedName}
 */
function createJsxElementName(name) {
  return createJsxNameFromString(name)
}

/**
 * Create a JSX name from a string.
 *
 * @param {string} name
 *   Name.
 * @returns {JsxIdentifier | JsxMemberExpression | JsxNamespacedName}
 *   Node.
 */
function createJsxNameFromString(name) {
  if (name.includes('.')) {
    const names = name.split('.')
    let part = names.shift()
    assert(part, 'Expected `part` to be defined')
    /** @type {JsxIdentifier | JsxMemberExpression} */
    let node = {type: 'JSXIdentifier', name: part}

    while ((part = names.shift())) {
      node = {
        type: 'JSXMemberExpression',
        object: node,
        property: {type: 'JSXIdentifier', name: part}
      }
    }

    return node
  }

  if (name.includes(':')) {
    const parts = name.split(':')
    return {
      type: 'JSXNamespacedName',
      namespace: {type: 'JSXIdentifier', name: parts[0]},
      name: {type: 'JSXIdentifier', name: parts[1]}
    }
  }

  return {type: 'JSXIdentifier', name}
}
