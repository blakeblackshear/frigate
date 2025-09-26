'use strict';

var core = require('@babel/core');

const removeJSXAttribute = (_, opts) => ({
  visitor: {
    JSXOpeningElement(path) {
      if (!core.types.isJSXIdentifier(path.node.name))
        return;
      if (!opts.elements.includes(path.node.name.name))
        return;
      path.get("attributes").forEach((attribute) => {
        if (core.types.isJSXAttribute(attribute.node) && core.types.isJSXIdentifier(attribute.node.name) && opts.attributes.includes(attribute.node.name.name)) {
          attribute.remove();
        }
      });
    }
  }
});

module.exports = removeJSXAttribute;
//# sourceMappingURL=index.js.map
