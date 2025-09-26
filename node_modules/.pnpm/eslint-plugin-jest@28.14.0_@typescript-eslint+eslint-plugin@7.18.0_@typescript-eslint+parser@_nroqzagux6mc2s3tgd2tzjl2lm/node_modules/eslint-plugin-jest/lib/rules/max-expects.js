"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("@typescript-eslint/utils");
var _utils2 = require("./utils");
var _default = exports.default = (0, _utils2.createRule)({
  name: __filename,
  meta: {
    docs: {
      description: 'Enforces a maximum number assertion calls in a test body'
    },
    messages: {
      exceededMaxAssertion: 'Too many assertion calls ({{ count }}) - maximum allowed is {{ max }}'
    },
    type: 'suggestion',
    schema: [{
      type: 'object',
      properties: {
        max: {
          type: 'integer',
          minimum: 1
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    max: 5
  }],
  create(context, [{
    max
  }]) {
    let count = 0;
    const maybeResetCount = node => {
      const isTestFn = node.parent?.type !== _utils.AST_NODE_TYPES.CallExpression || (0, _utils2.isTypeOfJestFnCall)(node.parent, context, ['test']);
      if (isTestFn) {
        count = 0;
      }
    };
    return {
      FunctionExpression: maybeResetCount,
      'FunctionExpression:exit': maybeResetCount,
      ArrowFunctionExpression: maybeResetCount,
      'ArrowFunctionExpression:exit': maybeResetCount,
      CallExpression(node) {
        const jestFnCall = (0, _utils2.parseJestFnCall)(node, context);
        if (jestFnCall?.type === 'test') {
          count = 0;
        }
        if (jestFnCall?.type !== 'expect' || jestFnCall.head.node.parent?.type === _utils.AST_NODE_TYPES.MemberExpression) {
          return;
        }
        count += 1;
        if (count > max) {
          context.report({
            node,
            messageId: 'exceededMaxAssertion',
            data: {
              count,
              max
            }
          });
        }
      }
    };
  }
});