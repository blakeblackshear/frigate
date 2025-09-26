'use strict';

var core = require('@babel/core');

const elements = ["svg", "Svg"];
const createTagElement = (tag, children = [], attributes = []) => {
  const eleName = core.types.jsxIdentifier(tag);
  return core.types.jsxElement(
    core.types.jsxOpeningElement(eleName, attributes),
    core.types.jsxClosingElement(eleName),
    children
  );
};
const createTagIdAttribute = (tag) => core.types.jsxAttribute(
  core.types.jsxIdentifier("id"),
  core.types.jsxExpressionContainer(core.types.identifier(`${tag}Id`))
);
const addTagIdAttribute = (tag, attributes) => {
  const existingId = attributes.find(
    (attribute) => core.types.isJSXAttribute(attribute) && attribute.name.name === "id"
  );
  if (!existingId) {
    return [...attributes, createTagIdAttribute(tag)];
  }
  existingId.value = core.types.jsxExpressionContainer(
    core.types.isStringLiteral(existingId.value) ? core.types.logicalExpression("||", core.types.identifier(`${tag}Id`), existingId.value) : core.types.identifier(`${tag}Id`)
  );
  return attributes;
};
const plugin = () => ({
  visitor: {
    JSXElement(path, state) {
      const tag = state.opts.tag || "title";
      if (!elements.length)
        return;
      const openingElement = path.get("openingElement");
      const openingElementName = openingElement.get("name");
      if (!elements.some(
        (element) => openingElementName.isJSXIdentifier({ name: element })
      )) {
        return;
      }
      const getTagElement = (existingTitle) => {
        var _a;
        const tagExpression = core.types.identifier(tag);
        if (existingTitle) {
          existingTitle.openingElement.attributes = addTagIdAttribute(
            tag,
            existingTitle.openingElement.attributes
          );
        }
        const conditionalTitle = core.types.conditionalExpression(
          tagExpression,
          createTagElement(
            tag,
            [core.types.jsxExpressionContainer(tagExpression)],
            existingTitle ? existingTitle.openingElement.attributes : [createTagIdAttribute(tag)]
          ),
          core.types.nullLiteral()
        );
        if ((_a = existingTitle == null ? void 0 : existingTitle.children) == null ? void 0 : _a.length) {
          return core.types.jsxExpressionContainer(
            core.types.conditionalExpression(
              core.types.binaryExpression(
                "===",
                tagExpression,
                core.types.identifier("undefined")
              ),
              existingTitle,
              conditionalTitle
            )
          );
        }
        return core.types.jsxExpressionContainer(conditionalTitle);
      };
      let tagElement = null;
      const hasTitle = path.get("children").some((childPath) => {
        if (childPath.node === tagElement)
          return false;
        if (!childPath.isJSXElement())
          return false;
        const name = childPath.get("openingElement").get("name");
        if (!name.isJSXIdentifier())
          return false;
        if (name.node.name !== tag)
          return false;
        tagElement = getTagElement(childPath.node);
        childPath.replaceWith(tagElement);
        return true;
      });
      tagElement = tagElement || getTagElement();
      if (!hasTitle) {
        path.node.children.unshift(tagElement);
        path.replaceWith(path.node);
      }
    }
  }
});

module.exports = plugin;
//# sourceMappingURL=index.js.map
