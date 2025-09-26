"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("./utils");
var _default = exports.default = (0, _utils.createRule)({
  name: __filename,
  meta: {
    docs: {
      description: 'Require a message for `toThrow()`'
    },
    messages: {
      addErrorMessage: 'Add an error message to {{ matcherName }}()'
    },
    type: 'suggestion',
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const jestFnCall = (0, _utils.parseJestFnCall)(node, context);
        if (jestFnCall?.type !== 'expect') {
          return;
        }
        const {
          matcher
        } = jestFnCall;
        const matcherName = (0, _utils.getAccessorValue)(matcher);
        if (jestFnCall.args.length === 0 && ['toThrow', 'toThrowError'].includes(matcherName) && !jestFnCall.modifiers.some(nod => (0, _utils.getAccessorValue)(nod) === 'not')) {
          // Look for `toThrow` calls with no arguments.
          context.report({
            messageId: 'addErrorMessage',
            data: {
              matcherName
            },
            node: matcher
          });
        }
      }
    };
  }
});