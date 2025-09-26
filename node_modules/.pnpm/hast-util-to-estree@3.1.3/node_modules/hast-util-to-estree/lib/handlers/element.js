/**
 * @import {
 *   JSXAttribute as JsxAttribute,
 *   JSXElement as JsxElement,
 *   JSXSpreadAttribute as JsxSpreadAttribute,
 * } from 'estree-jsx'
 * @import {Property} from 'estree'
 * @import {State} from 'hast-util-to-estree'
 * @import {Element as HastElement} from 'hast'
 */

import {stringify as commas} from 'comma-separated-tokens'
import {name as identifierName} from 'estree-util-is-identifier-name'
import {find, hastToReact, svg} from 'property-information'
import {stringify as spaces} from 'space-separated-tokens'
import styleToJs from 'style-to-js'

const own = {}.hasOwnProperty
const cap = /[A-Z]/g

const tableCellElement = new Set(['td', 'th'])

/**
 * Turn a hast element into an estree node.
 *
 * @param {HastElement} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxElement}
 *   estree expression.
 */
// eslint-disable-next-line complexity
export function element(node, state) {
  const parentSchema = state.schema
  let schema = parentSchema
  const properties = node.properties || {}

  if (parentSchema.space === 'html' && node.tagName.toLowerCase() === 'svg') {
    schema = svg
    state.schema = schema
  }

  const children = state.all(node)

  /** @type {Array<JsxAttribute | JsxSpreadAttribute>} */
  const attributes = []
  /** @type {string} */
  let property
  /** @type {string | undefined} */
  let alignValue
  /** @type {Array<Property> | undefined} */
  let styleProperties

  for (property in properties) {
    if (own.call(properties, property)) {
      let value = properties[property]
      const info = find(schema, property)
      /** @type {JsxAttribute['value']} */
      let attributeValue

      // Ignore nullish and `NaN` values.
      // Ignore `false` and falsey known booleans.
      if (
        value === null ||
        value === undefined ||
        value === false ||
        (typeof value === 'number' && Number.isNaN(value)) ||
        (!value && info.boolean)
      ) {
        continue
      }

      property =
        state.elementAttributeNameCase === 'react' && info.space
          ? hastToReact[info.property] || info.property
          : info.attribute

      if (Array.isArray(value)) {
        // Accept `array`.
        // Most properties are space-separated.
        value = info.commaSeparated ? commas(value) : spaces(value)
      }

      if (property === 'style') {
        let styleObject =
          typeof value === 'object'
            ? value
            : parseStyle(String(value), node.tagName)

        if (state.stylePropertyNameCase === 'css') {
          styleObject = transformStylesToCssCasing(styleObject)
        }

        /** @type {Array<Property>} */
        const cssProperties = []
        /** @type {string} */
        let cssProperty

        for (cssProperty in styleObject) {
          // eslint-disable-next-line max-depth
          if (own.call(styleObject, cssProperty)) {
            cssProperties.push({
              type: 'Property',
              method: false,
              shorthand: false,
              computed: false,
              key: identifierName(cssProperty)
                ? {type: 'Identifier', name: cssProperty}
                : {type: 'Literal', value: cssProperty},
              value: {type: 'Literal', value: String(styleObject[cssProperty])},
              kind: 'init'
            })
          }
        }

        styleProperties = cssProperties
        attributeValue = {
          type: 'JSXExpressionContainer',
          expression: {type: 'ObjectExpression', properties: cssProperties}
        }
      } else if (value === true) {
        attributeValue = null
      } else if (
        state.tableCellAlignToStyle &&
        tableCellElement.has(node.tagName) &&
        property === 'align'
      ) {
        alignValue = String(value)
        continue
      } else {
        attributeValue = {type: 'Literal', value: String(value)}
      }

      if (identifierName(property, {jsx: true})) {
        attributes.push({
          type: 'JSXAttribute',
          name: {type: 'JSXIdentifier', name: property},
          value: attributeValue
        })
      } else {
        attributes.push({
          type: 'JSXSpreadAttribute',
          argument: {
            type: 'ObjectExpression',
            properties: [
              {
                type: 'Property',
                method: false,
                shorthand: false,
                computed: false,
                key: {type: 'Literal', value: String(property)},
                // @ts-expect-error No need to worry about `style` (which has a
                // `JSXExpressionContainer` value) because that’s a valid identifier.
                value: attributeValue || {type: 'Literal', value: true},
                kind: 'init'
              }
            ]
          }
        })
      }
    }
  }

  if (alignValue !== undefined) {
    if (!styleProperties) {
      styleProperties = []
      attributes.push({
        type: 'JSXAttribute',
        name: {type: 'JSXIdentifier', name: 'style'},
        value: {
          type: 'JSXExpressionContainer',
          expression: {type: 'ObjectExpression', properties: styleProperties}
        }
      })
    }

    const cssProperty =
      state.stylePropertyNameCase === 'css'
        ? transformStyleToCssCasing('textAlign')
        : 'textAlign'

    styleProperties.push({
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      key: identifierName(cssProperty)
        ? {type: 'Identifier', name: cssProperty}
        : {type: 'Literal', value: cssProperty},
      value: {type: 'Literal', value: alignValue},
      kind: 'init'
    })
  }

  // Restore parent schema.
  state.schema = parentSchema

  /** @type {JsxElement} */
  const result = {
    type: 'JSXElement',
    openingElement: {
      type: 'JSXOpeningElement',
      attributes,
      name: state.createJsxElementName(node.tagName),
      selfClosing: children.length === 0
    },
    closingElement:
      children.length > 0
        ? {
            type: 'JSXClosingElement',
            name: state.createJsxElementName(node.tagName)
          }
        : null,
    children
  }
  state.inherit(node, result)
  return result
}

/**
 * Parse CSS rules as a declaration.
 *
 * @param {string} value
 *   CSS text.
 * @param {string} tagName
 *   Element name.
 * @returns {Record<string, string>}
 *   Properties.
 */
function parseStyle(value, tagName) {
  try {
    return styleToJs(value, {reactCompat: true})
  } catch (error) {
    const cause = /** @type {Error} */ (error)
    const exception = new Error(
      'Could not parse `style` attribute on `' + tagName + '`',
      {cause}
    )
    throw exception
  }
}

/**
 * Transform a DOM casing style object to a CSS casing style object.
 *
 * @param {Record<string, string>} domCasing
 * @returns {Record<string, string>}
 */
function transformStylesToCssCasing(domCasing) {
  /** @type {Record<string, string>} */
  const cssCasing = {}
  /** @type {string} */
  let from

  for (from in domCasing) {
    if (own.call(domCasing, from)) {
      cssCasing[transformStyleToCssCasing(from)] = domCasing[from]
    }
  }

  return cssCasing
}

/**
 * Transform a DOM casing style property to a CSS casing style property.
 *
 * @param {string} from
 * @returns {string}
 */
function transformStyleToCssCasing(from) {
  let to = from.replace(cap, toDash)
  // Handle `ms-xxx` -> `-ms-xxx`.
  if (to.slice(0, 3) === 'ms-') to = '-' + to
  return to
}

/**
 * Make `$0` dash cased.
 *
 * @param {string} $0
 *   Capitalized ASCII leter.
 * @returns {string}
 *   Dash and lower letter.
 */
function toDash($0) {
  return '-' + $0.toLowerCase()
}
