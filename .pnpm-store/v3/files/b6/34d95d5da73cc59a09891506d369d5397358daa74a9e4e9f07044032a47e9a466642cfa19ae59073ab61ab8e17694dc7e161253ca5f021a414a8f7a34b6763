"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _helperModuleImports = require("@babel/helper-module-imports");
var _core = require("@babel/core");
var _helpers = require("./helpers.js");
var _index = require("./get-runtime-path/index.js");
var _index2 = require("./babel-7/index.cjs");
var _default = exports.default = (0, _helperPluginUtils.declare)((api, options, dirname) => {
  api.assertVersion(7);
  const {
    version: runtimeVersion = "7.0.0-beta.0",
    absoluteRuntime = false,
    moduleName = null
  } = options;
  if (typeof absoluteRuntime !== "boolean" && typeof absoluteRuntime !== "string") {
    throw new Error("The 'absoluteRuntime' option must be undefined, a boolean, or a string.");
  }
  if (typeof runtimeVersion !== "string") {
    throw new Error(`The 'version' option must be a version string.`);
  }
  if (moduleName !== null && typeof moduleName !== "string") {
    throw new Error("The 'moduleName' option must be null or a string.");
  }
  {
    const DUAL_MODE_RUNTIME = "7.13.0";
    var supportsCJSDefault = (0, _helpers.hasMinVersion)(DUAL_MODE_RUNTIME, runtimeVersion);
  }
  if (hasOwnProperty.call(options, "useBuiltIns")) {
    if (options.useBuiltIns) {
      throw new Error("The 'useBuiltIns' option has been removed. The @babel/runtime " + "module now uses builtins by default.");
    } else {
      throw new Error("The 'useBuiltIns' option has been removed. Use the 'corejs'" + "option to polyfill with `core-js` via @babel/runtime.");
    }
  }
  if (hasOwnProperty.call(options, "polyfill")) {
    if (options.polyfill === false) {
      throw new Error("The 'polyfill' option has been removed. The @babel/runtime " + "module now skips polyfilling by default.");
    } else {
      throw new Error("The 'polyfill' option has been removed. Use the 'corejs'" + "option to polyfill with `core-js` via @babel/runtime.");
    }
  }
  ;
  {
    const {
      useESModules = false
    } = options;
    if (typeof useESModules !== "boolean" && useESModules !== "auto") {
      throw new Error("The 'useESModules' option must be undefined, or a boolean, or 'auto'.");
    }
    var esModules = useESModules === "auto" ? api.caller(caller => !!(caller != null && caller.supportsStaticESM)) : useESModules;
  }
  {
    var {
      helpers: useRuntimeHelpers = true
    } = options;
    if (typeof useRuntimeHelpers !== "boolean") {
      throw new Error("The 'helpers' option must be undefined, or a boolean.");
    }
  }
  const HEADER_HELPERS = new Set(["interopRequireWildcard", "interopRequireDefault"]);
  return {
    name: "transform-runtime",
    inherits: _index2.createPolyfillPlugins(options, runtimeVersion, absoluteRuntime),
    pre(file) {
      if (!useRuntimeHelpers) return;
      let modulePath;
      file.set("helperGenerator", name => {
        var _ref;
        modulePath != null ? modulePath : modulePath = (0, _index.default)((_ref = moduleName != null ? moduleName : file.get("runtimeHelpersModuleName")) != null ? _ref : "@babel/runtime", dirname, absoluteRuntime);
        {
          if (!(file.availableHelper != null && file.availableHelper(name, runtimeVersion))) {
            if (name === "regeneratorRuntime") {
              return _core.types.arrowFunctionExpression([], _core.types.identifier("regeneratorRuntime"));
            }
            if (name === "regenerator" || name === "regeneratorKeys" || name === "regeneratorAsync" || name === "regeneratorAsyncGen") {
              return _core.types.identifier("__interal_marker_fallback_regenerator__");
            }
            return;
          }
        }
        const blockHoist = HEADER_HELPERS.has(name) && !(0, _helperModuleImports.isModule)(file.path) ? 4 : undefined;
        let helperPath = `${modulePath}/helpers/${esModules && file.path.node.sourceType === "module" ? "esm/" + name : name}`;
        if (absoluteRuntime) helperPath = (0, _index.resolveFSPath)(helperPath);
        return addDefaultImport(helperPath, name, blockHoist, true);
      });
      const cache = new Map();
      function addDefaultImport(source, nameHint, blockHoist, isHelper = false) {
        const cacheKey = (0, _helperModuleImports.isModule)(file.path);
        const key = `${source}:${nameHint}:${cacheKey || ""}`;
        let cached = cache.get(key);
        if (cached) {
          cached = _core.types.cloneNode(cached);
        } else {
          cached = (0, _helperModuleImports.addDefault)(file.path, source, {
            importedInterop: isHelper && supportsCJSDefault ? "compiled" : "uncompiled",
            nameHint,
            blockHoist
          });
          cache.set(key, cached);
        }
        return cached;
      }
    }
  };
});

//# sourceMappingURL=index.js.map
