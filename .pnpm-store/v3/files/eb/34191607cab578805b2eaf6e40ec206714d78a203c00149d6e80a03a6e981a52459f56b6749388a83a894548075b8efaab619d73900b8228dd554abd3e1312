'use strict';

var core = require('@babel/core');

const elementToComponent = {
  svg: "Svg",
  circle: "Circle",
  clipPath: "ClipPath",
  ellipse: "Ellipse",
  g: "G",
  linearGradient: "LinearGradient",
  radialGradient: "RadialGradient",
  line: "Line",
  path: "Path",
  pattern: "Pattern",
  polygon: "Polygon",
  polyline: "Polyline",
  rect: "Rect",
  symbol: "Symbol",
  text: "Text",
  textPath: "TextPath",
  tspan: "TSpan",
  use: "Use",
  defs: "Defs",
  stop: "Stop",
  mask: "Mask",
  image: "Image",
  foreignObject: "ForeignObject"
};
const plugin = () => {
  function replaceElement(path, state) {
    const namePath = path.get("openingElement").get("name");
    if (!namePath.isJSXIdentifier())
      return;
    const { name } = namePath.node;
    const component = elementToComponent[name];
    if (component) {
      namePath.replaceWith(core.types.jsxIdentifier(component));
      if (path.has("closingElement")) {
        const closingNamePath = path.get("closingElement").get("name");
        closingNamePath.replaceWith(core.types.jsxIdentifier(component));
      }
      state.replacedComponents.add(component);
      return;
    }
    state.unsupportedComponents.add(name);
    path.remove();
  }
  const svgElementVisitor = {
    JSXElement(path, state) {
      if (!path.get("openingElement").get("name").isJSXIdentifier({ name: "svg" })) {
        return;
      }
      replaceElement(path, state);
      path.traverse(jsxElementVisitor, state);
    }
  };
  const jsxElementVisitor = {
    JSXElement(path, state) {
      replaceElement(path, state);
    }
  };
  const importDeclarationVisitor = {
    ImportDeclaration(path, state) {
      if (path.get("source").isStringLiteral({ value: "react-native-svg" }) && !path.get("importKind").hasNode()) {
        state.replacedComponents.forEach((component) => {
          if (path.get("specifiers").some(
            (specifier) => specifier.get("local").isIdentifier({ name: component })
          )) {
            return;
          }
          path.pushContainer(
            "specifiers",
            core.types.importSpecifier(core.types.identifier(component), core.types.identifier(component))
          );
        });
      } else if (path.get("source").isStringLiteral({ value: "expo" })) {
        path.pushContainer(
          "specifiers",
          core.types.importSpecifier(core.types.identifier("Svg"), core.types.identifier("Svg"))
        );
      } else {
        return;
      }
      if (state.unsupportedComponents.size && !path.has("trailingComments")) {
        const componentList = [...state.unsupportedComponents].join(", ");
        path.addComment(
          "trailing",
          ` SVGR has dropped some elements not supported by react-native-svg: ${componentList} `
        );
      }
    }
  };
  return {
    visitor: {
      Program(path, state) {
        state.replacedComponents = /* @__PURE__ */ new Set();
        state.unsupportedComponents = /* @__PURE__ */ new Set();
        path.traverse(svgElementVisitor, state);
        path.traverse(importDeclarationVisitor, state);
      }
    }
  };
};

module.exports = plugin;
//# sourceMappingURL=index.js.map
