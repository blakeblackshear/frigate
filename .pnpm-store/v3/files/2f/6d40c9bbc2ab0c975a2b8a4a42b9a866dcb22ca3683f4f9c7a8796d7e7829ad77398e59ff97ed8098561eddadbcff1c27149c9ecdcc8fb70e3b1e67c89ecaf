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
      description: 'Disallow setup and teardown hooks'
    },
    messages: {
      unexpectedHook: "Unexpected '{{ hookName }}' hook"
    },
    schema: [{
      type: 'object',
      properties: {
        allow: {
          type: 'array',
          // @ts-expect-error https://github.com/eslint/eslint/discussions/17573
          contains: ['beforeAll', 'beforeEach', 'afterAll', 'afterEach']
        }
      },
      additionalProperties: false
    }],
    type: 'suggestion'
  },
  defaultOptions: [{
    allow: []
  }],
  create(context, [{
    allow = []
  }]) {
    return {
      CallExpression(node) {
        const jestFnCall = (0, _utils.parseJestFnCall)(node, context);
        if (jestFnCall?.type === 'hook' && !allow.includes(jestFnCall.name)) {
          context.report({
            node,
            messageId: 'unexpectedHook',
            data: {
              hookName: jestFnCall.name
            }
          });
        }
      }
    };
  }
});