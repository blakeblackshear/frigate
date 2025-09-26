"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("@typescript-eslint/utils");
var _utils2 = require("./utils");
const mockTypes = ['Mock', 'MockedFunction', 'MockedClass', 'MockedObject'];
var _default = exports.default = (0, _utils2.createRule)({
  name: __filename,
  meta: {
    docs: {
      description: 'Prefer `jest.mocked()` over `fn as jest.Mock`'
    },
    messages: {
      useJestMocked: 'Prefer `jest.mocked()`'
    },
    schema: [],
    type: 'suggestion',
    fixable: 'code'
  },
  defaultOptions: [],
  create(context) {
    function check(node) {
      const {
        typeAnnotation
      } = node;
      if (typeAnnotation.type !== _utils.AST_NODE_TYPES.TSTypeReference) {
        return;
      }
      const {
        typeName
      } = typeAnnotation;
      if (typeName.type !== _utils.AST_NODE_TYPES.TSQualifiedName) {
        return;
      }
      const {
        left,
        right
      } = typeName;
      if (left.type !== _utils.AST_NODE_TYPES.Identifier || right.type !== _utils.AST_NODE_TYPES.Identifier || left.name !== 'jest' || !mockTypes.includes(right.name)) {
        return;
      }
      const fnName = (0, _utils2.getSourceCode)(context).text.slice(...(0, _utils2.followTypeAssertionChain)(node.expression).range);
      context.report({
        node,
        messageId: 'useJestMocked',
        fix(fixer) {
          return fixer.replaceText(node, `jest.mocked(${fnName})`);
        }
      });
    }
    return {
      TSAsExpression(node) {
        if (node.parent.type === _utils.AST_NODE_TYPES.TSAsExpression) {
          return;
        }
        check(node);
      },
      TSTypeAssertion(node) {
        check(node);
      }
    };
  }
});