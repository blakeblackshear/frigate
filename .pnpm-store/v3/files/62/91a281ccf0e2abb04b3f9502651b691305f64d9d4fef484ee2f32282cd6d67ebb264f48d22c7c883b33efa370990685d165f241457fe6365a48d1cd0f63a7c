// @ts-check
"use strict";

/**
 * @file
 * This file uses webpack to compile a template with a child compiler.
 *
 * [TEMPLATE] -> [JAVASCRIPT]
 *
 */

/** @typedef {import("webpack").Chunk} Chunk */
/** @typedef {import("webpack").sources.Source} Source */
/** @typedef {{hash: string, entry: Chunk, content: string, assets: {[name: string]: { source: Source, info: import("webpack").AssetInfo }}}} ChildCompilationTemplateResult */

/**
 * The HtmlWebpackChildCompiler is a helper to allow reusing one childCompiler
 * for multiple HtmlWebpackPlugin instances to improve the compilation performance.
 */
class HtmlWebpackChildCompiler {
  /**
   *
   * @param {string[]} templates
   */
  constructor(templates) {
    /**
     * @type {string[]} templateIds
     * The template array will allow us to keep track which input generated which output
     */
    this.templates = templates;
    /** @type {Promise<{[templatePath: string]: ChildCompilationTemplateResult}>} */
    this.compilationPromise; // eslint-disable-line
    /** @type {number | undefined} */
    this.compilationStartedTimestamp; // eslint-disable-line
    /** @type {number | undefined} */
    this.compilationEndedTimestamp; // eslint-disable-line
    /**
     * All file dependencies of the child compiler
     * @type {{fileDependencies: string[], contextDependencies: string[], missingDependencies: string[]}}
     */
    this.fileDependencies = {
      fileDependencies: [],
      contextDependencies: [],
      missingDependencies: [],
    };
  }

  /**
   * Returns true if the childCompiler is currently compiling
   *
   * @returns {boolean}
   */
  isCompiling() {
    return !this.didCompile() && this.compilationStartedTimestamp !== undefined;
  }

  /**
   * Returns true if the childCompiler is done compiling
   *
   * @returns {boolean}
   */
  didCompile() {
    return this.compilationEndedTimestamp !== undefined;
  }

  /**
   * This function will start the template compilation
   * once it is started no more templates can be added
   *
   * @param {import('webpack').Compilation} mainCompilation
   * @returns {Promise<{[templatePath: string]: ChildCompilationTemplateResult}>}
   */
  compileTemplates(mainCompilation) {
    const webpack = mainCompilation.compiler.webpack;
    const Compilation = webpack.Compilation;

    const NodeTemplatePlugin = webpack.node.NodeTemplatePlugin;
    const NodeTargetPlugin = webpack.node.NodeTargetPlugin;
    const LoaderTargetPlugin = webpack.LoaderTargetPlugin;
    const EntryPlugin = webpack.EntryPlugin;

    // To prevent multiple compilations for the same template
    // the compilation is cached in a promise.
    // If it already exists return
    if (this.compilationPromise) {
      return this.compilationPromise;
    }

    const outputOptions = {
      filename: "__child-[name]",
      publicPath: "",
      library: {
        type: "var",
        name: "HTML_WEBPACK_PLUGIN_RESULT",
      },
      scriptType: /** @type {'text/javascript'} */ ("text/javascript"),
      iife: true,
    };
    const compilerName = "HtmlWebpackCompiler";
    // Create an additional child compiler which takes the template
    // and turns it into an Node.JS html factory.
    // This allows us to use loaders during the compilation
    const childCompiler = mainCompilation.createChildCompiler(
      compilerName,
      outputOptions,
      [
        // Compile the template to nodejs javascript
        new NodeTargetPlugin(),
        new NodeTemplatePlugin(),
        new LoaderTargetPlugin("node"),
        new webpack.library.EnableLibraryPlugin("var"),
      ],
    );
    // The file path context which webpack uses to resolve all relative files to
    childCompiler.context = mainCompilation.compiler.context;

    // Generate output file names
    const temporaryTemplateNames = this.templates.map(
      (template, index) => `__child-HtmlWebpackPlugin_${index}-${template}`,
    );

    // Add all templates
    this.templates.forEach((template, index) => {
      new EntryPlugin(
        childCompiler.context,
        "data:text/javascript,__webpack_public_path__ = __webpack_base_uri__ = htmlWebpackPluginPublicPath;",
        `HtmlWebpackPlugin_${index}-${template}`,
      ).apply(childCompiler);
      new EntryPlugin(
        childCompiler.context,
        template,
        `HtmlWebpackPlugin_${index}-${template}`,
      ).apply(childCompiler);
    });

    // The templates are compiled and executed by NodeJS - similar to server side rendering
    // Unfortunately this causes issues as some loaders require an absolute URL to support ES Modules
    // The following config enables relative URL support for the child compiler
    childCompiler.options.module = { ...childCompiler.options.module };
    childCompiler.options.module.parser = {
      ...childCompiler.options.module.parser,
    };
    childCompiler.options.module.parser.javascript = {
      ...childCompiler.options.module.parser.javascript,
      url: "relative",
    };

    this.compilationStartedTimestamp = new Date().getTime();
    /** @type {Promise<{[templatePath: string]: ChildCompilationTemplateResult}>} */
    this.compilationPromise = new Promise((resolve, reject) => {
      /** @type {Source[]} */
      const extractedAssets = [];

      childCompiler.hooks.thisCompilation.tap(
        "HtmlWebpackPlugin",
        (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: "HtmlWebpackPlugin",
              stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
            },
            (assets) => {
              temporaryTemplateNames.forEach((temporaryTemplateName) => {
                if (assets[temporaryTemplateName]) {
                  extractedAssets.push(assets[temporaryTemplateName]);

                  compilation.deleteAsset(temporaryTemplateName);
                }
              });
            },
          );
        },
      );

      childCompiler.runAsChild((err, entries, childCompilation) => {
        // Extract templates
        // TODO fine a better way to store entries and results, to avoid duplicate chunks and assets
        const compiledTemplates = entries
          ? extractedAssets.map((asset) => asset.source())
          : [];

        // Extract file dependencies
        if (entries && childCompilation) {
          this.fileDependencies = {
            fileDependencies: Array.from(childCompilation.fileDependencies),
            contextDependencies: Array.from(
              childCompilation.contextDependencies,
            ),
            missingDependencies: Array.from(
              childCompilation.missingDependencies,
            ),
          };
        }

        // Reject the promise if the childCompilation contains error
        if (
          childCompilation &&
          childCompilation.errors &&
          childCompilation.errors.length
        ) {
          const errorDetailsArray = [];
          for (const error of childCompilation.errors) {
            let message = error.message;
            if (error.stack) {
              message += "\n" + error.stack;
            }
            errorDetailsArray.push(message);
          }
          const errorDetails = errorDetailsArray.join("\n");

          reject(new Error("Child compilation failed:\n" + errorDetails));

          return;
        }

        // Reject if the error object contains errors
        if (err) {
          reject(err);
          return;
        }

        if (!childCompilation || !entries) {
          reject(new Error("Empty child compilation"));
          return;
        }

        /**
         * @type {{[templatePath: string]: ChildCompilationTemplateResult}}
         */
        const result = {};

        /** @type {{[name: string]: { source: Source, info: import("webpack").AssetInfo }}} */
        const assets = {};

        for (const asset of childCompilation.getAssets()) {
          assets[asset.name] = { source: asset.source, info: asset.info };
        }

        compiledTemplates.forEach((templateSource, entryIndex) => {
          // The compiledTemplates are generated from the entries added in
          // the addTemplate function.
          // Therefore, the array index of this.templates should be the as entryIndex.
          result[this.templates[entryIndex]] = {
            // TODO, can we have Buffer here?
            content: /** @type {string} */ (templateSource),
            hash: childCompilation.hash || "XXXX",
            entry: entries[entryIndex],
            assets,
          };
        });

        this.compilationEndedTimestamp = new Date().getTime();

        resolve(result);
      });
    });

    return this.compilationPromise;
  }
}

module.exports = {
  HtmlWebpackChildCompiler,
};
