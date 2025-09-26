"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("./utils");
function hasTests(node) {
  return /^\s*[xf]?(test|it|describe)(\.\w+|\[['"]\w+['"]\])?\s*\(/mu.test(node.value);
}
var _default = exports.default = (0, _utils.createRule)({
  name: __filename,
  meta: {
    docs: {
      description: 'Disallow commented out tests'
    },
    messages: {
      commentedTests: 'Do not comment out tests'
    },
    schema: [],
    type: 'suggestion'
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = (0, _utils.getSourceCode)(context);
    function checkNode(node) {
      if (!hasTests(node)) {
        return;
      }
      context.report({
        messageId: 'commentedTests',
        node
      });
    }
    return {
      Program() {
        const comments = sourceCode.getAllComments();
        comments.forEach(checkNode);
      }
    };
  }
});