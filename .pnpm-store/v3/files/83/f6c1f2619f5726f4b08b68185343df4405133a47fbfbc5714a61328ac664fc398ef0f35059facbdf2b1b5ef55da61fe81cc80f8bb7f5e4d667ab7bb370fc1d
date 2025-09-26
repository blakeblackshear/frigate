/**
 * @typedef {import('hast').Comment} Comment
 * @typedef {import('hast').Doctype} Doctype
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Nodes} Nodes
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').RootContent} RootContent
 * @typedef {import('hast').Text} Text
 *
 * @typedef {import('parse5').DefaultTreeAdapterMap['document']} Parse5Document
 * @typedef {import('parse5').DefaultTreeAdapterMap['documentFragment']} Parse5Fragment
 * @typedef {import('parse5').DefaultTreeAdapterMap['element']} Parse5Element
 * @typedef {import('parse5').DefaultTreeAdapterMap['node']} Parse5Nodes
 * @typedef {import('parse5').DefaultTreeAdapterMap['documentType']} Parse5Doctype
 * @typedef {import('parse5').DefaultTreeAdapterMap['commentNode']} Parse5Comment
 * @typedef {import('parse5').DefaultTreeAdapterMap['textNode']} Parse5Text
 * @typedef {import('parse5').DefaultTreeAdapterMap['parentNode']} Parse5Parent
 * @typedef {import('parse5').Token.Attribute} Parse5Attribute
 *
 * @typedef {import('property-information').Schema} Schema
 */

/**
 * @typedef Options
 *   Configuration.
 * @property {Space | null | undefined} [space='html']
 *   Which space the document is in (default: `'html'`).
 *
 *   When an `<svg>` element is found in the HTML space, this package already
 *   automatically switches to and from the SVG space when entering and exiting
 *   it.
 *
 * @typedef {Exclude<Parse5Nodes, Parse5Document | Parse5Fragment>} Parse5Content
 *
 * @typedef {'html' | 'svg'} Space
 */

import {stringify as commas} from 'comma-separated-tokens'
import {ok as assert} from 'devlop'
import {find, html, svg} from 'property-information'
import {stringify as spaces} from 'space-separated-tokens'
import {webNamespaces} from 'web-namespaces'
import {zwitch} from 'zwitch'

/** @type {Options} */
const emptyOptions = {}

const own = {}.hasOwnProperty

const one = zwitch('type', {handlers: {root, element, text, comment, doctype}})

/**
 * Transform a hast tree to a `parse5` AST.
 *
 * @param {Nodes} tree
 *   Tree to transform.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Parse5Nodes}
 *   `parse5` node.
 */
export function toParse5(tree, options) {
  const settings = options || emptyOptions
  const space = settings.space
  return one(tree, space === 'svg' ? svg : html)
}

/**
 * @param {Root} node
 *   Node (hast) to transform.
 * @param {Schema} schema
 *   Current schema.
 * @returns {Parse5Document}
 *   Parse5 node.
 */
function root(node, schema) {
  /** @type {Parse5Document} */
  const result = {
    nodeName: '#document',
    // @ts-expect-error: `parse5` uses enums, which are actually strings.
    mode: (node.data || {}).quirksMode ? 'quirks' : 'no-quirks',
    childNodes: []
  }
  result.childNodes = all(node.children, result, schema)
  patch(node, result)
  return result
}

/**
 * @param {Root} node
 *   Node (hast) to transform.
 * @param {Schema} schema
 *   Current schema.
 * @returns {Parse5Fragment}
 *   Parse5 node.
 */
function fragment(node, schema) {
  /** @type {Parse5Fragment} */
  const result = {nodeName: '#document-fragment', childNodes: []}
  result.childNodes = all(node.children, result, schema)
  patch(node, result)
  return result
}

/**
 * @param {Doctype} node
 *   Node (hast) to transform.
 * @returns {Parse5Doctype}
 *   Parse5 node.
 */
function doctype(node) {
  /** @type {Parse5Doctype} */
  const result = {
    nodeName: '#documentType',
    name: 'html',
    publicId: '',
    systemId: '',
    parentNode: null
  }

  patch(node, result)
  return result
}

/**
 * @param {Text} node
 *   Node (hast) to transform.
 * @returns {Parse5Text}
 *   Parse5 node.
 */
function text(node) {
  /** @type {Parse5Text} */
  const result = {
    nodeName: '#text',
    value: node.value,
    parentNode: null
  }
  patch(node, result)
  return result
}

/**
 * @param {Comment} node
 *   Node (hast) to transform.
 * @returns {Parse5Comment}
 *   Parse5 node.
 */
function comment(node) {
  /** @type {Parse5Comment} */
  const result = {
    nodeName: '#comment',
    data: node.value,
    parentNode: null
  }

  patch(node, result)

  return result
}

/**
 * @param {Element} node
 *   Node (hast) to transform.
 * @param {Schema} schema
 *   Current schema.
 * @returns {Parse5Element}
 *   Parse5 node.
 */
function element(node, schema) {
  const parentSchema = schema
  let currentSchema = parentSchema

  if (
    node.type === 'element' &&
    node.tagName.toLowerCase() === 'svg' &&
    parentSchema.space === 'html'
  ) {
    currentSchema = svg
  }

  /** @type {Array<Parse5Attribute>} */
  const attrs = []
  /** @type {string} */
  let prop

  if (node.properties) {
    for (prop in node.properties) {
      if (prop !== 'children' && own.call(node.properties, prop)) {
        const result = createProperty(
          currentSchema,
          prop,
          node.properties[prop]
        )

        if (result) {
          attrs.push(result)
        }
      }
    }
  }

  const space = currentSchema.space
  // `html` and `svg` both have a space.
  assert(space)

  /** @type {Parse5Element} */
  const result = {
    nodeName: node.tagName,
    tagName: node.tagName,
    attrs,
    // @ts-expect-error: `parse5` types are wrong.
    namespaceURI: webNamespaces[space],
    childNodes: [],
    parentNode: null
  }
  result.childNodes = all(node.children, result, currentSchema)
  patch(node, result)

  if (node.tagName === 'template' && node.content) {
    // @ts-expect-error: `parse5` types are wrong.
    result.content = fragment(node.content, currentSchema)
  }

  return result
}

/**
 * Handle a property.
 *
 * @param {Schema} schema
 *   Current schema.
 * @param {string} prop
 *   Key.
 * @param {Array<number | string> | boolean | number | string | null | undefined} value
 *   hast property value.
 * @returns {Parse5Attribute | undefined}
 *   Field for runtime, optional.
 */
function createProperty(schema, prop, value) {
  const info = find(schema, prop)

  // Ignore nullish and `NaN` values.
  if (
    value === false ||
    value === null ||
    value === undefined ||
    (typeof value === 'number' && Number.isNaN(value)) ||
    (!value && info.boolean)
  ) {
    return
  }

  if (Array.isArray(value)) {
    // Accept `array`.
    // Most props are space-separated.
    value = info.commaSeparated ? commas(value) : spaces(value)
  }

  /** @type {Parse5Attribute} */
  const attribute = {
    name: info.attribute,
    value: value === true ? '' : String(value)
  }

  if (info.space && info.space !== 'html' && info.space !== 'svg') {
    const index = attribute.name.indexOf(':')

    if (index < 0) {
      attribute.prefix = ''
    } else {
      attribute.name = attribute.name.slice(index + 1)
      attribute.prefix = info.attribute.slice(0, index)
    }

    attribute.namespace = webNamespaces[info.space]
  }

  return attribute
}

/**
 * Transform all hast nodes.
 *
 * @param {Array<RootContent>} children
 *   List of children.
 * @param {Parse5Parent} parentNode
 *   `parse5` parent node.
 * @param {Schema} schema
 *   Current schema.
 * @returns {Array<Parse5Content>}
 *   Transformed children.
 */
function all(children, parentNode, schema) {
  let index = -1
  /** @type {Array<Parse5Content>} */
  const results = []

  if (children) {
    while (++index < children.length) {
      /** @type {Parse5Content} */
      const child = one(children[index], schema)

      child.parentNode = parentNode

      results.push(child)
    }
  }

  return results
}

/**
 * Add position info from `from` to `to`.
 *
 * @param {Nodes} from
 *   hast node.
 * @param {Parse5Nodes} to
 *   `parse5` node.
 * @returns {undefined}
 *   Nothing.
 */
function patch(from, to) {
  const position = from.position

  if (position && position.start && position.end) {
    assert(typeof position.start.offset === 'number')
    assert(typeof position.end.offset === 'number')

    to.sourceCodeLocation = {
      startLine: position.start.line,
      startCol: position.start.column,
      startOffset: position.start.offset,
      endLine: position.end.line,
      endCol: position.end.column,
      endOffset: position.end.offset
    }
  }
}
