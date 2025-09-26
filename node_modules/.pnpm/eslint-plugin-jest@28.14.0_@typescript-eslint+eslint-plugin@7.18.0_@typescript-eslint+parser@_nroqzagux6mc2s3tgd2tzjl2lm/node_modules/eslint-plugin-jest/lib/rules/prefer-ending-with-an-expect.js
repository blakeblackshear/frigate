"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("@typescript-eslint/utils");
var _utils2 = require("./utils");
/*
 * This implementation is adapted from eslint-plugin-jasmine.
 * MIT license, Remco Haszing.
 */

/**
 * Checks if node names returned by getNodeName matches any of the given star patterns
 * Pattern examples:
 *   request.*.expect
 *   request.**.expect
 *   request.**.expect*
 */
function matchesAssertFunctionName(nodeName, patterns) {
  return patterns.some(p => new RegExp(`^${p.split('.').map(x => {
    if (x === '**') {
      return '[a-z\\d\\.]*';
    }
    return x.replace(/\*/gu, '[a-z\\d]*');
  }).join('\\.')}(\\.|$)`, 'ui').test(nodeName));
}
function getLastStatement(fn) {
  if (fn.body.type === _utils.AST_NODE_TYPES.BlockStatement) {
    if (fn.body.body.length === 0) {
      return null;
    }
    const lastStatement = fn.body.body[fn.body.body.length - 1];
    if (lastStatement.type === _utils.AST_NODE_TYPES.ExpressionStatement) {
      return lastStatement.expression;
    }
    return lastStatement;
  }
  return fn.body;
}
var _default = exports.default = (0, _utils2.createRule)({
  name: __filename,
  meta: {
    docs: {
      description: 'Prefer having the last statement in a test be an assertion'
    },
    messages: {
      mustEndWithExpect: 'Tests should end with an assertion'
    },
    schema: [{
      type: 'object',
      properties: {
        assertFunctionNames: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        additionalTestBlockFunctions: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      },
      additionalProperties: false
    }],
    type: 'suggestion'
  },
  defaultOptions: [{
    assertFunctionNames: ['expect'],
    additionalTestBlockFunctions: []
  }],
  create(context, [{
    assertFunctionNames = ['expect'],
    additionalTestBlockFunctions = []
  }]) {
    return {
      CallExpression(node) {
        const name = (0, _utils2.getNodeName)(node.callee) ?? '';
        if (!(0, _utils2.isTypeOfJestFnCall)(node, context, ['test']) && !additionalTestBlockFunctions.includes(name)) {
          return;
        }
        if (node.arguments.length < 2 || !(0, _utils2.isFunction)(node.arguments[1])) {
          return;
        }
        let lastStatement = getLastStatement(node.arguments[1]);
        if (lastStatement?.type === _utils.AST_NODE_TYPES.AwaitExpression) {
          lastStatement = lastStatement.argument;
        }
        if (lastStatement?.type === _utils.AST_NODE_TYPES.CallExpression && ((0, _utils2.isTypeOfJestFnCall)(lastStatement, context, ['expect']) || matchesAssertFunctionName((0, _utils2.getNodeName)(lastStatement.callee), assertFunctionNames))) {
          return;
        }
        context.report({
          messageId: 'mustEndWithExpect',
          node: node.callee
        });
      }
    };
  }
});