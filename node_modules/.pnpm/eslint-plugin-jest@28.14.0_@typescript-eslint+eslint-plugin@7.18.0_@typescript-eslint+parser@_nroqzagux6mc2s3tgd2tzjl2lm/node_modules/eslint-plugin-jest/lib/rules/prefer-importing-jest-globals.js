"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("@typescript-eslint/utils");
var _utils2 = require("./utils");
const createFixerImports = (isModule, functionsToImport) => {
  const allImportsFormatted = Array.from(functionsToImport).sort().join(', ');
  return isModule ? `import { ${allImportsFormatted} } from '@jest/globals';` : `const { ${allImportsFormatted} } = require('@jest/globals');`;
};
const allJestFnTypes = ['hook', 'describe', 'test', 'expect', 'jest', 'unknown'];
var _default = exports.default = (0, _utils2.createRule)({
  name: __filename,
  meta: {
    docs: {
      description: 'Prefer importing Jest globals'
    },
    messages: {
      preferImportingJestGlobal: `Import the following Jest functions from '@jest/globals': {{ jestFunctions }}`
    },
    fixable: 'code',
    type: 'problem',
    schema: [{
      type: 'object',
      properties: {
        types: {
          type: 'array',
          items: {
            type: 'string',
            enum: allJestFnTypes
          }
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    types: allJestFnTypes
  }],
  create(context) {
    const {
      types = allJestFnTypes
    } = context.options[0] || {};
    const functionsToImport = new Set();
    let reportingNode;
    return {
      CallExpression(node) {
        const jestFnCall = (0, _utils2.parseJestFnCall)(node, context);
        if (!jestFnCall) {
          return;
        }
        if (jestFnCall.head.type !== 'import' && types.includes(jestFnCall.type)) {
          functionsToImport.add(jestFnCall.name);
          reportingNode ||= jestFnCall.head.node;
        }
      },
      'Program:exit'() {
        // this means we found at least one function to import
        if (!reportingNode) {
          return;
        }
        const isModule = context.parserOptions.sourceType === 'module' || context.languageOptions?.sourceType === 'module';
        context.report({
          node: reportingNode,
          messageId: 'preferImportingJestGlobal',
          data: {
            jestFunctions: Array.from(functionsToImport).join(', ')
          },
          fix(fixer) {
            const sourceCode = (0, _utils2.getSourceCode)(context);
            const [firstNode] = sourceCode.ast.body;

            // check if "use strict" directive exists
            if (firstNode.type === _utils.AST_NODE_TYPES.ExpressionStatement && (0, _utils2.isStringNode)(firstNode.expression, 'use strict')) {
              return fixer.insertTextAfter(firstNode, `\n${createFixerImports(isModule, functionsToImport)}`);
            }
            const importNode = sourceCode.ast.body.find(node => node.type === _utils.AST_NODE_TYPES.ImportDeclaration && node.source.value === '@jest/globals');
            if (importNode?.type === _utils.AST_NODE_TYPES.ImportDeclaration) {
              for (const specifier of importNode.specifiers) {
                if (specifier.type === _utils.AST_NODE_TYPES.ImportSpecifier) {
                  let importName = 'name' in specifier.imported ? specifier.imported.name : '';
                  const local = (0, _utils2.getAccessorValue)(specifier.local);
                  if (local !== importName) {
                    importName = `${importName} as ${local}`;
                  }
                  if ('value' in specifier.imported) {
                    importName = `'${specifier.imported.value}'${importName}`;
                  }
                  functionsToImport.add(importName);
                }
                if (specifier.type === _utils.AST_NODE_TYPES.ImportDefaultSpecifier) {
                  functionsToImport.add(specifier.local.name);
                }
              }
              return fixer.replaceText(importNode, createFixerImports(isModule, functionsToImport));
            }
            const requireNode = sourceCode.ast.body.find(node => node.type === _utils.AST_NODE_TYPES.VariableDeclaration && node.declarations.some(declaration => declaration.init?.type === _utils.AST_NODE_TYPES.CallExpression && (0, _utils2.isIdentifier)(declaration.init.callee, 'require') && (0, _utils2.isStringNode)(declaration.init.arguments[0], '@jest/globals') && (declaration.id.type === _utils.AST_NODE_TYPES.Identifier || declaration.id.type === _utils.AST_NODE_TYPES.ObjectPattern)));
            if (requireNode?.type !== _utils.AST_NODE_TYPES.VariableDeclaration) {
              return fixer.insertTextBefore(firstNode, `${createFixerImports(isModule, functionsToImport)}\n`);
            }
            if (requireNode.declarations[0]?.id.type === _utils.AST_NODE_TYPES.ObjectPattern) {
              for (const property of requireNode.declarations[0].id.properties) {
                if (property.type !== _utils.AST_NODE_TYPES.Property || !(0, _utils2.isSupportedAccessor)(property.key)) {
                  continue;
                }
                let importName = (0, _utils2.getAccessorValue)(property.key);
                if ((0, _utils2.isSupportedAccessor)(property.value)) {
                  const local = (0, _utils2.getAccessorValue)(property.value);
                  if (importName !== local) {
                    importName += `: ${local}`;
                  }
                }
                functionsToImport.add(importName);
              }
            }
            return fixer.replaceText(requireNode, `${createFixerImports(isModule, functionsToImport)}`);
          }
        });
      }
    };
  }
});