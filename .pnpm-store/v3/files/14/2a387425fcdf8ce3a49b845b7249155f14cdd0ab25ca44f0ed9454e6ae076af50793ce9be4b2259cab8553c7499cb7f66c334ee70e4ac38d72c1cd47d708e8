/**
 * react-loadable-ssr-addon
 * @author Marcos Gonçalves <contact@themgoncalves.com>
 * @version 1.0.1
 */

import fs from 'fs';
import path from 'path';
import url from 'url';
import { getFileExtension, computeIntegrity, hasEntry } from './utils';

// Webpack plugin name
const PLUGIN_NAME = 'ReactLoadableSSRAddon';

const WEBPACK_VERSION = require('webpack/package.json').version;

const WEBPACK_5 = WEBPACK_VERSION.startsWith('5.');

// Default plugin options
const defaultOptions = {
  filename: 'assets-manifest.json',
  integrity: false,
  integrityAlgorithms: ['sha256', 'sha384', 'sha512'],
  integrityPropertyName: 'integrity',
};

/**
 * React Loadable SSR Add-on for Webpack
 * @class ReactLoadableSSRAddon
 * @desc Generate application assets manifest with its dependencies.
 */
class ReactLoadableSSRAddon {
  /**
   * @constructs ReactLoadableSSRAddon
   * @param options
   */
  constructor(options = defaultOptions) {
    this.options = { ...defaultOptions, ...options };
    this.compiler = null;
    this.stats = null;
    this.entrypoints = new Set();
    this.assetsByName = new Map();
    this.manifest = {};
  }

  /**
   * Check if request is from Dev Server
   * aka webpack-dev-server
   * @method isRequestFromDevServer
   * @returns {boolean} - True or False
   */
  get isRequestFromDevServer() {
    if (process.argv.some((arg) => arg.includes('webpack-dev-server'))) { return true; }

    const { outputFileSystem, outputFileSystem: { constructor: { name } } } = this.compiler;

    return outputFileSystem && name === 'MemoryFileSystem';
  }

  /**
   * Get assets manifest output path
   * @readonly
   * @method manifestOutputPath
   * @returns {string} - Output path containing path + filename.
   */
  get manifestOutputPath() {
    const { filename } = this.options;
    if (path.isAbsolute(filename)) {
      return filename;
    }

    const { outputPath, options: { devServer } } = this.compiler;

    if (this.isRequestFromDevServer && devServer) {
      let devOutputPath = (devServer.outputPath || outputPath || '/');

      if (devOutputPath === '/') {
        console.warn('Please use an absolute path in options.output when using webpack-dev-server.');
        devOutputPath = this.compiler.context || process.cwd();
      }

      return path.resolve(devOutputPath, filename);
    }

    return path.resolve(outputPath, filename);
  }

  /**
   * Get application assets chunks
   * @method getAssets
   * @param {array} assetsChunk - Webpack application chunks
   * @returns {Map<string, object>}
   */
  getAssets(assetsChunk) {
    for (let i = 0; i < assetsChunk.length; i += 1) {
      const chunk = assetsChunk[i];
      const {
        id, files, siblings = [], hash,
      } = chunk;

      const keys = this.getChunkOrigin(chunk);

      for (let j = 0; j < keys.length; j += 1) {
        this.assetsByName.set(keys[j], {
          id, files, hash, siblings,
        });
      }
    }

    return this.assetsByName;
  }

  /**
   * Get Application Entry points
   * @method getEntrypoints
   * @param {object} entrypoints - Webpack entry points
   * @returns {Set<string>} - Application Entry points
   */
  getEntrypoints(entrypoints) {
    const entry = Object.keys(entrypoints);
    for (let i = 0; i < entry.length; i += 1) {
      this.entrypoints.add(entry[i]);
    }

    return this.entrypoints;
  }

  /**
   * Get application chunk origin
   * @method getChunkOrigin
   * @param {object} id  - Webpack application chunk id
   * @param {object} names  - Webpack application chunk names
   * @param {object} modules  - Webpack application chunk modules
   * @returns {array} Chunk Keys
   */
  /* eslint-disable class-methods-use-this */
  getChunkOrigin({ id, names, modules }) {
    const origins = new Set();
    if (!WEBPACK_5) {
      // webpack 5 doesn't have 'reasons' on chunks any more
      // this is a dirty solution to make it work without throwing
      // an error, but does need tweaking to make everything work properly.
      for (let i = 0; i < modules.length; i += 1) {
        const { reasons } = modules[i];
        for (let j = 0; j < reasons.length; j += 1) {
          const reason = reasons[j];
          const type = reason.dependency ? reason.dependency.type : null;
          const userRequest = reason.dependency
            ? reason.dependency.userRequest
            : null;
          if (type === 'import()') {
            origins.add(userRequest);
          }
        }
      }
    }

    if (origins.size === 0) { return [names[0] || id]; }
    if (this.entrypoints.has(names[0])) {
      origins.add(names[0]);
    }

    return Array.from(origins);
  }
  /* eslint-enabled */

  /**
   * Webpack apply method.
   * @method apply
   * @param {object} compiler - Webpack compiler object
   * It represents the fully configured Webpack environment.
   * @See {@link https://webpack.js.org/concepts/plugins/#anatomy}
   */
  apply(compiler) {
    this.compiler = compiler;
    // @See {@Link https://webpack.js.org/api/compiler-hooks/}
    compiler.hooks.emit.tapAsync(PLUGIN_NAME, this.handleEmit.bind(this));
  }

  /**
   * Get Minimal Stats Chunks
   * @description equivalent of getting stats.chunks but much less in size & memory usage
   * It tries to mimic https://github.com/webpack/webpack/blob/webpack-4/lib/Stats.js#L632
   * implementation without expensive operations
   * @param {array} compilationChunks
   * @param {array} chunkGraph
   * @returns {array}
   */
  getMinimalStatsChunks(compilationChunks, chunkGraph) {
    const compareId = (a, b) => {
      if (typeof a !== typeof b) {
        return typeof a < typeof b ? -1 : 1;
      }
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    };

    return this.ensureArray(compilationChunks).reduce((chunks, chunk) => {
      const siblings = new Set();

      if (chunk.groupsIterable) {
        const chunkGroups = Array.from(chunk.groupsIterable);

        for (let i = 0; i < chunkGroups.length; i += 1) {
          const group = Array.from(chunkGroups[i].chunks);

          for (let j = 0; j < group.length; j += 1) {
            const sibling = group[j];
            if (sibling !== chunk) siblings.add(sibling.id);
          }
        }
      }

      chunk.ids.forEach((id) => {
        chunks.push({
          id,
          names: chunk.name ? [chunk.name] : [],
          files: this.ensureArray(chunk.files).slice(),
          hash: chunk.renderedHash,
          siblings: Array.from(siblings).sort(compareId),
          // Webpack5 emit deprecation warning for chunk.getModules()
          // "DEP_WEBPACK_CHUNK_GET_MODULES"
          modules: WEBPACK_5 ? chunkGraph.getChunkModules(chunk) : chunk.getModules(),
        });
      });

      return chunks;
    }, []);
  }

  /**
   * Handles emit event from Webpack
   * @desc The Webpack Compiler begins with emitting the generated assets.
   * Here plugins have the last chance to add assets to the `c.assets` array.
   * @See {@Link https://github.com/webpack/docs/wiki/plugins#emitc-compilation-async}
   * @method handleEmit
   * @param {object} compilation
   * @param {function} callback
   */
  handleEmit(compilation, callback) {
    this.stats = compilation.getStats().toJson({
      all: false,
      entrypoints: true,
    }, true);
    this.options.publicPath = (compilation.outputOptions
      ? compilation.outputOptions.publicPath
      : compilation.options.output.publicPath)
      || '';
    this.getEntrypoints(this.stats.entrypoints);

    this.getAssets(this.getMinimalStatsChunks(compilation.chunks, compilation.chunkGraph));
    this.processAssets(compilation.assets);
    this.writeAssetsFile();

    callback();
  }

  /**
   * Process Application Assets Manifest
   * @method processAssets
   * @param {object} originAssets - Webpack raw compilations assets
   */
  /* eslint-disable object-curly-newline, no-restricted-syntax */
  processAssets(originAssets) {
    const assets = {};
    const origins = {};
    const { entrypoints } = this;

    this.assetsByName.forEach((value, key) => {
      const { files, id, siblings, hash } = value;

      if (!origins[key]) { origins[key] = []; }

      siblings.push(id);

      for (let i = 0; i < siblings.length; i += 1) {
        const sibling = siblings[i];
        if (!origins[key].includes(sibling)) {
          origins[key].push(sibling);
        }
      }

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const currentAsset = originAssets[file] || {};
        const ext = getFileExtension(file).replace(/^\.+/, '').toLowerCase();

        if (!assets[id]) { assets[id] = {}; }
        if (!assets[id][ext]) { assets[id][ext] = []; }

        if (!hasEntry(assets[id][ext], 'file', file)) {
          const shouldComputeIntegrity = Object.keys(currentAsset)
            && this.options.integrity
            && !currentAsset[this.options.integrityPropertyName];

          if (shouldComputeIntegrity) {
            currentAsset[this.options.integrityPropertyName] = computeIntegrity(
              this.options.integrityAlgorithms,
              currentAsset.source(),
            );
          }

          assets[id][ext].push({
            file,
            hash,
            publicPath: url.resolve(this.options.publicPath || '', file),
            integrity: currentAsset[this.options.integrityPropertyName],
          });
        }
      }
    });

    // create assets manifest object
    this.manifest = {
      entrypoints: Array.from(entrypoints),
      origins,
      assets,
    };
  }

  /**
   * Write Assets Manifest file
   * @method writeAssetsFile
   */
  writeAssetsFile() {
    const filePath = this.manifestOutputPath;
    const fileDir = path.dirname(filePath);
    const json = JSON.stringify(this.manifest, null, 2);
    try {
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir);
      }
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    fs.writeFileSync(filePath, json);
  }

  /**
   * Ensure that given source is an array (webpack 5 switches a lot of Arrays to Sets)
   * @method ensureArray
   * @function
   * @param {*[]|Set<any>} source
   * @returns {*[]}
   */
  ensureArray(source) {
    if (WEBPACK_5) {
      return Array.from(source);
    }
    return source;
  }
}

export { defaultOptions };
export default ReactLoadableSSRAddon;
