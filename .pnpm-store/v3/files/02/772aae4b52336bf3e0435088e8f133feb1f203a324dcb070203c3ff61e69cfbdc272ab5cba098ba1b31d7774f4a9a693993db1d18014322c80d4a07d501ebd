/**
 * @import {
 *   JSXAttribute as JsxAttribute,
 *   JSXElement as JsxElement,
 *   JSXFragment as JsxFragment,
 *   JSXSpreadAttribute as JsxSpreadAttribute
 * } from 'estree-jsx'
 * @import {Expression} from 'estree'
 * @import {State} from 'hast-util-to-estree'
 * @import {
 *   MdxJsxFlowElementHast as MdxJsxFlowElement,
 *   MdxJsxTextElementHast as MdxJsxTextElement
 * } from 'mdast-util-mdx-jsx'
 */

import {attachComments} from 'estree-util-attach-comments'
import {svg} from 'property-information'

/**
 * Turn an MDX JSX element node into an estree node.
 *
 * @param {MdxJsxFlowElement | MdxJsxTextElement} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxElement | JsxFragment}
 *   JSX element or fragment.
 */
// eslint-disable-next-line complexity
export function mdxJsxElement(node, state) {
  const parentSchema = state.schema
  let schema = parentSchema
  const attributes = node.attributes || []
  let index = -1

  if (
    node.name &&
    parentSchema.space === 'html' &&
    node.name.toLowerCase() === 'svg'
  ) {
    schema = svg
    state.schema = schema
  }

  const children = state.all(node)
  /** @type {Array<JsxAttribute | JsxSpreadAttribute>} */
  const jsxAttributes = []

  while (++index < attributes.length) {
    const attribute = attributes[index]
    const value = attribute.value
    /** @type {JsxAttribute['value']} */
    let attributeValue

    if (attribute.type === 'mdxJsxAttribute') {
      if (value === null || value === undefined) {
        attributeValue = null
        // Empty.
      }
      // `MdxJsxAttributeValueExpression`.
      else if (typeof value === 'object') {
        const estree = value.data && value.data.estree
        const comments = (estree && estree.comments) || []
        /** @type {Expression | undefined} */
        let expression

        if (estree) {
          state.comments.push(...comments)
          attachComments(estree, estree.comments)
          // Should exist.
          /* c8 ignore next 5 */
          expression =
            (estree.body[0] &&
              estree.body[0].type === 'ExpressionStatement' &&
              estree.body[0].expression) ||
            undefined
        }

        attributeValue = {
          type: 'JSXExpressionContainer',
          expression: expression || {type: 'JSXEmptyExpression'}
        }
        state.inherit(value, attributeValue)
      }
      // Anything else.
      else {
        attributeValue = {type: 'Literal', value: String(value)}
      }

      /** @type {JsxAttribute} */
      const jsxAttribute = {
        type: 'JSXAttribute',
        name: state.createJsxAttributeName(attribute.name),
        value: attributeValue
      }

      state.inherit(attribute, jsxAttribute)
      jsxAttributes.push(jsxAttribute)
    }
    // MdxJsxExpressionAttribute.
    else {
      const estree = attribute.data && attribute.data.estree
      const comments = (estree && estree.comments) || []
      /** @type {JsxSpreadAttribute['argument'] | undefined} */
      let argumentValue

      if (estree) {
        state.comments.push(...comments)
        attachComments(estree, estree.comments)
        // Should exist.
        /* c8 ignore next 10 */
        argumentValue =
          (estree.body[0] &&
            estree.body[0].type === 'ExpressionStatement' &&
            estree.body[0].expression &&
            estree.body[0].expression.type === 'ObjectExpression' &&
            estree.body[0].expression.properties &&
            estree.body[0].expression.properties[0] &&
            estree.body[0].expression.properties[0].type === 'SpreadElement' &&
            estree.body[0].expression.properties[0].argument) ||
          undefined
      }

      /** @type {JsxSpreadAttribute} */
      const jsxAttribute = {
        type: 'JSXSpreadAttribute',
        argument: argumentValue || {type: 'ObjectExpression', properties: []}
      }
      state.inherit(attribute, jsxAttribute)
      jsxAttributes.push(jsxAttribute)
    }
  }

  // Restore parent schema.
  state.schema = parentSchema

  /** @type {JsxElement | JsxFragment} */
  const result = node.name
    ? {
        type: 'JSXElement',
        openingElement: {
          type: 'JSXOpeningElement',
          attributes: jsxAttributes,
          name: state.createJsxElementName(node.name),
          selfClosing: children.length === 0
        },
        closingElement:
          children.length > 0
            ? {
                type: 'JSXClosingElement',
                name: state.createJsxElementName(node.name)
              }
            : null,
        children
      }
    : {
        type: 'JSXFragment',
        openingFragment: {type: 'JSXOpeningFragment'},
        closingFragment: {type: 'JSXClosingFragment'},
        children
      }

  state.inherit(node, result)
  return result
}
