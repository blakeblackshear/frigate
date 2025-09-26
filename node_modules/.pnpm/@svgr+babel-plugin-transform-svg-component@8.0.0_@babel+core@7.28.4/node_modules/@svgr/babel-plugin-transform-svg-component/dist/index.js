'use strict';

var core = require('@babel/core');

const defaultTemplate = (variables, { tpl }) => {
  return tpl`
${variables.imports};

${variables.interfaces};

const ${variables.componentName} = (${variables.props}) => (
  ${variables.jsx}
);
 
${variables.exports};
`;
};

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const tsOptionalPropertySignature = (...args) => {
  return __spreadProps(__spreadValues({}, core.types.tsPropertySignature(...args)), {
    optional: true
  });
};
const getOrCreateImport = ({ imports }, sourceValue, importKind = void 0) => {
  const existing = imports.find(
    (imp2) => imp2.source.value === sourceValue && imp2.importKind === importKind && !imp2.specifiers.some(
      (specifier) => specifier.type === "ImportNamespaceSpecifier"
    )
  );
  if (existing)
    return existing;
  const imp = core.types.importDeclaration([], core.types.stringLiteral(sourceValue));
  if (importKind !== void 0) {
    imp.importKind = importKind;
  }
  imports.push(imp);
  return imp;
};
const tsTypeReferenceSVGProps = (ctx) => {
  if (ctx.opts.native) {
    const identifier2 = core.types.identifier("SvgProps");
    getOrCreateImport(ctx, "react-native-svg", "type").specifiers.push(
      core.types.importSpecifier(identifier2, identifier2)
    );
    return core.types.tsTypeReference(identifier2);
  }
  const identifier = core.types.identifier("SVGProps");
  getOrCreateImport(ctx, ctx.importSource, "type").specifiers.push(
    core.types.importSpecifier(identifier, identifier)
  );
  return core.types.tsTypeReference(
    identifier,
    core.types.tsTypeParameterInstantiation([
      core.types.tsTypeReference(core.types.identifier("SVGSVGElement"))
    ])
  );
};
const tsTypeReferenceSVGRef = (ctx) => {
  const identifier = core.types.identifier("Ref");
  getOrCreateImport(ctx, ctx.importSource).specifiers.push(
    core.types.importSpecifier(identifier, identifier)
  );
  return core.types.tsTypeReference(
    identifier,
    core.types.tsTypeParameterInstantiation([
      core.types.tsTypeReference(core.types.identifier("SVGSVGElement"))
    ])
  );
};
const getJsxRuntimeImport = (cfg) => {
  const specifiers = (() => {
    if (cfg.namespace)
      return [core.types.importNamespaceSpecifier(core.types.identifier(cfg.namespace))];
    if (cfg.defaultSpecifier) {
      const identifier = core.types.identifier(cfg.defaultSpecifier);
      return [core.types.importDefaultSpecifier(identifier)];
    }
    if (cfg.specifiers)
      return cfg.specifiers.map((specifier) => {
        const identifier = core.types.identifier(specifier);
        return core.types.importSpecifier(identifier, identifier);
      });
    throw new Error(
      `Specify "namespace", "defaultSpecifier", or "specifiers" in "jsxRuntimeImport" option`
    );
  })();
  return core.types.importDeclaration(specifiers, core.types.stringLiteral(cfg.source));
};
const defaultJsxRuntimeImport = {
  source: "react",
  namespace: "React"
};
const defaultImportSource = "react";
const getVariables = ({
  opts,
  jsx
}) => {
  var _a, _b, _c, _d;
  const interfaces = [];
  const props = [];
  const imports = [];
  const exports = [];
  const ctx = {
    importSource: (_a = opts.importSource) != null ? _a : defaultImportSource,
    exportIdentifier: core.types.identifier(opts.state.componentName),
    opts,
    interfaces,
    props,
    imports,
    exports
  };
  if (opts.jsxRuntime !== "automatic") {
    imports.push(
      getJsxRuntimeImport((_b = opts.jsxRuntimeImport) != null ? _b : defaultJsxRuntimeImport)
    );
  }
  if (opts.native) {
    getOrCreateImport(ctx, "react-native-svg").specifiers.push(
      core.types.importDefaultSpecifier(core.types.identifier("Svg"))
    );
  }
  if (opts.titleProp || opts.descProp) {
    const properties = [];
    const propertySignatures = [];
    const createProperty = (attr) => {
      return core.types.objectProperty(
        core.types.identifier(attr),
        core.types.identifier(attr),
        false,
        true
      );
    };
    const createSignature = (attr) => {
      return tsOptionalPropertySignature(
        core.types.identifier(attr),
        core.types.tsTypeAnnotation(core.types.tsStringKeyword())
      );
    };
    if (opts.titleProp) {
      properties.push(createProperty("title"), createProperty("titleId"));
      if (opts.typescript) {
        propertySignatures.push(
          createSignature("title"),
          createSignature("titleId")
        );
      }
    }
    if (opts.descProp) {
      properties.push(createProperty("desc"), createProperty("descId"));
      if (opts.typescript) {
        propertySignatures.push(
          createSignature("desc"),
          createSignature("descId")
        );
      }
    }
    const prop = core.types.objectPattern(properties);
    props.push(prop);
    if (opts.typescript) {
      interfaces.push(
        core.types.tsInterfaceDeclaration(
          core.types.identifier("SVGRProps"),
          null,
          null,
          core.types.tSInterfaceBody(propertySignatures)
        )
      );
      prop.typeAnnotation = core.types.tsTypeAnnotation(
        core.types.tsTypeReference(core.types.identifier("SVGRProps"))
      );
    }
  }
  if (opts.expandProps) {
    const identifier = core.types.identifier("props");
    if (core.types.isObjectPattern(props[0])) {
      props[0].properties.push(core.types.restElement(identifier));
      if (opts.typescript) {
        props[0].typeAnnotation = core.types.tsTypeAnnotation(
          core.types.tsIntersectionType([
            tsTypeReferenceSVGProps(ctx),
            props[0].typeAnnotation.typeAnnotation
          ])
        );
      }
    } else {
      props.push(identifier);
      if (opts.typescript) {
        identifier.typeAnnotation = core.types.tsTypeAnnotation(
          tsTypeReferenceSVGProps(ctx)
        );
      }
    }
  }
  if (opts.ref) {
    if (props.length === 0) {
      props.push(core.types.identifier("_"));
    }
    const prop = core.types.identifier("ref");
    props.push(prop);
    if (opts.typescript) {
      prop.typeAnnotation = core.types.tsTypeAnnotation(tsTypeReferenceSVGRef(ctx));
    }
    const forwardRef = core.types.identifier("forwardRef");
    const ForwardRef = core.types.identifier("ForwardRef");
    getOrCreateImport(ctx, ctx.importSource).specifiers.push(
      core.types.importSpecifier(forwardRef, forwardRef)
    );
    exports.push(
      core.types.variableDeclaration("const", [
        core.types.variableDeclarator(
          ForwardRef,
          core.types.callExpression(forwardRef, [ctx.exportIdentifier])
        )
      ])
    );
    ctx.exportIdentifier = ForwardRef;
  }
  if (opts.memo) {
    const memo = core.types.identifier("memo");
    const Memo = core.types.identifier("Memo");
    getOrCreateImport(ctx, ctx.importSource).specifiers.push(
      core.types.importSpecifier(memo, memo)
    );
    exports.push(
      core.types.variableDeclaration("const", [
        core.types.variableDeclarator(
          Memo,
          core.types.callExpression(memo, [ctx.exportIdentifier])
        )
      ])
    );
    ctx.exportIdentifier = Memo;
  }
  if (((_c = opts.state.caller) == null ? void 0 : _c.previousExport) || opts.exportType === "named") {
    if (!opts.namedExport) {
      throw new Error(`"namedExport" not specified`);
    }
    exports.push(
      core.types.exportNamedDeclaration(null, [
        core.types.exportSpecifier(ctx.exportIdentifier, core.types.identifier(opts.namedExport))
      ])
    );
    if ((_d = opts.state.caller) == null ? void 0 : _d.previousExport) {
      const previousExportAst = core.template.ast(opts.state.caller.previousExport);
      exports.push(
        ...Array.isArray(previousExportAst) ? previousExportAst : [previousExportAst]
      );
    }
  } else {
    exports.push(core.types.exportDefaultDeclaration(ctx.exportIdentifier));
  }
  return {
    componentName: opts.state.componentName,
    props,
    interfaces,
    imports,
    exports,
    jsx
  };
};

const plugin = (_, opts) => {
  const template = opts.template || defaultTemplate;
  const plugins = opts.typescript ? ["jsx", "typescript"] : ["jsx"];
  const tpl = core.template.smart({ plugins, preserveComments: true }).ast;
  return {
    visitor: {
      Program(path) {
        const jsx = path.node.body[0].expression;
        const variables = getVariables({
          opts,
          jsx
        });
        const body = template(variables, { options: opts, tpl });
        path.node.body = Array.isArray(body) ? body : [body];
        path.replaceWith(path.node);
      }
    }
  };
};

module.exports = plugin;
//# sourceMappingURL=index.js.map
