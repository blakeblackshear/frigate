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
      description: 'Disallow duplicate setup and teardown hooks'
    },
    messages: {
      noDuplicateHook: 'Duplicate {{hook}} in describe block'
    },
    schema: [],
    type: 'suggestion'
  },
  defaultOptions: [],
  create(context) {
    const hookContexts = [{}];
    return {
      CallExpression(node) {
        const jestFnCall = (0, _utils.parseJestFnCall)(node, context);
        if (jestFnCall?.type === 'describe') {
          hookContexts.push({});
        }
        if (jestFnCall?.type !== 'hook') {
          return;
        }
        const currentLayer = hookContexts[hookContexts.length - 1];
        currentLayer[jestFnCall.name] ||= 0;
        currentLayer[jestFnCall.name] += 1;
        if (currentLayer[jestFnCall.name] > 1) {
          context.report({
            messageId: 'noDuplicateHook',
            data: {
              hook: jestFnCall.name
            },
            node
          });
        }
      },
      'CallExpression:exit'(node) {
        if ((0, _utils.isTypeOfJestFnCall)(node, context, ['describe'])) {
          hookContexts.pop();
        }
      }
    };
  }
});