'use strict';

var core = require('@babel/core');

const elements = ["svg", "Svg"];
const getValue = (raw) => {
  if (raw === void 0)
    return core.types.stringLiteral("1em");
  switch (typeof raw) {
    case "number":
      return core.types.jsxExpressionContainer(core.types.numericLiteral(raw));
    case "string":
      return core.types.stringLiteral(raw);
    default:
      return core.types.stringLiteral("1em");
  }
};
const plugin = (_, opts) => ({
  visitor: {
    JSXOpeningElement(path) {
      if (!elements.some(
        (element) => path.get("name").isJSXIdentifier({ name: element })
      ))
        return;
      const values = {
        width: getValue(opts.width),
        height: getValue(opts.height)
      };
      const requiredAttributes = Object.keys(values);
      path.get("attributes").forEach((attributePath) => {
        if (!attributePath.isJSXAttribute())
          return;
        const namePath = attributePath.get("name");
        if (!namePath.isJSXIdentifier())
          return;
        const index = requiredAttributes.indexOf(namePath.node.name);
        if (index === -1)
          return;
        const valuePath = attributePath.get("value");
        valuePath.replaceWith(values[namePath.node.name]);
        requiredAttributes.splice(index, 1);
      });
      path.pushContainer(
        "attributes",
        requiredAttributes.map(
          (attr) => core.types.jsxAttribute(
            core.types.jsxIdentifier(attr),
            values[attr]
          )
        )
      );
    }
  }
});

module.exports = plugin;
//# sourceMappingURL=index.js.map
