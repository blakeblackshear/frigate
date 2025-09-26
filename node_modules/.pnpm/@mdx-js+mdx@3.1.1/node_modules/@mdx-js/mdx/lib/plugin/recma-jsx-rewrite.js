/**
 * @import {
      Expression,
      Function as EstreeFunction,
      Identifier,
      ImportSpecifier,
      JSXElement,
      ModuleDeclaration,
      ObjectPattern,
      Program,
      Property,
      SpreadElement,
      Statement,
      VariableDeclarator
 * } from 'estree-jsx'
 * @import {Scope} from 'estree-util-scope'
 * @import {VFile} from 'vfile'
 * @import {ProcessorOptions} from '../core.js'
 */

/**
 * @typedef StackEntry
 *   Entry.
 * @property {Array<string>} components
 *   Used components.
 * @property {Map<string, string>} idToInvalidComponentName
 *   Map of JSX identifiers which cannot be used as JS identifiers, to valid JS identifiers.
 * @property {Readonly<EstreeFunction>} node
 *   Function.
 * @property {Array<string>} objects
 *   Identifiers of used objects (such as `x` in `x.y`).
 * @property {Record<string, {node: Readonly<JSXElement>, component: boolean}>} references
 *   Map of JSX identifiers for components and objects, to where they were first used.
 * @property {Array<string>} tags
 *   Tag names.
 */

import {name as isIdentifierName} from 'estree-util-is-identifier-name'
import {createVisitors} from 'estree-util-scope'
import {walk} from 'estree-walker'
import {stringifyPosition} from 'unist-util-stringify-position'
import {positionFromEstree} from 'unist-util-position-from-estree'
import {specifiersToDeclarations} from '../util/estree-util-specifiers-to-declarations.js'
import {toBinaryAddition} from '../util/estree-util-to-binary-addition.js'
import {
  toIdOrMemberExpression,
  toJsxIdOrMemberExpression
} from '../util/estree-util-to-id-or-member-expression.js'

/**
 * A plugin that rewrites JSX in functions to accept components as
 * `props.components` (when the function is called `_createMdxContent`), or from
 * a provider (if there is one).
 * It also makes sure that any undefined components are defined: either from
 * received components or as a function that throws an error.
 *
 * @param {Readonly<ProcessorOptions>} options
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export function recmaJsxRewrite(options) {
  const {development, outputFormat, providerImportSource} = options

  /**
   * @param {Program} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree, file) {
    const visitors = createVisitors()
    /** @type {Array<StackEntry>} */
    const functionStack = []
    let importProvider = false
    let createErrorHelper = false

    walk(tree, {
      enter(node) {
        visitors.enter(node)

        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression'
        ) {
          functionStack.push({
            components: [],
            idToInvalidComponentName: new Map(),
            node,
            objects: [],
            references: {},
            tags: []
          })

          // `MDXContent` only ever contains `MDXLayout`.
          if (
            isNamedFunction(node, 'MDXContent') &&
            !inScope(visitors.scopes, 'MDXLayout')
          ) {
            functionStack[0].components.push('MDXLayout')
          }
        }

        const functionInfo = functionStack[0]

        if (
          !functionInfo ||
          (!isNamedFunction(functionInfo.node, '_createMdxContent') &&
            !providerImportSource)
        ) {
          return
        }

        if (node.type === 'JSXElement') {
          let name = node.openingElement.name

          // `<x.y>`, `<Foo.Bar>`, `<x.y.z>`.
          if (name.type === 'JSXMemberExpression') {
            /** @type {Array<string>} */
            const ids = []

            // Find the left-most identifier.
            while (name.type === 'JSXMemberExpression') {
              ids.unshift(name.property.name)
              name = name.object
            }

            ids.unshift(name.name)
            const fullId = ids.join('.')
            const id = name.name
            const isInScope = inScope(visitors.scopes, id)

            if (
              !Object.hasOwn(functionInfo.references, fullId) &&
              (!isInScope ||
                // If the parent scope is `_createMdxContent`, then this
                // references a component we can add a check statement for.
                (functionStack.length === 1 &&
                  functionStack[0].node.type === 'FunctionDeclaration' &&
                  isNamedFunction(functionStack[0].node, '_createMdxContent')))
            ) {
              functionInfo.references[fullId] = {component: true, node}
            }

            if (!functionInfo.objects.includes(id) && !isInScope) {
              functionInfo.objects.push(id)
            }
          }
          // `<xml:thing>`.
          else if (name.type === 'JSXNamespacedName') {
            // Ignore namespaces.
          }
          // If the name is a valid ES identifier, and it doesn’t start with a
          // lowercase letter, it’s a component.
          // For example, `$foo`, `_bar`, `Baz` are all component names.
          // But `foo` and `b-ar` are tag names.
          else if (isIdentifierName(name.name) && !/^[a-z]/.test(name.name)) {
            const id = name.name

            if (!inScope(visitors.scopes, id)) {
              // No need to add an error for an undefined layout — we use an
              // `if` later.
              if (
                id !== 'MDXLayout' &&
                !Object.hasOwn(functionInfo.references, id)
              ) {
                functionInfo.references[id] = {component: true, node}
              }

              if (!functionInfo.components.includes(id)) {
                functionInfo.components.push(id)
              }
            }
          } else if (node.data && node.data._mdxExplicitJsx) {
            // Do not turn explicit JSX into components from `_components`.
            // As in, a given `h1` component is used for `# heading` (next case),
            // but not for `<h1>heading</h1>`.
          } else {
            const id = name.name

            if (!functionInfo.tags.includes(id)) {
              functionInfo.tags.push(id)
            }

            /** @type {Array<number | string>} */
            let jsxIdExpression = ['_components', id]
            if (isIdentifierName(id) === false) {
              let invalidComponentName =
                functionInfo.idToInvalidComponentName.get(id)
              if (invalidComponentName === undefined) {
                invalidComponentName = `_component${functionInfo.idToInvalidComponentName.size}`
                functionInfo.idToInvalidComponentName.set(
                  id,
                  invalidComponentName
                )
              }

              jsxIdExpression = [invalidComponentName]
            }

            node.openingElement.name =
              toJsxIdOrMemberExpression(jsxIdExpression)

            if (node.closingElement) {
              node.closingElement.name =
                toJsxIdOrMemberExpression(jsxIdExpression)
            }
          }
        }
      },
      leave(node) {
        visitors.exit(node)

        /** @type {Array<Property | SpreadElement>} */
        const defaults = []
        /** @type {Array<string>} */
        const actual = []
        /** @type {Array<Expression>} */
        const parameters = []
        /** @type {Array<VariableDeclarator>} */
        const declarations = []

        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression'
        ) {
          const functionInfo = functionStack[functionStack.length - 1]

          /** @type {string} */
          let name

          for (name of functionInfo.tags.sort()) {
            defaults.push({
              type: 'Property',
              kind: 'init',
              key: isIdentifierName(name)
                ? {type: 'Identifier', name}
                : {type: 'Literal', value: name},
              value: {type: 'Literal', value: name},
              method: false,
              shorthand: false,
              computed: false
            })
          }

          actual.push(...functionInfo.components)

          for (name of functionInfo.objects) {
            // In some cases, a component is used directly (`<X>`) but it’s also
            // used as an object (`<X.Y>`).
            if (!actual.includes(name)) {
              actual.push(name)
            }
          }

          actual.sort()

          /** @type {Array<Statement>} */
          const statements = []

          if (
            defaults.length > 0 ||
            actual.length > 0 ||
            functionInfo.idToInvalidComponentName.size > 0
          ) {
            if (providerImportSource) {
              importProvider = true
              parameters.push({
                type: 'CallExpression',
                callee: {type: 'Identifier', name: '_provideComponents'},
                arguments: [],
                optional: false
              })
            }

            // Accept `components` as a prop if this is the `MDXContent` or
            // `_createMdxContent` function.
            if (
              isNamedFunction(functionInfo.node, 'MDXContent') ||
              isNamedFunction(functionInfo.node, '_createMdxContent')
            ) {
              parameters.push(toIdOrMemberExpression(['props', 'components']))
            }

            if (defaults.length > 0 || parameters.length > 1) {
              for (const parameter of parameters) {
                defaults.push({type: 'SpreadElement', argument: parameter})
              }
            }

            // If we’re getting components from several sources, merge them.
            /** @type {Expression} */
            let componentsInit =
              defaults.length > 0
                ? {type: 'ObjectExpression', properties: defaults}
                : // If we’re only getting components from `props.components`,
                  // make sure it’s defined.
                  {
                    type: 'LogicalExpression',
                    operator: '||',
                    left: parameters[0],
                    right: {type: 'ObjectExpression', properties: []}
                  }

            /** @type {ObjectPattern | undefined} */
            let componentsPattern

            // Add components to scope.
            // For `['MyComponent', 'MDXLayout']` this generates:
            // ```tsx
            // const {MyComponent, wrapper: MDXLayout} = _components
            // ```
            // Note that MDXLayout is special as it’s taken from
            // `_components.wrapper`.
            if (actual.length > 0) {
              componentsPattern = {
                type: 'ObjectPattern',
                properties: actual.map(function (name) {
                  return {
                    type: 'Property',
                    kind: 'init',
                    key: {
                      type: 'Identifier',
                      name: name === 'MDXLayout' ? 'wrapper' : name
                    },
                    value: {type: 'Identifier', name},
                    method: false,
                    shorthand: name !== 'MDXLayout',
                    computed: false
                  }
                })
              }
            }

            if (functionInfo.tags.length > 0) {
              declarations.push({
                type: 'VariableDeclarator',
                id: {type: 'Identifier', name: '_components'},
                init: componentsInit
              })
              componentsInit = {type: 'Identifier', name: '_components'}
            }

            if (isNamedFunction(functionInfo.node, '_createMdxContent')) {
              for (const [id, componentName] of [
                ...functionInfo.idToInvalidComponentName
              ].sort(function ([a], [b]) {
                return a.localeCompare(b)
              })) {
                // For JSX IDs that can’t be represented as JavaScript IDs (as in,
                // those with dashes, such as `custom-element`), generate a
                // separate variable that is a valid JS ID (such as `_component0`),
                // and takes it from components:
                // `const _component0 = _components['custom-element']`
                declarations.push({
                  type: 'VariableDeclarator',
                  id: {
                    type: 'Identifier',
                    name: componentName
                  },
                  init: {
                    type: 'MemberExpression',
                    object: {type: 'Identifier', name: '_components'},
                    property: {type: 'Literal', value: id},
                    computed: true,
                    optional: false
                  }
                })
              }
            }

            if (componentsPattern) {
              declarations.push({
                type: 'VariableDeclarator',
                id: componentsPattern,
                init: componentsInit
              })
            }

            if (declarations.length > 0) {
              statements.push({
                type: 'VariableDeclaration',
                kind: 'const',
                declarations
              })
            }
          }

          /** @type {string} */
          let key

          // Add partials (so for `x.y.z` it’d generate `x` and `x.y` too).
          for (key in functionInfo.references) {
            if (Object.hasOwn(functionInfo.references, key)) {
              const parts = key.split('.')
              let index = 0
              while (++index < parts.length) {
                const partial = parts.slice(0, index).join('.')
                if (!Object.hasOwn(functionInfo.references, partial)) {
                  functionInfo.references[partial] = {
                    component: false,
                    node: functionInfo.references[key].node
                  }
                }
              }
            }
          }

          const references = Object.keys(functionInfo.references).sort()

          let index = -1
          while (++index < references.length) {
            const id = references[index]
            const info = functionInfo.references[id]
            const place = stringifyPosition(positionFromEstree(info.node))
            /** @type {Array<Expression>} */
            const parameters = [
              {type: 'Literal', value: id},
              {type: 'Literal', value: info.component}
            ]

            createErrorHelper = true

            if (development && place) {
              parameters.push({type: 'Literal', value: place})
            }

            statements.push({
              type: 'IfStatement',
              test: {
                type: 'UnaryExpression',
                operator: '!',
                prefix: true,
                argument: toIdOrMemberExpression(id.split('.'))
              },
              consequent: {
                type: 'ExpressionStatement',
                expression: {
                  type: 'CallExpression',
                  callee: {type: 'Identifier', name: '_missingMdxReference'},
                  arguments: parameters,
                  optional: false
                }
              },
              alternate: undefined
            })
          }

          if (statements.length > 0) {
            // Arrow functions with an implied return:
            if (node.body.type !== 'BlockStatement') {
              node.body = {
                type: 'BlockStatement',
                body: [{type: 'ReturnStatement', argument: node.body}]
              }
            }

            node.body.body.unshift(...statements)
          }

          functionStack.pop()
        }
      }
    })

    // If a provider is used (and can be used), import it.
    if (importProvider && providerImportSource) {
      tree.body.unshift(
        createImportProvider(providerImportSource, outputFormat)
      )
    }

    // If potentially missing components are used.
    if (createErrorHelper) {
      /** @type {Array<Expression>} */
      const message = [
        {type: 'Literal', value: 'Expected '},
        {
          type: 'ConditionalExpression',
          test: {type: 'Identifier', name: 'component'},
          consequent: {type: 'Literal', value: 'component'},
          alternate: {type: 'Literal', value: 'object'}
        },
        {type: 'Literal', value: ' `'},
        {type: 'Identifier', name: 'id'},
        {
          type: 'Literal',
          value:
            '` to be defined: you likely forgot to import, pass, or provide it.'
        }
      ]

      /** @type {Array<Identifier>} */
      const parameters = [
        {type: 'Identifier', name: 'id'},
        {type: 'Identifier', name: 'component'}
      ]

      if (development) {
        message.push({
          type: 'ConditionalExpression',
          test: {type: 'Identifier', name: 'place'},
          consequent: toBinaryAddition([
            {type: 'Literal', value: '\nIt’s referenced in your code at `'},
            {type: 'Identifier', name: 'place'},
            {
              type: 'Literal',
              value: (file.path ? '` in `' + file.path : '') + '`'
            }
          ]),
          alternate: {type: 'Literal', value: ''}
        })

        parameters.push({type: 'Identifier', name: 'place'})
      }

      tree.body.push({
        type: 'FunctionDeclaration',
        id: {type: 'Identifier', name: '_missingMdxReference'},
        generator: false,
        async: false,
        params: parameters,
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ThrowStatement',
              argument: {
                type: 'NewExpression',
                callee: {type: 'Identifier', name: 'Error'},
                arguments: [toBinaryAddition(message)]
              }
            }
          ]
        }
      })
    }

    if (outputFormat === 'function-body') {
      tree.body.unshift({
        type: 'ExpressionStatement',
        expression: {type: 'Literal', value: 'use strict'},
        directive: 'use strict'
      })
    }
  }
}

/**
 * @param {string} providerImportSource
 *   Provider source.
 * @param {'function-body' | 'program' | null | undefined} outputFormat
 *   Format.
 * @returns {ModuleDeclaration | Statement}
 *   Node.
 */
function createImportProvider(providerImportSource, outputFormat) {
  /** @type {Array<ImportSpecifier>} */
  const specifiers = [
    {
      type: 'ImportSpecifier',
      imported: {type: 'Identifier', name: 'useMDXComponents'},
      local: {type: 'Identifier', name: '_provideComponents'}
    }
  ]

  return outputFormat === 'function-body'
    ? {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: specifiersToDeclarations(
          specifiers,
          toIdOrMemberExpression(['arguments', 0])
        )
      }
    : {
        type: 'ImportDeclaration',
        specifiers,
        attributes: [],
        source: {type: 'Literal', value: providerImportSource}
      }
}

/**
 * @param {Readonly<EstreeFunction>} node
 *   Node.
 * @param {string} name
 *   Name.
 * @returns {boolean}
 *   Whether `node` is a named function with `name`.
 */
function isNamedFunction(node, name) {
  return Boolean(node && 'id' in node && node.id && node.id.name === name)
}

/**
 * @param {Array<Scope>} scopes
 *   Scope.
 * @param {string} id
 *   Identifier.
 * @returns {boolean}
 *   Whether `id` is in `scope`.
 */
function inScope(scopes, id) {
  let index = scopes.length

  while (index--) {
    const scope = scopes[index]

    if (scope.defined.includes(id)) {
      return true
    }
  }

  return false
}
