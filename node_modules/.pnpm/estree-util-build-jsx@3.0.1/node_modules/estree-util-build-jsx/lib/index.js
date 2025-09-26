/**
 * @typedef {import('estree-jsx').Expression} Expression
 * @typedef {import('estree-jsx').Identifier} Identifier
 * @typedef {import('estree-jsx').ImportSpecifier} ImportSpecifier
 * @typedef {import('estree-jsx').JSXAttribute} JSXAttribute
 * @typedef {import('estree-jsx').JSXIdentifier} JSXIdentifier
 * @typedef {import('estree-jsx').JSXMemberExpression} JSXMemberExpression
 * @typedef {import('estree-jsx').JSXNamespacedName} JSXNamespacedName
 * @typedef {import('estree-jsx').Literal} Literal
 * @typedef {import('estree-jsx').MemberExpression} MemberExpression
 * @typedef {import('estree-jsx').Node} Node
 * @typedef {import('estree-jsx').ObjectExpression} ObjectExpression
 * @typedef {import('estree-jsx').Property} Property
 * @typedef {import('estree-jsx').SpreadElement} SpreadElement
 *
 * @typedef {'automatic' | 'classic'} Runtime
 *   How to transform JSX.
 *
 * @typedef Options
 *   Configuration.
 *
 *   > 👉 **Note**: you can also configure `runtime`, `importSource`, `pragma`,
 *   > and `pragmaFrag` from within files through comments.
 * @property {Runtime | null | undefined} [runtime='classic']
 *   Choose the runtime (default: `'classic'`).
 *
 *   Comment form: `@jsxRuntime theRuntime`.
 * @property {string | null | undefined} [importSource='react']
 *   Place to import `jsx`, `jsxs`, `jsxDEV`, and `Fragment` from, when the
 *   effective runtime is automatic (default: `'react'`).
 *
 *   Comment form: `@jsxImportSource theSource`.
 *
 *   > 👉 **Note**: `/jsx-runtime` or `/jsx-dev-runtime` is appended to this
 *   > provided source.
 *   > In CJS, that can resolve to a file (as in `theSource/jsx-runtime.js`),
 *   > but for ESM an export map needs to be set up to point to files:
 *   >
 *   > ```js
 *   > // …
 *   > "exports": {
 *   >   // …
 *   >   "./jsx-runtime": "./path/to/jsx-runtime.js",
 *   >   "./jsx-dev-runtime": "./path/to/jsx-runtime.js"
 *   >   // …
 *   > ```
 * @property {string | null | undefined} [pragma='React.createElement']
 *   Identifier or member expression to call when the effective runtime is
 *   classic (default: `'React.createElement'`).
 *
 *   Comment form: `@jsx identifier`.
 * @property {string | null | undefined} [pragmaFrag='React.Fragment']
 *   Identifier or member expression to use as a symbol for fragments when the
 *   effective runtime is classic (default: `'React.Fragment'`).
 *
 *   Comment form: `@jsxFrag identifier`.
 * @property {boolean | null | undefined} [development=false]
 *   When in the automatic runtime, whether to import
 *   `theSource/jsx-dev-runtime.js`, use `jsxDEV`, and pass location info when
 *   available (default: `false`).
 *
 *   This helps debugging but adds a lot of code that you don’t want in
 *   production.
 * @property {string | null | undefined} [filePath]
 *   File path to the original source file (optional).
 *
 *   Passed in location info to `jsxDEV` when using the automatic runtime with
 *   `development: true`.
 *
 * @typedef Annotations
 *   State where info from comments is gathered.
 * @property {string | undefined} [jsx]
 *   JSX identifier (`pragma`).
 * @property {string | undefined} [jsxFrag]
 *   JSX identifier of fragment (`pragmaFrag`).
 * @property {string | undefined} [jsxImportSource]
 *   Where to import an automatic JSX runtime from.
 * @property {Runtime | undefined} [jsxRuntime]
 *   Runtime.
 *
 * @typedef Imports
 *   State of used identifiers from the automatic runtime.
 * @property {boolean | undefined} [fragment]
 *   Symbol of `Fragment`.
 * @property {boolean | undefined} [jsx]
 *   Symbol of `jsx`.
 * @property {boolean | undefined} [jsxs]
 *   Symbol of `jsxs`.
 * @property {boolean | undefined} [jsxDEV]
 *   Symbol of `jsxDEV`.
 */

import {ok as assert} from 'devlop'
import {name as isIdentifierName} from 'estree-util-is-identifier-name'
import {walk} from 'estree-walker'

const regex = /@(jsx|jsxFrag|jsxImportSource|jsxRuntime)\s+(\S+)/g

/**
 * Turn JSX in `tree` into function calls: `<x />` -> `h('x')`!
 *
 * ###### Algorithm
 *
 * In almost all cases, this utility is the same as the Babel plugin, except that
 * they work on slightly different syntax trees.
 *
 * Some differences:
 *
 * *   no pure annotations things
 * *   `this` is not a component: `<this>` -> `h('this')`, not `h(this)`
 * *   namespaces are supported: `<a:b c:d>` -> `h('a:b', {'c:d': true})`,
 *     which throws by default in Babel or can be turned on with `throwIfNamespace`
 * *   no `useSpread`, `useBuiltIns`, or `filter` options
 *
 * @param {Node} tree
 *   Tree to transform (typically `Program`).
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export function buildJsx(tree, options) {
  const config = options || {}
  let automatic = config.runtime === 'automatic'
  /** @type {Annotations} */
  const annotations = {}
  /** @type {Imports} */
  const imports = {}

  walk(tree, {
    enter(node) {
      if (node.type === 'Program') {
        const comments = node.comments || []
        let index = -1

        while (++index < comments.length) {
          regex.lastIndex = 0

          let match = regex.exec(comments[index].value)

          while (match) {
            // @ts-expect-error: `match[1]` is always a key, `match[2]` when
            // runtime is checked later.
            annotations[match[1]] = match[2]
            match = regex.exec(comments[index].value)
          }
        }

        if (annotations.jsxRuntime) {
          if (annotations.jsxRuntime === 'automatic') {
            automatic = true

            if (annotations.jsx) {
              throw new Error('Unexpected `@jsx` pragma w/ automatic runtime')
            }

            if (annotations.jsxFrag) {
              throw new Error(
                'Unexpected `@jsxFrag` pragma w/ automatic runtime'
              )
            }
          } else if (annotations.jsxRuntime === 'classic') {
            automatic = false

            if (annotations.jsxImportSource) {
              throw new Error(
                'Unexpected `@jsxImportSource` w/ classic runtime'
              )
            }
          } else {
            throw new Error(
              'Unexpected `jsxRuntime` `' +
                annotations.jsxRuntime +
                '`, expected `automatic` or `classic`'
            )
          }
        }
      }
    },
    // eslint-disable-next-line complexity
    leave(node) {
      if (node.type === 'Program') {
        /** @type {Array<ImportSpecifier>} */
        const specifiers = []

        if (imports.fragment) {
          specifiers.push({
            type: 'ImportSpecifier',
            imported: {type: 'Identifier', name: 'Fragment'},
            local: {type: 'Identifier', name: '_Fragment'}
          })
        }

        if (imports.jsx) {
          specifiers.push({
            type: 'ImportSpecifier',
            imported: {type: 'Identifier', name: 'jsx'},
            local: {type: 'Identifier', name: '_jsx'}
          })
        }

        if (imports.jsxs) {
          specifiers.push({
            type: 'ImportSpecifier',
            imported: {type: 'Identifier', name: 'jsxs'},
            local: {type: 'Identifier', name: '_jsxs'}
          })
        }

        if (imports.jsxDEV) {
          specifiers.push({
            type: 'ImportSpecifier',
            imported: {type: 'Identifier', name: 'jsxDEV'},
            local: {type: 'Identifier', name: '_jsxDEV'}
          })
        }

        if (specifiers.length > 0) {
          let injectIndex = 0

          while (injectIndex < node.body.length) {
            const child = node.body[injectIndex]

            if ('directive' in child && child.directive) {
              injectIndex++
            } else {
              break
            }
          }

          node.body.splice(injectIndex, 0, {
            type: 'ImportDeclaration',
            specifiers,
            source: {
              type: 'Literal',
              value:
                (annotations.jsxImportSource ||
                  config.importSource ||
                  'react') +
                (config.development ? '/jsx-dev-runtime' : '/jsx-runtime')
            }
          })
        }
      }

      if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') {
        return
      }

      /** @type {Array<Expression>} */
      const children = []
      let index = -1

      // Figure out `children`.
      while (++index < node.children.length) {
        const child = node.children[index]

        if (child.type === 'JSXExpressionContainer') {
          // Ignore empty expressions.
          if (child.expression.type !== 'JSXEmptyExpression') {
            children.push(child.expression)
          }
        } else if (child.type === 'JSXText') {
          const value = child.value
            // Replace tabs w/ spaces.
            .replace(/\t/g, ' ')
            // Use line feeds, drop spaces around them.
            .replace(/ *(\r?\n|\r) */g, '\n')
            // Collapse multiple line feeds.
            .replace(/\n+/g, '\n')
            // Drop final line feeds.
            .replace(/\n+$/, '')
            // Drop first line feeds.
            .replace(/^\n+/, '')
            // Replace line feeds with spaces.
            .replace(/\n/g, ' ')

          // Ignore collapsible text.
          if (value) {
            /** @type {Node} */
            const text = {type: 'Literal', value}
            create(child, text)
            children.push(text)
          }
        } else {
          assert(
            child.type !== 'JSXElement' &&
              child.type !== 'JSXFragment' &&
              child.type !== 'JSXSpreadChild'
          )
          children.push(child)
        }
      }

      /** @type {Identifier | Literal | MemberExpression} */
      let name
      /** @type {Array<Property | SpreadElement>} */
      const fields = []
      /** @type {Array<Expression>} */
      let parameters = []
      /** @type {Expression | undefined} */
      let key

      // Do the stuff needed for elements.
      if (node.type === 'JSXElement') {
        name = toIdentifier(node.openingElement.name)

        // If the name could be an identifier, but start with a lowercase letter,
        // it’s not a component.
        if (name.type === 'Identifier' && /^[a-z]/.test(name.name)) {
          /** @type {Node} */
          const next = {type: 'Literal', value: name.name}
          create(name, next)
          name = next
        }

        /** @type {boolean | undefined} */
        let spread
        const attributes = node.openingElement.attributes
        let index = -1

        // Place props in the right order, because we might have duplicates
        // in them and what’s spread in.
        while (++index < attributes.length) {
          const attribute = attributes[index]

          if (attribute.type === 'JSXSpreadAttribute') {
            if (attribute.argument.type === 'ObjectExpression') {
              fields.push(...attribute.argument.properties)
            } else {
              fields.push({type: 'SpreadElement', argument: attribute.argument})
            }

            spread = true
          } else {
            const prop = toProperty(attribute)

            if (
              automatic &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'key'
            ) {
              if (spread) {
                throw new Error(
                  'Expected `key` to come before any spread expressions'
                )
              }

              const value = prop.value

              assert(
                value.type !== 'AssignmentPattern' &&
                  value.type !== 'ArrayPattern' &&
                  value.type !== 'ObjectPattern' &&
                  value.type !== 'RestElement'
              )

              key = value
            } else {
              fields.push(prop)
            }
          }
        }
      }
      // …and fragments.
      else if (automatic) {
        imports.fragment = true
        name = {type: 'Identifier', name: '_Fragment'}
      } else {
        name = toMemberExpression(
          annotations.jsxFrag || config.pragmaFrag || 'React.Fragment'
        )
      }

      if (automatic) {
        if (children.length > 0) {
          fields.push({
            type: 'Property',
            key: {type: 'Identifier', name: 'children'},
            value:
              children.length > 1
                ? {type: 'ArrayExpression', elements: children}
                : children[0],
            kind: 'init',
            method: false,
            shorthand: false,
            computed: false
          })
        }
      } else {
        parameters = children
      }

      /** @type {Identifier | Literal | MemberExpression} */
      let callee

      if (automatic) {
        parameters.push({type: 'ObjectExpression', properties: fields})

        if (key) {
          parameters.push(key)
        } else if (config.development) {
          parameters.push({type: 'Identifier', name: 'undefined'})
        }

        const isStaticChildren = children.length > 1

        if (config.development) {
          imports.jsxDEV = true
          callee = {
            type: 'Identifier',
            name: '_jsxDEV'
          }
          parameters.push({type: 'Literal', value: isStaticChildren})

          /** @type {ObjectExpression} */
          const source = {
            type: 'ObjectExpression',
            properties: [
              {
                type: 'Property',
                method: false,
                shorthand: false,
                computed: false,
                kind: 'init',
                key: {type: 'Identifier', name: 'fileName'},
                value: {
                  type: 'Literal',
                  value: config.filePath || '<source.js>'
                }
              }
            ]
          }

          if (node.loc) {
            source.properties.push(
              {
                type: 'Property',
                method: false,
                shorthand: false,
                computed: false,
                kind: 'init',
                key: {type: 'Identifier', name: 'lineNumber'},
                value: {type: 'Literal', value: node.loc.start.line}
              },
              {
                type: 'Property',
                method: false,
                shorthand: false,
                computed: false,
                kind: 'init',
                key: {type: 'Identifier', name: 'columnNumber'},
                value: {type: 'Literal', value: node.loc.start.column + 1}
              }
            )
          }

          parameters.push(source, {type: 'ThisExpression'})
        } else if (isStaticChildren) {
          imports.jsxs = true
          callee = {type: 'Identifier', name: '_jsxs'}
        } else {
          imports.jsx = true
          callee = {type: 'Identifier', name: '_jsx'}
        }
      }
      // Classic.
      else {
        if (fields.length > 0) {
          parameters.unshift({type: 'ObjectExpression', properties: fields})
        } else if (parameters.length > 0) {
          parameters.unshift({type: 'Literal', value: null})
        }

        callee = toMemberExpression(
          annotations.jsx || config.pragma || 'React.createElement'
        )
      }

      parameters.unshift(name)
      /** @type {Node} */
      const call = {
        type: 'CallExpression',
        callee,
        arguments: parameters,
        optional: false
      }
      create(node, call)
      this.replace(call)
    }
  })
}

/**
 * Turn a JSX attribute into a JavaScript property.
 *
 * @param {JSXAttribute} node
 *   JSX attribute.
 * @returns {Property}
 *   JS property.
 */
function toProperty(node) {
  /** @type {Expression} */
  let value

  if (node.value) {
    if (node.value.type === 'JSXExpressionContainer') {
      const valueExpression = node.value.expression
      assert(
        valueExpression.type !== 'JSXEmptyExpression',
        '`JSXEmptyExpression` is not allowed in props.'
      )
      value = valueExpression
    }
    // Literal or call expression.
    else {
      const nodeValue = node.value
      assert(
        nodeValue.type !== 'JSXElement' && nodeValue.type !== 'JSXFragment',
        'JSX{Element,Fragment} are already compiled to `CallExpression`'
      )
      value = nodeValue
      delete value.raw
    }
  }
  // Boolean prop.
  else {
    value = {type: 'Literal', value: true}
  }

  /** @type {Property} */
  const replacement = {
    type: 'Property',
    key: toIdentifier(node.name),
    value,
    kind: 'init',
    method: false,
    shorthand: false,
    computed: false
  }
  create(node, replacement)
  return replacement
}

/**
 * Turn a JSX identifier into a normal JS identifier.
 *
 * @param {JSXIdentifier | JSXMemberExpression | JSXNamespacedName} node
 *   JSX identifier.
 * @returns {Identifier | Literal | MemberExpression}
 *   JS identifier.
 */
function toIdentifier(node) {
  /** @type {Identifier | Literal | MemberExpression} */
  let replace

  if (node.type === 'JSXMemberExpression') {
    // `property` is always a `JSXIdentifier`, but it could be something that
    // isn’t an ES identifier name.
    const id = toIdentifier(node.property)
    replace = {
      type: 'MemberExpression',
      object: toIdentifier(node.object),
      property: id,
      computed: id.type === 'Literal',
      optional: false
    }
  } else if (node.type === 'JSXNamespacedName') {
    replace = {
      type: 'Literal',
      value: node.namespace.name + ':' + node.name.name
    }
  }
  // Must be `JSXIdentifier`.
  else {
    replace = isIdentifierName(node.name)
      ? {type: 'Identifier', name: node.name}
      : {type: 'Literal', value: node.name}
  }

  create(node, replace)
  return replace
}

/**
 * Turn a dotted string into a member expression.
 *
 * @param {string} id
 *   Identifiers.
 * @returns {Identifier | Literal | MemberExpression}
 *   Expression.
 */
function toMemberExpression(id) {
  const identifiers = id.split('.')
  let index = -1
  /** @type {Identifier | Literal | MemberExpression | undefined} */
  let result

  while (++index < identifiers.length) {
    /** @type {Identifier | Literal} */
    const prop = isIdentifierName(identifiers[index])
      ? {type: 'Identifier', name: identifiers[index]}
      : {type: 'Literal', value: identifiers[index]}
    result = result
      ? {
          type: 'MemberExpression',
          object: result,
          property: prop,
          computed: Boolean(index && prop.type === 'Literal'),
          optional: false
        }
      : prop
  }

  assert(result, 'always a result')
  return result
}

/**
 * Inherit some fields from `from` into `to`.
 *
 * @param {Node} from
 *   Node to inherit from.
 * @param {Node} to
 *   Node to add to.
 * @returns {undefined}
 *   Nothing.
 */
function create(from, to) {
  const fields = ['start', 'end', 'loc', 'range', 'comments']
  let index = -1

  while (++index < fields.length) {
    const field = fields[index]
    if (field in from) {
      // @ts-expect-error: indexable.
      to[field] = from[field]
    }
  }
}
