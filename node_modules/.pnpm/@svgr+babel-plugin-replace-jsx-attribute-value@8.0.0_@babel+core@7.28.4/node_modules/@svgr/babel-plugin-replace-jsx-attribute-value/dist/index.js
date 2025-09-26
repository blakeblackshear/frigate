'use strict';

var core = require('@babel/core');

const addJSXAttribute = (api, opts) => {
  const getAttributeValue = (value, literal) => {
    if (typeof value === "string" && literal) {
      return core.types.jsxExpressionContainer(
        core.template.ast(value).expression
      );
    }
    if (typeof value === "string") {
      return core.types.stringLiteral(value);
    }
    if (typeof value === "boolean") {
      return core.types.jsxExpressionContainer(core.types.booleanLiteral(value));
    }
    if (typeof value === "number") {
      return core.types.jsxExpressionContainer(core.types.numericLiteral(value));
    }
    return null;
  };
  return {
    visitor: {
      JSXAttribute(path) {
        const valuePath = path.get("value");
        if (!valuePath.isStringLiteral())
          return;
        opts.values.forEach(({ value, newValue, literal }) => {
          if (!valuePath.isStringLiteral({ value }))
            return;
          const attributeValue = getAttributeValue(newValue, literal);
          if (attributeValue) {
            valuePath.replaceWith(attributeValue);
          }
        });
      }
    }
  };
};

module.exports = addJSXAttribute;
//# sourceMappingURL=index.js.map
