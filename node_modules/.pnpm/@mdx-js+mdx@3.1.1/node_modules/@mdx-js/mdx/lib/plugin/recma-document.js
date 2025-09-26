/**
 * @import {
      CallExpression,
      Directive,
      ExportAllDeclaration,
      ExportDefaultDeclaration,
      ExportNamedDeclaration,
      ExportSpecifier,
      Expression,
      FunctionDeclaration,
      Identifier,
      ImportDeclaration,
      ImportDefaultSpecifier,
      ImportExpression,
      ImportSpecifier,
      JSXElement,
      JSXFragment,
      Literal,
      ModuleDeclaration,
      Node,
      Program,
      Property,
      SimpleLiteral,
      SpreadElement,
      Statement,
      VariableDeclarator
 * } from 'estree-jsx'
 * @import {VFile} from 'vfile'
 * @import {ProcessorOptions} from '../core.js'
 */

import {ok as assert} from 'devlop'
import {createVisitors} from 'estree-util-scope'
import {walk} from 'estree-walker'
import {positionFromEstree} from 'unist-util-position-from-estree'
import {stringifyPosition} from 'unist-util-stringify-position'
import {create} from '../util/estree-util-create.js'
import {declarationToExpression} from '../util/estree-util-declaration-to-expression.js'
import {isDeclaration} from '../util/estree-util-is-declaration.js'
import {specifiersToDeclarations} from '../util/estree-util-specifiers-to-declarations.js'
import {toIdOrMemberExpression} from '../util/estree-util-to-id-or-member-expression.js'

/**
 * Wrap the estree in `MDXContent`.
 *
 * @param {Readonly<ProcessorOptions>} options
 *   Configuration.
 * @returns
 *   Transform.
 */
export function recmaDocument(options) {
  const baseUrl = options.baseUrl || undefined
  const baseHref = typeof baseUrl === 'object' ? baseUrl.href : baseUrl
  const outputFormat = options.outputFormat || 'program'
  const pragma =
    options.pragma === undefined ? 'React.createElement' : options.pragma
  const pragmaFrag =
    options.pragmaFrag === undefined ? 'React.Fragment' : options.pragmaFrag
  const pragmaImportSource = options.pragmaImportSource || 'react'
  const jsxImportSource = options.jsxImportSource || 'react'
  const jsxRuntime = options.jsxRuntime || 'automatic'

  /**
   * @param {Program} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree, file) {
    /** @type {Array<[string, string] | string>} */
    const exportedValues = []
    /** @type {Array<Directive | ModuleDeclaration | Statement>} */
    const replacement = []
    let exportAllCount = 0
    /** @type {ExportDefaultDeclaration | ExportSpecifier | undefined} */
    let layout
    /** @type {boolean | undefined} */
    let content
    /** @type {Node} */
    let child

    if (jsxRuntime === 'classic' && pragmaFrag) {
      injectPragma(tree, '@jsxFrag', pragmaFrag)
    }

    if (jsxRuntime === 'classic' && pragma) {
      injectPragma(tree, '@jsx', pragma)
    }

    if (jsxRuntime === 'automatic' && jsxImportSource) {
      injectPragma(tree, '@jsxImportSource', jsxImportSource)
    }

    if (jsxRuntime) {
      injectPragma(tree, '@jsxRuntime', jsxRuntime)
    }

    if (jsxRuntime === 'classic' && pragmaImportSource) {
      if (!pragma) {
        throw new Error(
          'Missing `pragma` in classic runtime with `pragmaImportSource`'
        )
      }

      handleEsm({
        type: 'ImportDeclaration',
        specifiers: [
          {
            type: 'ImportDefaultSpecifier',
            local: {type: 'Identifier', name: pragma.split('.')[0]}
          }
        ],
        attributes: [],
        source: {type: 'Literal', value: pragmaImportSource}
      })
    }

    // Find the `export default`, the JSX expression, and leave the rest
    // (import/exports) as they are.
    for (child of tree.body) {
      // ```tsx
      // export default properties => <>{properties.children}</>
      // ```
      //
      // Treat it as an inline layout declaration.
      if (child.type === 'ExportDefaultDeclaration') {
        if (layout) {
          file.fail(
            'Unexpected duplicate layout, expected a single layout (previous: ' +
              stringifyPosition(positionFromEstree(layout)) +
              ')',
            {
              ancestors: [tree, child],
              place: positionFromEstree(child),
              ruleId: 'duplicate-layout',
              source: 'recma-document'
            }
          )
        }

        layout = child
        replacement.push({
          type: 'VariableDeclaration',
          kind: 'const',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: {type: 'Identifier', name: 'MDXLayout'},
              init: isDeclaration(child.declaration)
                ? declarationToExpression(child.declaration)
                : child.declaration
            }
          ]
        })
      }
      // ```tsx
      // export {a, b as c} from 'd'
      // ```
      else if (child.type === 'ExportNamedDeclaration' && child.source) {
        // Cast because always simple.
        const source = /** @type {SimpleLiteral} */ (child.source)

        // Remove `default` or `as default`, but not `default as`, specifier.
        child.specifiers = child.specifiers.filter(function (specifier) {
          if (
            specifier.exported.type === 'Identifier' &&
            specifier.exported.name === 'default'
          ) {
            if (layout) {
              file.fail(
                'Unexpected duplicate layout, expected a single layout (previous: ' +
                  stringifyPosition(positionFromEstree(layout)) +
                  ')',
                {
                  ancestors: [tree, child, specifier],
                  place: positionFromEstree(child),
                  ruleId: 'duplicate-layout',
                  source: 'recma-document'
                }
              )
            }

            layout = specifier

            // Make it just an import: `import MDXLayout from '…'`.
            /** @type {Array<ImportDefaultSpecifier | ImportSpecifier>} */
            const specifiers = []

            // Default as default / something else as default.
            if (
              specifier.local.type === 'Identifier' &&
              specifier.local.name === 'default'
            ) {
              specifiers.push({
                type: 'ImportDefaultSpecifier',
                local: {type: 'Identifier', name: 'MDXLayout'}
              })
            } else {
              /** @type {ImportSpecifier} */
              const importSpecifier = {
                type: 'ImportSpecifier',
                imported: specifier.local,
                local: {type: 'Identifier', name: 'MDXLayout'}
              }
              create(specifier.local, importSpecifier)
              specifiers.push(importSpecifier)
            }

            /** @type {Literal} */
            const from = {type: 'Literal', value: source.value}
            create(source, from)

            /** @type {ImportDeclaration} */
            const declaration = {
              type: 'ImportDeclaration',
              specifiers,
              attributes: [],
              source: from
            }
            create(specifier, declaration)
            handleEsm(declaration)

            return false
          }

          return true
        })

        // If there are other things imported, keep it.
        if (child.specifiers.length > 0) {
          handleExport(child)
        }
      }
      // ```tsx
      // export {a, b as c}
      // export * from 'a'
      // ```
      else if (
        child.type === 'ExportNamedDeclaration' ||
        child.type === 'ExportAllDeclaration'
      ) {
        handleExport(child)
      } else if (child.type === 'ImportDeclaration') {
        handleEsm(child)
      } else if (
        child.type === 'ExpressionStatement' &&
        (child.expression.type === 'JSXElement' ||
          child.expression.type === 'JSXFragment')
      ) {
        content = true
        replacement.push(
          ...createMdxContent(child.expression, outputFormat, Boolean(layout))
        )
      } else {
        // This catch-all branch is because plugins might add other things.
        // Normally, we only have import/export/jsx, but just add whatever’s
        // there.
        replacement.push(child)
      }
    }

    // If there was no JSX content at all, add an empty function.
    if (!content) {
      replacement.push(
        ...createMdxContent(undefined, outputFormat, Boolean(layout))
      )
    }

    exportedValues.push(['MDXContent', 'default'])

    if (outputFormat === 'function-body') {
      replacement.push({
        type: 'ReturnStatement',
        argument: {
          type: 'ObjectExpression',
          properties: [
            ...Array.from({length: exportAllCount}).map(
              /**
               * @param {undefined} _
               *   Nothing.
               * @param {number} index
               *   Index.
               * @returns {SpreadElement}
               *   Node.
               */
              function (_, index) {
                return {
                  type: 'SpreadElement',
                  argument: {
                    type: 'Identifier',
                    name: '_exportAll' + (index + 1)
                  }
                }
              }
            ),
            ...exportedValues.map(function (d) {
              /** @type {Property} */
              const property = {
                type: 'Property',
                kind: 'init',
                method: false,
                computed: false,
                shorthand: typeof d === 'string',
                key: {
                  type: 'Identifier',
                  name: typeof d === 'string' ? d : d[1]
                },
                value: {
                  type: 'Identifier',
                  name: typeof d === 'string' ? d : d[0]
                }
              }

              return property
            })
          ]
        }
      })
    }

    tree.body = replacement

    let usesImportMetaUrlVariable = false
    let usesResolveDynamicHelper = false

    if (baseHref || outputFormat === 'function-body') {
      walk(tree, {
        enter(node) {
          if (
            (node.type === 'ExportAllDeclaration' ||
              node.type === 'ExportNamedDeclaration' ||
              node.type === 'ImportDeclaration') &&
            node.source
          ) {
            // We never hit this branch when generating function bodies, as
            // statements are already compiled away into import expressions.
            assert(baseHref, 'unexpected missing `baseHref` in branch')

            let value = node.source.value
            // The literal source for statements can only be string.
            assert(typeof value === 'string', 'expected string source')

            // Resolve a specifier.
            // This is the same as `_resolveDynamicMdxSpecifier`, which has to
            // be injected to work with expressions at runtime, but as we have
            // `baseHref` at compile time here and statements are static
            // strings, we can do it now.
            try {
              // To do: next major: use `URL.canParse`.
              // eslint-disable-next-line no-new
              new URL(value)
              // Fine: a full URL.
            } catch {
              if (
                value.startsWith('/') ||
                value.startsWith('./') ||
                value.startsWith('../')
              ) {
                value = new URL(value, baseHref).href
              } else {
                // Fine: are bare specifier.
              }
            }

            /** @type {SimpleLiteral} */
            const replacement = {type: 'Literal', value}
            create(node.source, replacement)
            node.source = replacement
            return
          }

          if (node.type === 'ImportExpression') {
            usesResolveDynamicHelper = true
            /** @type {CallExpression} */
            const replacement = {
              type: 'CallExpression',
              callee: {type: 'Identifier', name: '_resolveDynamicMdxSpecifier'},
              arguments: [node.source],
              optional: false
            }
            node.source = replacement
            return
          }

          // To do: add support for `import.meta.resolve`.

          if (
            node.type === 'MemberExpression' &&
            'object' in node &&
            node.object.type === 'MetaProperty' &&
            node.property.type === 'Identifier' &&
            node.object.meta.name === 'import' &&
            node.object.property.name === 'meta' &&
            node.property.name === 'url'
          ) {
            usesImportMetaUrlVariable = true
            /** @type {Identifier} */
            const replacement = {type: 'Identifier', name: '_importMetaUrl'}
            create(node, replacement)
            this.replace(replacement)
          }
        }
      })
    }

    if (usesResolveDynamicHelper) {
      if (!baseHref) {
        usesImportMetaUrlVariable = true
      }

      tree.body.push(
        resolveDynamicMdxSpecifier(
          baseHref
            ? {type: 'Literal', value: baseHref}
            : {type: 'Identifier', name: '_importMetaUrl'}
        )
      )
    }

    if (usesImportMetaUrlVariable) {
      assert(
        outputFormat === 'function-body',
        'expected `function-body` when using dynamic url injection'
      )
      tree.body.unshift(...createImportMetaUrlVariable())
    }

    /**
     * @param {ExportAllDeclaration | ExportNamedDeclaration} node
     *   Export node.
     * @returns {undefined}
     *   Nothing.
     */
    function handleExport(node) {
      if (node.type === 'ExportNamedDeclaration') {
        // ```tsx
        // export function a() {}
        // export class A {}
        // export var a = 1
        // ```
        if (node.declaration) {
          const visitors = createVisitors()
          // Walk the top-level scope.
          walk(node, {
            enter(node) {
              visitors.enter(node)

              if (
                node.type === 'ArrowFunctionExpression' ||
                node.type === 'FunctionDeclaration' ||
                node.type === 'FunctionExpression'
              ) {
                this.skip()
                visitors.exit(node)
              }
            },
            leave: visitors.exit
          })
          exportedValues.push(...visitors.scopes[0].defined)
        }

        // ```tsx
        // export {a, b as c}
        // export {a, b as c} from 'd'
        // ```
        for (child of node.specifiers) {
          if (child.exported.type === 'Identifier') {
            exportedValues.push(child.exported.name)
            /* c8 ignore next 5 -- to do: <https://github.com/mdx-js/mdx/issues/2536> */
          } else {
            // Must be string.
            assert(typeof child.exported.value === 'string')
            exportedValues.push(child.exported.value)
          }
        }
      }

      handleEsm(node)
    }

    /**
     * @param {ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration} node
     *   Export or import node.
     * @returns {undefined}
     *   Nothing.
     */
    function handleEsm(node) {
      /** @type {ModuleDeclaration | Statement | undefined} */
      let replace
      /** @type {Expression} */
      let init

      if (outputFormat === 'function-body') {
        if (
          // Always have a source:
          node.type === 'ImportDeclaration' ||
          node.type === 'ExportAllDeclaration' ||
          // Source optional:
          (node.type === 'ExportNamedDeclaration' && node.source)
        ) {
          // We always have a source, but types say they can be missing.
          assert(node.source, 'expected `node.source` to be defined')

          // ```
          // import 'a'
          // //=> await import('a')
          // import a from 'b'
          // //=> const {default: a} = await import('b')
          // export {a, b as c} from 'd'
          // //=> const {a, c: b} = await import('d')
          // export * from 'a'
          // //=> const _exportAll0 = await import('a')
          // ```
          /** @type {ImportExpression} */
          const argument = {type: 'ImportExpression', source: node.source}
          create(node, argument)
          init = {type: 'AwaitExpression', argument}

          if (
            (node.type === 'ImportDeclaration' ||
              node.type === 'ExportNamedDeclaration') &&
            node.specifiers.length === 0
          ) {
            replace = {type: 'ExpressionStatement', expression: init}
          } else {
            replace = {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations:
                node.type === 'ExportAllDeclaration'
                  ? [
                      {
                        type: 'VariableDeclarator',
                        id: {
                          type: 'Identifier',
                          name: '_exportAll' + ++exportAllCount
                        },
                        init
                      }
                    ]
                  : specifiersToDeclarations(node.specifiers, init)
            }
          }
        } else if (node.declaration) {
          replace = node.declaration
        } else {
          /** @type {Array<VariableDeclarator>} */
          const declarators = []

          for (const specifier of node.specifiers) {
            // `id` can only be an identifier,
            // so we ignore literal.
            if (
              specifier.exported.type === 'Identifier' &&
              specifier.local.type === 'Identifier' &&
              specifier.local.name !== specifier.exported.name
            ) {
              declarators.push({
                type: 'VariableDeclarator',
                id: specifier.exported,
                init: specifier.local
              })
            }
          }

          if (declarators.length > 0) {
            replace = {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: declarators
            }
          }
        }
      } else {
        replace = node
      }

      if (replace) {
        replacement.push(replace)
      }
    }
  }

  /**
   * @param {Readonly<Expression> | undefined} content
   *   Content.
   * @param {'function-body' | 'program'} outputFormat
   *   Output format.
   * @param {boolean | undefined} [hasInternalLayout=false]
   *   Whether there’s an internal layout (default: `false`).
   * @returns {Array<ExportDefaultDeclaration | FunctionDeclaration>}
   *   Functions.
   */
  function createMdxContent(content, outputFormat, hasInternalLayout) {
    /** @type {JSXElement} */
    const element = {
      type: 'JSXElement',
      openingElement: {
        type: 'JSXOpeningElement',
        name: {type: 'JSXIdentifier', name: 'MDXLayout'},
        attributes: [
          {
            type: 'JSXSpreadAttribute',
            argument: {type: 'Identifier', name: 'props'}
          }
        ],
        selfClosing: false
      },
      closingElement: {
        type: 'JSXClosingElement',
        name: {type: 'JSXIdentifier', name: 'MDXLayout'}
      },
      children: [
        {
          type: 'JSXElement',
          openingElement: {
            type: 'JSXOpeningElement',
            name: {type: 'JSXIdentifier', name: '_createMdxContent'},
            attributes: [
              {
                type: 'JSXSpreadAttribute',
                argument: {type: 'Identifier', name: 'props'}
              }
            ],
            selfClosing: true
          },
          closingElement: null,
          children: []
        }
      ]
    }

    let result = /** @type {Expression} */ (element)

    if (!hasInternalLayout) {
      result = {
        type: 'ConditionalExpression',
        test: {type: 'Identifier', name: 'MDXLayout'},
        consequent: result,
        alternate: {
          type: 'CallExpression',
          callee: {type: 'Identifier', name: '_createMdxContent'},
          arguments: [{type: 'Identifier', name: 'props'}],
          optional: false
        }
      }
    }

    let argument =
      // Cast because TS otherwise does not think `JSXFragment`s are expressions.
      /** @type {Readonly<Expression> | Readonly<JSXFragment>} */ (
        content || {type: 'Identifier', name: 'undefined'}
      )

    // Unwrap a fragment of a single element.
    if (
      argument.type === 'JSXFragment' &&
      argument.children.length === 1 &&
      argument.children[0].type === 'JSXElement'
    ) {
      argument = argument.children[0]
    }

    let awaitExpression = false

    walk(argument, {
      enter(node) {
        if (
          node.type === 'ArrowFunctionExpression' ||
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression'
        ) {
          return this.skip()
        }

        if (
          node.type === 'AwaitExpression' ||
          /* c8 ignore next 2 -- can only occur in a function (which then can
           * only be async, so skipped it) */
          (node.type === 'ForOfStatement' && node.await)
        ) {
          awaitExpression = true
        }
      }
    })

    /** @type {FunctionDeclaration} */
    const declaration = {
      type: 'FunctionDeclaration',
      id: {type: 'Identifier', name: 'MDXContent'},
      params: [
        {
          type: 'AssignmentPattern',
          left: {type: 'Identifier', name: 'props'},
          right: {type: 'ObjectExpression', properties: []}
        }
      ],
      body: {
        type: 'BlockStatement',
        body: [{type: 'ReturnStatement', argument: result}]
      }
    }

    return [
      {
        type: 'FunctionDeclaration',
        async: awaitExpression,
        id: {type: 'Identifier', name: '_createMdxContent'},
        params: [{type: 'Identifier', name: 'props'}],
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ReturnStatement',
              // Cast because TS doesn’t think `JSXFragment` is an expression.
              // eslint-disable-next-line object-shorthand
              argument: /** @type {Expression} */ (argument)
            }
          ]
        }
      },
      outputFormat === 'program'
        ? {type: 'ExportDefaultDeclaration', declaration}
        : declaration
    ]
  }
}

/**
 * @param {Program} tree
 * @param {string} name
 * @param {string} value
 * @returns {undefined}
 */
function injectPragma(tree, name, value) {
  tree.comments?.unshift({
    type: 'Block',
    value: name + ' ' + value,
    data: {_mdxIsPragmaComment: true}
  })
}

/**
 * @param {Expression} importMetaUrl
 * @returns {FunctionDeclaration}
 */
function resolveDynamicMdxSpecifier(importMetaUrl) {
  return {
    type: 'FunctionDeclaration',
    id: {type: 'Identifier', name: '_resolveDynamicMdxSpecifier'},
    generator: false,
    async: false,
    params: [{type: 'Identifier', name: 'd'}],
    body: {
      type: 'BlockStatement',
      body: [
        {
          type: 'IfStatement',
          test: {
            type: 'BinaryExpression',
            left: {
              type: 'UnaryExpression',
              operator: 'typeof',
              prefix: true,
              argument: {type: 'Identifier', name: 'd'}
            },
            operator: '!==',
            right: {type: 'Literal', value: 'string'}
          },
          consequent: {
            type: 'ReturnStatement',
            argument: {type: 'Identifier', name: 'd'}
          },
          alternate: null
        },
        // To do: use `URL.canParse` when widely supported (see commented
        // out code below).
        {
          type: 'TryStatement',
          block: {
            type: 'BlockStatement',
            body: [
              {
                type: 'ExpressionStatement',
                expression: {
                  type: 'NewExpression',
                  callee: {type: 'Identifier', name: 'URL'},
                  arguments: [{type: 'Identifier', name: 'd'}]
                }
              },
              {
                type: 'ReturnStatement',
                argument: {type: 'Identifier', name: 'd'}
              }
            ]
          },
          handler: {
            type: 'CatchClause',
            param: null,
            body: {type: 'BlockStatement', body: []}
          },
          finalizer: null
        },
        // To do: use `URL.canParse` when widely supported.
        // {
        //   type: 'IfStatement',
        //   test: {
        //     type: 'CallExpression',
        //     callee: toIdOrMemberExpression(['URL', 'canParse']),
        //     arguments: [{type: 'Identifier', name: 'd'}],
        //     optional: false
        //   },
        //   consequent: {
        //     type: 'ReturnStatement',
        //     argument: {type: 'Identifier', name: 'd'}
        //   },
        //   alternate: null
        // },
        {
          type: 'IfStatement',
          test: {
            type: 'LogicalExpression',
            left: {
              type: 'LogicalExpression',
              left: {
                type: 'CallExpression',
                callee: toIdOrMemberExpression(['d', 'startsWith']),
                arguments: [{type: 'Literal', value: '/'}],
                optional: false
              },
              operator: '||',
              right: {
                type: 'CallExpression',
                callee: toIdOrMemberExpression(['d', 'startsWith']),
                arguments: [{type: 'Literal', value: './'}],
                optional: false
              }
            },
            operator: '||',
            right: {
              type: 'CallExpression',
              callee: toIdOrMemberExpression(['d', 'startsWith']),
              arguments: [{type: 'Literal', value: '../'}],
              optional: false
            }
          },
          consequent: {
            type: 'ReturnStatement',
            argument: {
              type: 'MemberExpression',
              object: {
                type: 'NewExpression',
                callee: {type: 'Identifier', name: 'URL'},
                arguments: [{type: 'Identifier', name: 'd'}, importMetaUrl]
              },
              property: {type: 'Identifier', name: 'href'},
              computed: false,
              optional: false
            }
          },
          alternate: null
        },
        {
          type: 'ReturnStatement',
          argument: {type: 'Identifier', name: 'd'}
        }
      ]
    }
  }
}

/**
 * @returns {Array<Statement>}
 */
function createImportMetaUrlVariable() {
  return [
    {
      type: 'VariableDeclaration',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: {type: 'Identifier', name: '_importMetaUrl'},
          init: toIdOrMemberExpression(['arguments', 0, 'baseUrl'])
        }
      ],
      kind: 'const'
    },
    {
      type: 'IfStatement',
      test: {
        type: 'UnaryExpression',
        operator: '!',
        prefix: true,
        argument: {type: 'Identifier', name: '_importMetaUrl'}
      },
      consequent: {
        type: 'ThrowStatement',
        argument: {
          type: 'NewExpression',
          callee: {type: 'Identifier', name: 'Error'},
          arguments: [
            {
              type: 'Literal',
              value:
                'Unexpected missing `options.baseUrl` needed to support `export … from`, `import`, or `import.meta.url` when generating `function-body`'
            }
          ]
        }
      },
      alternate: null
    }
  ]
}
