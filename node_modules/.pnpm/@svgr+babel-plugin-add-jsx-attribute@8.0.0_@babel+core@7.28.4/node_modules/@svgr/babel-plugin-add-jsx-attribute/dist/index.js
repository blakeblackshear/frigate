'use strict';

var core = require('@babel/core');

const positionMethod = {
  start: "unshiftContainer",
  end: "pushContainer"
};
const addJSXAttribute = (_, opts) => {
  function getAttributeValue({
    literal,
    value
  }) {
    if (typeof value === "boolean") {
      return core.types.jsxExpressionContainer(core.types.booleanLiteral(value));
    }
    if (typeof value === "number") {
      return core.types.jsxExpressionContainer(core.types.numericLiteral(value));
    }
    if (typeof value === "string" && literal) {
      return core.types.jsxExpressionContainer(
        core.template.ast(value).expression
      );
    }
    if (typeof value === "string") {
      return core.types.stringLiteral(value);
    }
    return null;
  }
  function getAttribute({ spread, name, value, literal }) {
    if (spread) {
      return core.types.jsxSpreadAttribute(core.types.identifier(name));
    }
    return core.types.jsxAttribute(
      core.types.jsxIdentifier(name),
      getAttributeValue({ value, literal })
    );
  }
  return {
    visitor: {
      JSXOpeningElement(path) {
        if (!core.types.isJSXIdentifier(path.node.name))
          return;
        if (!opts.elements.includes(path.node.name.name))
          return;
        opts.attributes.forEach(
          ({
            name,
            value = null,
            spread = false,
            literal = false,
            position = "end"
          }) => {
            const method = positionMethod[position];
            const newAttribute = getAttribute({ spread, name, value, literal });
            const attributes = path.get("attributes");
            const isEqualAttribute = (attribute) => {
              if (spread)
                return attribute.isJSXSpreadAttribute() && attribute.get("argument").isIdentifier({ name });
              return attribute.isJSXAttribute() && attribute.get("name").isJSXIdentifier({ name });
            };
            const replaced = attributes.some((attribute) => {
              if (!isEqualAttribute(attribute))
                return false;
              attribute.replaceWith(newAttribute);
              return true;
            });
            if (!replaced) {
              path[method]("attributes", newAttribute);
            }
          }
        );
      }
    }
  };
};

module.exports = addJSXAttribute;
//# sourceMappingURL=index.js.map
