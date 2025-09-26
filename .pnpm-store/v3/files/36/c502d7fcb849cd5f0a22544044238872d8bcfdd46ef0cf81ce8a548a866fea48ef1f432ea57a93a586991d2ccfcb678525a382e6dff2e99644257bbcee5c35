'use strict';

var core = require('@babel/core');

const removeJSXEmptyExpression = () => ({
  visitor: {
    JSXExpressionContainer(path) {
      if (core.types.isJSXEmptyExpression(path.get("expression"))) {
        path.remove();
      }
    }
  }
});

module.exports = removeJSXEmptyExpression;
//# sourceMappingURL=index.js.map
