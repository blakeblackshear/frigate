"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("@typescript-eslint/utils");
var _utils2 = require("./utils");
const toThrowMatchers = ['toThrow', 'toThrowError', 'toThrowErrorMatchingSnapshot', 'toThrowErrorMatchingInlineSnapshot'];
const baseRule = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TSESLintPlugin = require('@typescript-eslint/eslint-plugin');
    return TSESLintPlugin.rules['unbound-method'];
  } catch (e) {
    const error = e;
    if (error.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw error;
  }
})();
const DEFAULT_MESSAGE = 'This rule requires `@typescript-eslint/eslint-plugin`';

// todo: remove these along with the actual runtime properties below in new major
var _default = exports.default = (0, _utils2.createRule)({
  defaultOptions: [{
    ignoreStatic: false
  }],
  ...baseRule,
  name: __filename,
  meta: {
    messages: {
      unbound: DEFAULT_MESSAGE,
      unboundWithoutThisAnnotation: DEFAULT_MESSAGE
    },
    schema: [],
    type: 'problem',
    ...baseRule?.meta,
    docs: {
      description: 'Enforce unbound methods are called with their expected scope',
      /** @deprecated */
      requiresTypeChecking: true,
      ...baseRule?.meta.docs,
      // mark this as not recommended
      /** @deprecated */
      recommended: undefined
    }
  },
  create(context) {
    const baseSelectors = baseRule?.create(context);
    if (!baseSelectors) {
      return {};
    }
    return {
      ...baseSelectors,
      MemberExpression(node) {
        if (node.parent?.type === _utils.AST_NODE_TYPES.CallExpression) {
          const jestFnCall = (0, _utils2.parseJestFnCall)((0, _utils2.findTopMostCallExpression)(node.parent), context);
          if (jestFnCall?.type === 'jest' && jestFnCall.members.length >= 1 && (0, _utils2.isIdentifier)(jestFnCall.members[0], 'mocked')) {
            return;
          }
          if (jestFnCall?.type === 'expect') {
            const {
              matcher
            } = jestFnCall;
            if (!toThrowMatchers.includes((0, _utils2.getAccessorValue)(matcher))) {
              return;
            }
          }
        }
        baseSelectors.MemberExpression?.(node);
      }
    };
  }
});