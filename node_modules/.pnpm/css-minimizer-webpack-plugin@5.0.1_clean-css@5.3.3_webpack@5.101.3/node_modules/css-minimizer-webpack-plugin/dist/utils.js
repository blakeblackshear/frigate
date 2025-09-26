"use strict";

/** @typedef {import("./index.js").Input} Input */
/** @typedef {import("@jridgewell/trace-mapping").EncodedSourceMap} RawSourceMap */
/** @typedef {import("./index.js").MinimizedResult} MinimizedResult */
/** @typedef {import("./index.js").CustomOptions} CustomOptions */
/** @typedef {import("postcss").ProcessOptions} ProcessOptions */
/** @typedef {import("postcss").Postcss} Postcss */

const notSettled = Symbol(`not-settled`);

/**
 * @template T
 * @typedef {() => Promise<T>} Task
 */

/**
 * Run tasks with limited concurrency.
 * @template T
 * @param {number} limit - Limit of tasks that run at once.
 * @param {Task<T>[]} tasks - List of tasks to run.
 * @returns {Promise<T[]>} A promise that fulfills to an array of the results
 */
function throttleAll(limit, tasks) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError(`Expected \`limit\` to be a finite number > 0, got \`${limit}\` (${typeof limit})`);
  }
  if (!Array.isArray(tasks) || !tasks.every(task => typeof task === `function`)) {
    throw new TypeError(`Expected \`tasks\` to be a list of functions returning a promise`);
  }
  return new Promise((resolve, reject) => {
    const result = Array(tasks.length).fill(notSettled);
    const entries = tasks.entries();
    const next = () => {
      const {
        done,
        value
      } = entries.next();
      if (done) {
        const isLast = !result.includes(notSettled);
        if (isLast) resolve(result);
        return;
      }
      const [index, task] = value;

      /**
       * @param {T} x
       */
      const onFulfilled = x => {
        result[index] = x;
        next();
      };
      task().then(onFulfilled, reject);
    };
    Array(limit).fill(0).forEach(next);
  });
}

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function cssnanoMinify(input, sourceMap, minimizerOptions = {
  preset: "default"
}) {
  /**
   * @template T
   * @param {string} module
   * @returns {Promise<T>}
   */
  const load = async module => {
    let exports;
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      exports = require(module);
      return exports;
    } catch (requireError) {
      let importESM;
      try {
        // eslint-disable-next-line no-new-func
        importESM = new Function("id", "return import(id);");
      } catch (e) {
        importESM = null;
      }
      if ( /** @type {Error & {code: string}} */
      requireError.code === "ERR_REQUIRE_ESM" && importESM) {
        exports = await importESM(module);
        return exports.default;
      }
      throw requireError;
    }
  };
  const [[name, code]] = Object.entries(input);
  /** @type {ProcessOptions} */
  const postcssOptions = {
    from: name,
    ...minimizerOptions.processorOptions
  };
  if (typeof postcssOptions.parser === "string") {
    try {
      postcssOptions.parser = await load(postcssOptions.parser);
    } catch (error) {
      throw new Error(`Loading PostCSS "${postcssOptions.parser}" parser failed: ${
      /** @type {Error} */error.message}\n\n(@${name})`);
    }
  }
  if (typeof postcssOptions.stringifier === "string") {
    try {
      postcssOptions.stringifier = await load(postcssOptions.stringifier);
    } catch (error) {
      throw new Error(`Loading PostCSS "${postcssOptions.stringifier}" stringifier failed: ${
      /** @type {Error} */error.message}\n\n(@${name})`);
    }
  }
  if (typeof postcssOptions.syntax === "string") {
    try {
      postcssOptions.syntax = await load(postcssOptions.syntax);
    } catch (error) {
      throw new Error(`Loading PostCSS "${postcssOptions.syntax}" syntax failed: ${
      /** @type {Error} */error.message}\n\n(@${name})`);
    }
  }
  if (sourceMap) {
    postcssOptions.map = {
      annotation: false
    };
  }

  /** @type {Postcss} */
  // eslint-disable-next-line global-require
  const postcss = require("postcss").default;
  // @ts-ignore
  // eslint-disable-next-line global-require
  const cssnano = require("cssnano");
  // @ts-ignore
  // Types are broken
  const result = await postcss([cssnano(minimizerOptions)]).process(code, postcssOptions);
  return {
    code: result.css,
    // @ts-ignore
    map: result.map ? result.map.toJSON() :
    // eslint-disable-next-line no-undefined
    undefined,
    warnings: result.warnings().map(String)
  };
}

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function cssoMinify(input, sourceMap, minimizerOptions) {
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
  const csso = require("csso");
  const [[filename, code]] = Object.entries(input);
  const result = csso.minify(code, {
    filename,
    sourceMap: Boolean(sourceMap),
    ...minimizerOptions
  });
  return {
    code: result.css,
    map: result.map ? /** @type {any & { toJSON(): RawSourceMap }} */
    result.map.toJSON() :
    // eslint-disable-next-line no-undefined
    undefined
  };
}

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function cleanCssMinify(input, sourceMap, minimizerOptions) {
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
  const CleanCSS = require("clean-css");
  const [[name, code]] = Object.entries(input);
  const result = await new CleanCSS({
    sourceMap: Boolean(sourceMap),
    ...minimizerOptions,
    returnPromise: true
  }).minify({
    [name]: {
      styles: code
    }
  });
  const generatedSourceMap = result.sourceMap && /** @type {any & { toJSON(): RawSourceMap }} */
  result.sourceMap.toJSON();

  // workaround for source maps on windows
  if (generatedSourceMap) {
    // eslint-disable-next-line global-require
    const isWindowsPathSep = require("path").sep === "\\";
    generatedSourceMap.sources = generatedSourceMap.sources.map(
    /**
     * @param {string} item
     * @returns {string}
     */
    item => isWindowsPathSep ? item.replace(/\\/g, "/") : item);
  }
  return {
    code: result.styles,
    map: generatedSourceMap,
    warnings: result.warnings
  };
}

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function esbuildMinify(input, sourceMap, minimizerOptions) {
  /**
   * @param {import("esbuild").TransformOptions} [esbuildOptions={}]
   * @returns {import("esbuild").TransformOptions}
   */
  const buildEsbuildOptions = (esbuildOptions = {}) => {
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      loader: "css",
      minify: true,
      legalComments: "inline",
      ...esbuildOptions,
      sourcemap: false
    };
  };

  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const esbuild = require("esbuild");

  // Copy `esbuild` options
  const esbuildOptions = buildEsbuildOptions(minimizerOptions);

  // Let `esbuild` generate a SourceMap
  if (sourceMap) {
    esbuildOptions.sourcemap = true;
    esbuildOptions.sourcesContent = false;
  }
  const [[filename, code]] = Object.entries(input);
  esbuildOptions.sourcefile = filename;
  const result = await esbuild.transform(code, esbuildOptions);
  return {
    code: result.code,
    // eslint-disable-next-line no-undefined
    map: result.map ? JSON.parse(result.map) : undefined,
    warnings: result.warnings.length > 0 ? result.warnings.map(item => {
      return {
        source: item.location && item.location.file,
        line: item.location && item.location.line ? item.location.line :
        // eslint-disable-next-line no-undefined
        undefined,
        column: item.location && item.location.column ? item.location.column :
        // eslint-disable-next-line no-undefined
        undefined,
        plugin: item.pluginName,
        message: `${item.text}${item.detail ? `\nDetails:\n${item.detail}` : ""}${item.notes.length > 0 ? `\n\nNotes:\n${item.notes.map(note => `${note.location ? `[${note.location.file}:${note.location.line}:${note.location.column}] ` : ""}${note.text}${note.location ? `\nSuggestion: ${note.location.suggestion}` : ""}${note.location ? `\nLine text:\n${note.location.lineText}\n` : ""}`).join("\n")}` : ""}`
      };
    }) : []
  };
}

// TODO remove in the next major release
/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function parcelCssMinify(input, sourceMap, minimizerOptions) {
  const [[filename, code]] = Object.entries(input);
  /**
   * @param {Partial<import("@parcel/css").TransformOptions<any>>} [parcelCssOptions={}]
   * @returns {import("@parcel/css").TransformOptions<any>}
   */
  const buildParcelCssOptions = (parcelCssOptions = {}) => {
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      minify: true,
      ...parcelCssOptions,
      sourceMap: false,
      filename,
      code: Buffer.from(code)
    };
  };

  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const parcelCss = require("@parcel/css");

  // Copy `parcel-css` options
  const parcelCssOptions = buildParcelCssOptions(minimizerOptions);

  // Let `esbuild` generate a SourceMap
  if (sourceMap) {
    parcelCssOptions.sourceMap = true;
  }
  const result = await parcelCss.transform(parcelCssOptions);
  return {
    code: result.code.toString(),
    // eslint-disable-next-line no-undefined
    map: result.map ? JSON.parse(result.map.toString()) : undefined
  };
}

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function lightningCssMinify(input, sourceMap, minimizerOptions) {
  const [[filename, code]] = Object.entries(input);
  /**
   * @param {Partial<import("lightningcss").TransformOptions<any>>} [lightningCssOptions={}]
   * @returns {import("lightningcss").TransformOptions<any>}
   */
  const buildLightningCssOptions = (lightningCssOptions = {}) => {
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      minify: true,
      ...lightningCssOptions,
      sourceMap: false,
      filename,
      code: Buffer.from(code)
    };
  };

  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const lightningCss = require("lightningcss");

  // Copy `lightningCss` options
  const lightningCssOptions = buildLightningCssOptions(minimizerOptions);

  // Let `esbuild` generate a SourceMap
  if (sourceMap) {
    lightningCssOptions.sourceMap = true;
  }
  const result = await lightningCss.transform(lightningCssOptions);
  return {
    code: result.code.toString(),
    // eslint-disable-next-line no-undefined
    map: result.map ? JSON.parse(result.map.toString()) : undefined
  };
}

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function swcMinify(input, sourceMap, minimizerOptions) {
  const [[filename, code]] = Object.entries(input);
  /**
   * @param {Partial<import("@swc/css").Options>} [swcOptions={}]
   * @returns {import("@swc/css").Options}
   */
  const buildSwcOptions = (swcOptions = {}) => {
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      ...swcOptions,
      filename
    };
  };

  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const swc = require("@swc/css");

  // Copy `swc` options
  const swcOptions = buildSwcOptions(minimizerOptions);

  // Let `swc` generate a SourceMap
  if (sourceMap) {
    swcOptions.sourceMap = true;
  }
  const result = await swc.minify(Buffer.from(code), swcOptions);
  return {
    code: result.code.toString(),
    // eslint-disable-next-line no-undefined
    map: result.map ? JSON.parse(result.map.toString()) : undefined,
    errors: result.errors ? result.errors.map(diagnostic => {
      const error = new Error(diagnostic.message);

      // @ts-ignore
      error.span = diagnostic.span;
      // @ts-ignore
      error.level = diagnostic.level;
      return error;
    }) :
    // eslint-disable-next-line no-undefined
    undefined
  };
}
module.exports = {
  throttleAll,
  cssnanoMinify,
  cssoMinify,
  cleanCssMinify,
  esbuildMinify,
  parcelCssMinify,
  lightningCssMinify,
  swcMinify
};