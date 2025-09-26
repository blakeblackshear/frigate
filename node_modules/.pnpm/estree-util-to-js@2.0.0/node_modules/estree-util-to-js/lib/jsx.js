/**
 * @typedef {import('estree-jsx').JSXAttribute} JsxAttribute
 * @typedef {import('estree-jsx').JSXClosingElement} JsxClosingElement
 * @typedef {import('estree-jsx').JSXClosingFragment} JsxClosingFragment
 * @typedef {import('estree-jsx').JSXElement} JsxElement
 * @typedef {import('estree-jsx').JSXExpressionContainer} JsxExpressionContainer
 * @typedef {import('estree-jsx').JSXFragment} JsxFragment
 * @typedef {import('estree-jsx').JSXIdentifier} JsxIdentifier
 * @typedef {import('estree-jsx').JSXMemberExpression} JsxMemberExpression
 * @typedef {import('estree-jsx').JSXNamespacedName} JsxNamespacedName
 * @typedef {import('estree-jsx').JSXOpeningElement} JsxOpeningElement
 * @typedef {import('estree-jsx').JSXOpeningFragment} JsxOpeningFragment
 * @typedef {import('estree-jsx').JSXSpreadAttribute} JsxSpreadAttribute
 * @typedef {import('estree-jsx').JSXText} JsxText
 *
 * @typedef {import('./index.js').Generator} Generator
 * @typedef {import('./index.js').State} State
 */

export const jsx = {
  JSXAttribute: jsxAttribute,
  JSXClosingElement: jsxClosingElement,
  JSXClosingFragment: jsxClosingFragment,
  JSXElement: jsxElement,
  JSXEmptyExpression: jsxEmptyExpression,
  JSXExpressionContainer: jsxExpressionContainer,
  JSXFragment: jsxFragment,
  JSXIdentifier: jsxIdentifier,
  JSXMemberExpression: jsxMemberExpression,
  JSXNamespacedName: jsxNamespacedName,
  JSXOpeningElement: jsxOpeningElement,
  JSXOpeningFragment: jsxOpeningFragment,
  JSXSpreadAttribute: jsxSpreadAttribute,
  JSXText: jsxText
}

/**
 * `attr`
 * `attr="something"`
 * `attr={1}`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxAttribute} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxAttribute(node, state) {
  this[node.name.type](node.name, state)

  if (node.value !== null && node.value !== undefined) {
    state.write('=')

    // Encode double quotes in attribute values.
    if (node.value.type === 'Literal') {
      state.write(
        '"' + encodeJsx(String(node.value.value)).replace(/"/g, '&quot;') + '"',
        node
      )
    } else {
      this[node.value.type](node.value, state)
    }
  }
}

/**
 * `</div>`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxClosingElement} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxClosingElement(node, state) {
  state.write('</')
  this[node.name.type](node.name, state)
  state.write('>')
}

/**
 * `</>`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxClosingFragment} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxClosingFragment(node, state) {
  state.write('</>', node)
}

/**
 * `<div />`
 * `<div></div>`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxElement} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxElement(node, state) {
  let index = -1

  this[node.openingElement.type](node.openingElement, state)

  if (node.children) {
    while (++index < node.children.length) {
      const child = node.children[index]

      // Supported in types but not by Acorn.
      /* c8 ignore next 3 */
      if (child.type === 'JSXSpreadChild') {
        throw new Error('JSX spread children are not supported')
      }

      this[child.type](child, state)
    }
  }

  if (node.closingElement) {
    this[node.closingElement.type](node.closingElement, state)
  }
}

/**
 * `{}` (always in a `JSXExpressionContainer`, which does the curlies)
 *
 * @this {Generator}
 *   `astring` generator.
 * @returns {undefined}
 *   Nothing.
 */
function jsxEmptyExpression() {}

/**
 * `{expression}`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxExpressionContainer} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxExpressionContainer(node, state) {
  state.write('{')
  this[node.expression.type](node.expression, state)
  state.write('}')
}

/**
 * `<></>`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxFragment} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxFragment(node, state) {
  let index = -1

  this[node.openingFragment.type](node.openingFragment, state)

  if (node.children) {
    while (++index < node.children.length) {
      const child = node.children[index]

      // Supported in types but not by Acorn.
      /* c8 ignore next 3 */
      if (child.type === 'JSXSpreadChild') {
        throw new Error('JSX spread children are not supported')
      }

      this[child.type](child, state)
    }
  }

  this[node.closingFragment.type](node.closingFragment, state)
}

/**
 * `div`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxIdentifier} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxIdentifier(node, state) {
  state.write(node.name, node)
}

/**
 * `member.expression`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxMemberExpression} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxMemberExpression(node, state) {
  this[node.object.type](node.object, state)
  state.write('.')
  this[node.property.type](node.property, state)
}

/**
 * `ns:name`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxNamespacedName} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxNamespacedName(node, state) {
  this[node.namespace.type](node.namespace, state)
  state.write(':')
  this[node.name.type](node.name, state)
}

/**
 * `<div>`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxOpeningElement} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxOpeningElement(node, state) {
  let index = -1

  state.write('<')
  this[node.name.type](node.name, state)

  if (node.attributes) {
    while (++index < node.attributes.length) {
      state.write(' ')
      this[node.attributes[index].type](node.attributes[index], state)
    }
  }

  state.write(node.selfClosing ? ' />' : '>')
}

/**
 * `<>`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxOpeningFragment} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxOpeningFragment(node, state) {
  state.write('<>', node)
}

/**
 * `{...argument}`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxSpreadAttribute} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxSpreadAttribute(node, state) {
  state.write('{')
  // eslint-disable-next-line new-cap
  this.SpreadElement(node, state)
  state.write('}')
}

/**
 * `!`
 *
 * @this {Generator}
 *   `astring` generator.
 * @param {JsxText} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function jsxText(node, state) {
  state.write(encodeJsx(node.value).replace(/[<>{}]/g, replaceJsxChar), node)
}

/**
 * Make sure that character references don’t pop up.
 *
 * For example, the text `&copy;` should stay that way, and not turn into `©`.
 * We could encode all `&` (easy but verbose) or look for actual valid
 * references (complex but cleanest output).
 * Looking for the 2nd character gives us a middle ground.
 * The `#` is for (decimal and hexadecimal) numeric references, the letters
 * are for the named references.
 *
 * @param {string} value
 *   Value to encode.
 * @returns {string}
 *   Encoded value.
 */
function encodeJsx(value) {
  return value.replace(/&(?=[#a-z])/gi, '&amp;')
}

/**
 * @param {string} $0
 * @returns {string}
 */
function replaceJsxChar($0) {
  return $0 === '<'
    ? '&lt;'
    : $0 === '>'
    ? '&gt;'
    : $0 === '{'
    ? '&#123;'
    : '&#125;'
}
