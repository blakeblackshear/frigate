"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("@typescript-eslint/utils");
var _utils2 = require("./utils");
/*
 * This implementation is ported from from eslint-plugin-jasmine.
 * MIT license, Tom Vincent.
 */

/**
 * Async assertions might be called in Promise
 * methods like `Promise.x(expect1)` or `Promise.x([expect1, expect2])`.
 * If that's the case, Promise node have to be awaited or returned.
 *
 * @Returns CallExpressionNode
 */
const getPromiseCallExpressionNode = node => {
  if (node.type === _utils.AST_NODE_TYPES.ArrayExpression && node.parent && node.parent.type === _utils.AST_NODE_TYPES.CallExpression) {
    node = node.parent;
  }
  if (node.type === _utils.AST_NODE_TYPES.CallExpression && node.callee.type === _utils.AST_NODE_TYPES.MemberExpression && (0, _utils2.isSupportedAccessor)(node.callee.object, 'Promise') && node.parent) {
    return node;
  }
  return null;
};
const findPromiseCallExpressionNode = node => node.parent?.parent && [_utils.AST_NODE_TYPES.CallExpression, _utils.AST_NODE_TYPES.ArrayExpression].includes(node.parent.type) ? getPromiseCallExpressionNode(node.parent) : null;
const findFirstFunctionExpression = ({
  parent
}) => {
  if (!parent) {
    return null;
  }
  return (0, _utils2.isFunction)(parent) ? parent : findFirstFunctionExpression(parent);
};
const getNormalizeFunctionExpression = functionExpression => {
  if (functionExpression.parent.type === _utils.AST_NODE_TYPES.Property && functionExpression.type === _utils.AST_NODE_TYPES.FunctionExpression) {
    return functionExpression.parent;
  }
  return functionExpression;
};
const getParentIfThenified = node => {
  const grandParentNode = node.parent?.parent;
  if (grandParentNode && grandParentNode.type === _utils.AST_NODE_TYPES.CallExpression && grandParentNode.callee.type === _utils.AST_NODE_TYPES.MemberExpression && (0, _utils2.isSupportedAccessor)(grandParentNode.callee.property) && ['then', 'catch'].includes((0, _utils2.getAccessorValue)(grandParentNode.callee.property)) && grandParentNode.parent) {
    // Just in case `then`s are chained look one above.
    return getParentIfThenified(grandParentNode);
  }
  return node;
};
const isAcceptableReturnNode = (node, allowReturn) => {
  if (allowReturn && node.type === _utils.AST_NODE_TYPES.ReturnStatement) {
    return true;
  }
  if (node.type === _utils.AST_NODE_TYPES.ConditionalExpression && node.parent) {
    return isAcceptableReturnNode(node.parent, allowReturn);
  }
  return [_utils.AST_NODE_TYPES.ArrowFunctionExpression, _utils.AST_NODE_TYPES.AwaitExpression].includes(node.type);
};
const promiseArrayExceptionKey = ({
  start,
  end
}) => `${start.line}:${start.column}-${end.line}:${end.column}`;
const defaultAsyncMatchers = ['toReject', 'toResolve'];
var _default = exports.default = (0, _utils2.createRule)({
  name: __filename,
  meta: {
    docs: {
      description: 'Enforce valid `expect()` usage'
    },
    messages: {
      tooManyArgs: 'Expect takes at most {{ amount }} argument{{ s }}',
      notEnoughArgs: 'Expect requires at least {{ amount }} argument{{ s }}',
      modifierUnknown: 'Expect has an unknown modifier',
      matcherNotFound: 'Expect must have a corresponding matcher call',
      matcherNotCalled: 'Matchers must be called to assert',
      asyncMustBeAwaited: 'Async assertions must be awaited{{ orReturned }}',
      promisesWithAsyncAssertionsMustBeAwaited: 'Promises which return async assertions must be awaited{{ orReturned }}'
    },
    fixable: 'code',
    type: 'suggestion',
    schema: [{
      type: 'object',
      properties: {
        alwaysAwait: {
          type: 'boolean',
          default: false
        },
        asyncMatchers: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        minArgs: {
          type: 'number',
          minimum: 0
        },
        maxArgs: {
          type: 'number',
          minimum: 1
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    alwaysAwait: false,
    asyncMatchers: defaultAsyncMatchers,
    minArgs: 1,
    maxArgs: 1
  }],
  create(context, [{
    alwaysAwait,
    asyncMatchers = defaultAsyncMatchers,
    minArgs = 1,
    maxArgs = 1
  }]) {
    // Context state
    const arrayExceptions = new Set();
    const descriptors = [];
    const pushPromiseArrayException = loc => arrayExceptions.add(promiseArrayExceptionKey(loc));

    /**
     * Promise method that accepts an array of promises,
     * (eg. Promise.all), will throw warnings for the each
     * unawaited or non-returned promise. To avoid throwing
     * multiple warnings, we check if there is a warning in
     * the given location.
     */
    const promiseArrayExceptionExists = loc => arrayExceptions.has(promiseArrayExceptionKey(loc));
    const findTopMostMemberExpression = node => {
      let topMostMemberExpression = node;
      let {
        parent
      } = node;
      while (parent) {
        if (parent.type !== _utils.AST_NODE_TYPES.MemberExpression) {
          break;
        }
        topMostMemberExpression = parent;
        parent = parent.parent;
      }
      return topMostMemberExpression;
    };
    return {
      CallExpression(node) {
        const jestFnCall = (0, _utils2.parseJestFnCallWithReason)(node, context);
        if (typeof jestFnCall === 'string') {
          const reportingNode = node.parent?.type === _utils.AST_NODE_TYPES.MemberExpression ? findTopMostMemberExpression(node.parent).property : node;
          if (jestFnCall === 'matcher-not-found') {
            context.report({
              messageId: 'matcherNotFound',
              node: reportingNode
            });
            return;
          }
          if (jestFnCall === 'matcher-not-called') {
            context.report({
              messageId: (0, _utils2.isSupportedAccessor)(reportingNode) && _utils2.ModifierName.hasOwnProperty((0, _utils2.getAccessorValue)(reportingNode)) ? 'matcherNotFound' : 'matcherNotCalled',
              node: reportingNode
            });
          }
          if (jestFnCall === 'modifier-unknown') {
            context.report({
              messageId: 'modifierUnknown',
              node: reportingNode
            });
            return;
          }
          return;
        } else if (jestFnCall?.type !== 'expect') {
          return;
        }
        const {
          parent: expect
        } = jestFnCall.head.node;
        if (expect?.type !== _utils.AST_NODE_TYPES.CallExpression) {
          return;
        }
        if (expect.arguments.length < minArgs) {
          const expectLength = (0, _utils2.getAccessorValue)(jestFnCall.head.node).length;
          const loc = {
            start: {
              column: expect.loc.start.column + expectLength,
              line: expect.loc.start.line
            },
            end: {
              column: expect.loc.start.column + expectLength + 1,
              line: expect.loc.start.line
            }
          };
          context.report({
            messageId: 'notEnoughArgs',
            data: {
              amount: minArgs,
              s: minArgs === 1 ? '' : 's'
            },
            node: expect,
            loc
          });
        }
        if (expect.arguments.length > maxArgs) {
          const {
            start
          } = expect.arguments[maxArgs].loc;
          const {
            end
          } = expect.arguments[expect.arguments.length - 1].loc;
          const loc = {
            start,
            end: {
              column: end.column - 1,
              line: end.line
            }
          };
          context.report({
            messageId: 'tooManyArgs',
            data: {
              amount: maxArgs,
              s: maxArgs === 1 ? '' : 's'
            },
            node: expect,
            loc
          });
        }
        const {
          matcher
        } = jestFnCall;
        const parentNode = matcher.parent.parent;
        const shouldBeAwaited = jestFnCall.modifiers.some(nod => (0, _utils2.getAccessorValue)(nod) !== 'not') || asyncMatchers.includes((0, _utils2.getAccessorValue)(matcher));
        if (!parentNode.parent || !shouldBeAwaited) {
          return;
        }
        /**
         * If parent node is an array expression, we'll report the warning,
         * for the array object, not for each individual assertion.
         */
        const isParentArrayExpression = parentNode.parent.type === _utils.AST_NODE_TYPES.ArrayExpression;
        /**
         * An async assertion can be chained with `then` or `catch` statements.
         * In that case our target CallExpression node is the one with
         * the last `then` or `catch` statement.
         */
        const targetNode = getParentIfThenified(parentNode);
        const finalNode = findPromiseCallExpressionNode(targetNode) || targetNode;
        if (finalNode.parent &&
        // If node is not awaited or returned
        !isAcceptableReturnNode(finalNode.parent, !alwaysAwait) &&
        // if we didn't warn user already
        !promiseArrayExceptionExists(finalNode.loc)) {
          descriptors.push({
            node: finalNode,
            messageId: targetNode === finalNode ? 'asyncMustBeAwaited' : 'promisesWithAsyncAssertionsMustBeAwaited'
          });
        }
        if (isParentArrayExpression) {
          pushPromiseArrayException(finalNode.loc);
        }
      },
      'Program:exit'() {
        const fixes = [];
        descriptors.forEach(({
          node,
          messageId
        }, index) => {
          const orReturned = alwaysAwait ? '' : ' or returned';
          context.report({
            loc: node.loc,
            data: {
              orReturned
            },
            messageId,
            node,
            fix(fixer) {
              const functionExpression = findFirstFunctionExpression(node);
              if (!functionExpression) {
                return null;
              }
              const foundAsyncFixer = fixes.some(fix => fix.text === 'async ');
              if (!functionExpression.async && !foundAsyncFixer) {
                const targetFunction = getNormalizeFunctionExpression(functionExpression);
                fixes.push(fixer.insertTextBefore(targetFunction, 'async '));
              }
              const returnStatement = node.parent?.type === _utils.AST_NODE_TYPES.ReturnStatement ? node.parent : null;
              if (alwaysAwait && returnStatement) {
                const sourceCodeText = (0, _utils2.getSourceCode)(context).getText(returnStatement);
                const replacedText = sourceCodeText.replace('return', 'await');
                fixes.push(fixer.replaceText(returnStatement, replacedText));
              } else {
                fixes.push(fixer.insertTextBefore(node, 'await '));
              }
              return index === descriptors.length - 1 ? fixes : null;
            }
          });
        });
      }
    };
  }
});