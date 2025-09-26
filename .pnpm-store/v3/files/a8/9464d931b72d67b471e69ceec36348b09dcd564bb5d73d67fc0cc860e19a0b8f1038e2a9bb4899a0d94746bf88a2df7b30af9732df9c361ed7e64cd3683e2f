"use strict";

const path = require("path");
const schema = require("./loader-options.json");
const {
  ABSOLUTE_PUBLIC_PATH,
  AUTO_PUBLIC_PATH,
  BASE_URI,
  SINGLE_DOT_PATH_SEGMENT,
  evalModuleCode,
  findModuleById,
  stringifyLocal,
  stringifyRequest
} = require("./utils");
const MiniCssExtractPlugin = require("./index");

/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Chunk} Chunk */
/** @typedef {import("webpack").Module} Module */
/** @typedef {import("webpack").sources.Source} Source */
/** @typedef {import("webpack").AssetInfo} AssetInfo */
/** @typedef {import("webpack").NormalModule} NormalModule */
/** @typedef {import("./index.js").LoaderOptions} LoaderOptions */

// eslint-disable-next-line jsdoc/no-restricted-syntax
/** @typedef {{[key: string]: string | Function }} Locals */

// eslint-disable-next-line jsdoc/no-restricted-syntax
/** @typedef {any} EXPECTED_ANY */

/**
 * @typedef {object} Dependency
 * @property {string} identifier identifier
 * @property {string | null} context context
 * @property {Buffer} content content
 * @property {string=} media media
 * @property {string=} supports supports
 * @property {string=} layer layer
 * @property {Buffer=} sourceMap source map
 */

/**
 * @param {string} code code
 * @param {{ loaderContext: import("webpack").LoaderContext<LoaderOptions>, options: LoaderOptions, locals: Locals | undefined }} context context
 * @returns {string} code and HMR code
 */
function hotLoader(code, context) {
  const localsJsonString = JSON.stringify(JSON.stringify(context.locals));
  return `${code}
    if(module.hot) {
      (function() {
        var localsJsonString = ${localsJsonString};
        // ${Date.now()}
        var cssReload = require(${stringifyRequest(context.loaderContext, path.join(__dirname, "hmr/hotModuleReplacement.js"))})(module.id, ${JSON.stringify(context.options)});
        // only invalidate when locals change
        if (
          module.hot.data &&
          module.hot.data.value &&
          module.hot.data.value !== localsJsonString
        ) {
          module.hot.invalidate();
        } else {
          module.hot.accept();
        }
        module.hot.dispose(function(data) {
          data.value = localsJsonString;
          cssReload();
        });
      })();
    }
  `;
}

/**
 * @this {import("webpack").LoaderContext<LoaderOptions>}
 * @param {string} request request
 */
function pitch(request) {
  if (this._compiler && this._compiler.options && this._compiler.options.experiments && this._compiler.options.experiments.css && this._module && (this._module.type === "css" || this._module.type === "css/auto" || this._module.type === "css/global" || this._module.type === "css/module")) {
    this.emitWarning(new Error('You can\'t use `experiments.css` (`experiments.futureDefaults` enable built-in CSS support by default) and `mini-css-extract-plugin` together, please set `experiments.css` to `false` or set `{ type: "javascript/auto" }` for rules with `mini-css-extract-plugin` in your webpack config (now `mini-css-extract-plugin` does nothing).'));
    return;
  }
  const options = this.getOptions(/** @type {Schema} */schema);
  const emit = typeof options.emit !== "undefined" ? options.emit : true;
  const callback = this.async();
  const optionsFromPlugin =
  // @ts-expect-error
  this[MiniCssExtractPlugin.pluginSymbol];
  if (!optionsFromPlugin) {
    callback(new Error("You forgot to add 'mini-css-extract-plugin' plugin (i.e. `{ plugins: [new MiniCssExtractPlugin()] }`), please read https://github.com/webpack-contrib/mini-css-extract-plugin#getting-started"));
    return;
  }
  const {
    webpack
  } = /** @type {Compiler} */this._compiler;

  /**
   * @param {EXPECTED_ANY} originalExports original exports
   * @param {Compilation=} compilation compilation
   * @param {{ [name: string]: Source }=} assets assets
   * @param {Map<string, AssetInfo>=} assetsInfo assets info
   * @returns {void}
   */
  const handleExports = (originalExports, compilation, assets, assetsInfo) => {
    /** @type {Locals | undefined} */
    let locals;
    let namedExport;
    const esModule = typeof options.esModule !== "undefined" ? options.esModule : true;

    /**
     * @param {Dependency[] | [null, object][]} dependencies dependencies
     */
    const addDependencies = dependencies => {
      // eslint-disable-next-line no-eq-null, eqeqeq
      if (!Array.isArray(dependencies) && dependencies != null) {
        throw new Error(`Exported value was not extracted as an array: ${JSON.stringify(dependencies)}`);
      }
      const identifierCountMap = new Map();
      let lastDep;
      for (const dependency of dependencies) {
        if (!(/** @type {Dependency} */dependency.identifier) || !emit) {
          continue;
        }
        const count = identifierCountMap.get(/** @type {Dependency} */dependency.identifier) || 0;
        const CssDependency = MiniCssExtractPlugin.getCssDependency(webpack);

        /** @type {NormalModule} */
        this._module.addDependency(lastDep = new CssDependency(/** @type {Dependency} */
        dependency, /** @type {Dependency} */
        dependency.context, count));
        identifierCountMap.set(/** @type {Dependency} */
        dependency.identifier, count + 1);
      }
      if (lastDep && assets) {
        lastDep.assets = assets;
        lastDep.assetsInfo = assetsInfo;
      }
    };
    try {
      const exports = originalExports.__esModule ? originalExports.default : originalExports;
      namedExport = originalExports.__esModule && (!originalExports.default || !("locals" in originalExports.default));
      if (namedExport) {
        for (const key of Object.keys(originalExports)) {
          if (key !== "default") {
            if (!locals) {
              locals = {};
            }

            /** @type {Locals} */
            locals[key] = originalExports[key];
          }
        }
      } else {
        locals = exports && exports.locals;
      }

      /** @type {Dependency[] | [null, Record<string, string>][]} */
      let dependencies;
      if (!Array.isArray(exports)) {
        dependencies = [[null, exports]];
      } else {
        dependencies = exports.map(([id, content, media, sourceMap, supports, layer]) => {
          let identifier = id;
          let context;
          if (compilation) {
            const module = /** @type {Module} */
            findModuleById(compilation, id);
            identifier = module.identifier();
            ({
              context
            } = module);
          } else {
            // TODO check if this context is used somewhere
            context = this.rootContext;
          }
          return {
            identifier,
            context,
            content: Buffer.from(content),
            media,
            supports,
            layer,
            sourceMap: sourceMap ? Buffer.from(JSON.stringify(sourceMap)) : undefined
          };
        });
      }
      addDependencies(dependencies);
    } catch (err) {
      callback(/** @type {Error} */err);
      return;
    }
    const result = function makeResult() {
      const defaultExport = typeof options.defaultExport !== "undefined" ? options.defaultExport : false;
      if (locals) {
        if (namedExport) {
          const identifiers = [...function* generateIdentifiers() {
            let identifierId = 0;
            for (const key of Object.keys(locals)) {
              identifierId += 1;
              yield [`_${identifierId.toString(16)}`, key];
            }
          }()];
          const localsString = identifiers.map(([id, key]) => `\nvar ${id} = ${stringifyLocal(/** @type {Locals} */locals[key])};`).join("");
          const exportsString = `export { ${identifiers.map(([id, key]) => `${id} as ${JSON.stringify(key)}`).join(", ")} }`;
          return defaultExport ? `${localsString}\n${exportsString}\nexport default { ${identifiers.map(([id, key]) => `${JSON.stringify(key)}: ${id}`).join(", ")} }\n` : `${localsString}\n${exportsString}\n`;
        }
        return `\n${esModule ? "export default" : "module.exports = "} ${JSON.stringify(locals)};`;
      } else if (esModule) {
        return defaultExport ? "\nexport {};export default {};" : "\nexport {};";
      }
      return "";
    }();
    let resultSource = `// extracted by ${MiniCssExtractPlugin.pluginName}`;

    // only attempt hotreloading if the css is actually used for something other than hash values
    resultSource += this.hot && emit ? hotLoader(result, {
      loaderContext: this,
      options,
      locals
    }) : result;
    callback(null, resultSource);
  };
  let {
    publicPath
  } = /** @type {Compilation} */
  this._compilation.outputOptions;
  if (typeof options.publicPath === "string") {
    publicPath = options.publicPath;
  } else if (typeof options.publicPath === "function") {
    publicPath = options.publicPath(this.resourcePath, this.rootContext);
  }
  if (publicPath === "auto") {
    publicPath = AUTO_PUBLIC_PATH;
  }
  if (typeof optionsFromPlugin.experimentalUseImportModule === "undefined" && typeof this.importModule === "function" || optionsFromPlugin.experimentalUseImportModule) {
    if (!this.importModule) {
      callback(new Error("You are using 'experimentalUseImportModule' but 'this.importModule' is not available in loader context. You need to have at least webpack 5.33.2."));
      return;
    }
    let publicPathForExtract;
    if (typeof publicPath === "string") {
      const isAbsolutePublicPath = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(publicPath);
      publicPathForExtract = isAbsolutePublicPath ? publicPath : `${ABSOLUTE_PUBLIC_PATH}${publicPath.replace(/\./g, SINGLE_DOT_PATH_SEGMENT)}`;
    } else {
      publicPathForExtract = publicPath;
    }
    this.importModule(`${this.resourcePath}.webpack[javascript/auto]!=!!!${request}`, {
      layer: options.layer,
      publicPath: (/** @type {string} */publicPathForExtract),
      baseUri: `${BASE_URI}/`
    },
    /**
     * @param {Error | null | undefined} error error
     * @param {object} exports exports
     */
    (error, exports) => {
      if (error) {
        callback(error);
        return;
      }
      handleExports(exports);
    });
    return;
  }
  const loaders = this.loaders.slice(this.loaderIndex + 1);
  this.addDependency(this.resourcePath);
  const childFilename = "*";
  const outputOptions = {
    filename: childFilename,
    publicPath
  };
  const childCompiler = /** @type {Compilation} */
  this._compilation.createChildCompiler(`${MiniCssExtractPlugin.pluginName} ${request}`, outputOptions);

  // The templates are compiled and executed by NodeJS - similar to server side rendering
  // Unfortunately this causes issues as some loaders require an absolute URL to support ES Modules
  // The following config enables relative URL support for the child compiler
  childCompiler.options.module = {
    ...childCompiler.options.module
  };
  childCompiler.options.module.parser = {
    ...childCompiler.options.module.parser
  };
  childCompiler.options.module.parser.javascript = {
    ...childCompiler.options.module.parser.javascript,
    url: "relative"
  };
  const {
    NodeTemplatePlugin
  } = webpack.node;
  const {
    NodeTargetPlugin
  } = webpack.node;
  new NodeTemplatePlugin().apply(childCompiler);
  new NodeTargetPlugin().apply(childCompiler);
  const {
    EntryOptionPlugin
  } = webpack;
  const {
    library: {
      EnableLibraryPlugin
    }
  } = webpack;
  new EnableLibraryPlugin("commonjs2").apply(childCompiler);
  EntryOptionPlugin.applyEntryOption(childCompiler, this.context, {
    child: {
      library: {
        type: "commonjs2"
      },
      import: [`!!${request}`]
    }
  });
  const {
    LimitChunkCountPlugin
  } = webpack.optimize;
  new LimitChunkCountPlugin({
    maxChunks: 1
  }).apply(childCompiler);
  const {
    NormalModule
  } = webpack;
  childCompiler.hooks.thisCompilation.tap(`${MiniCssExtractPlugin.pluginName} loader`,
  /**
   * @param {Compilation} compilation compilation
   */
  compilation => {
    const normalModuleHook = NormalModule.getCompilationHooks(compilation).loader;
    normalModuleHook.tap(`${MiniCssExtractPlugin.pluginName} loader`, (loaderContext, module) => {
      if (module.request === request) {
        module.loaders = loaders.map(loader => ({
          type: null,
          loader: loader.path,
          options: loader.options,
          ident: loader.ident
        }));
      }
    });
  });

  /** @type {string | Buffer} */
  let source;
  childCompiler.hooks.compilation.tap(MiniCssExtractPlugin.pluginName,
  /**
   * @param {Compilation} compilation compilation
   */
  compilation => {
    compilation.hooks.processAssets.tap(MiniCssExtractPlugin.pluginName, () => {
      source = compilation.assets[childFilename] && compilation.assets[childFilename].source();

      // Remove all chunk assets
      for (const chunk of compilation.chunks) {
        for (const file of chunk.files) {
          compilation.deleteAsset(file);
        }
      }
    });
  });
  childCompiler.runAsChild((error, entries, compilation_) => {
    if (error) {
      callback(error);
      return;
    }
    const compilation = /** @type {Compilation} */compilation_;
    if (compilation.errors.length > 0) {
      callback(compilation.errors[0]);
      return;
    }

    /** @type {{ [name: string]: Source }} */
    const assets = Object.create(null);
    /** @type {Map<string, AssetInfo>} */
    const assetsInfo = new Map();
    for (const asset of compilation.getAssets()) {
      assets[asset.name] = asset.source;
      assetsInfo.set(asset.name, asset.info);
    }
    for (const dep of compilation.fileDependencies) {
      this.addDependency(dep);
    }
    for (const dep of compilation.contextDependencies) {
      this.addContextDependency(dep);
    }
    if (!source) {
      callback(new Error("Didn't get a result from child compiler"));
      return;
    }
    let originalExports;
    try {
      originalExports = evalModuleCode(this, source, request);
    } catch (err) {
      callback(/** @type {Error} */err);
      return;
    }
    handleExports(originalExports, compilation, assets, assetsInfo);
  });
}

/**
 * @this {import("webpack").LoaderContext<LoaderOptions>}
 * @param {string} content content
 * @returns {string | undefined} the original content
 */
function loader(content) {
  if (this._compiler && this._compiler.options && this._compiler.options.experiments && this._compiler.options.experiments.css && this._module && (this._module.type === "css" || this._module.type === "css/auto" || this._module.type === "css/global" || this._module.type === "css/module")) {
    return content;
  }
}
module.exports = loader;
module.exports.hotLoader = hotLoader;
module.exports.pitch = pitch;