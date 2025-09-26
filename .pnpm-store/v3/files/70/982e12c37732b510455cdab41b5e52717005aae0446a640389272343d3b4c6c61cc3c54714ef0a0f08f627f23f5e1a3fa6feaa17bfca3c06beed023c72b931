"use strict";

const path = require("path");

const {
  validate
} = require("schema-utils");

const serialize = require("serialize-javascript");

const normalizePath = require("normalize-path");

const globParent = require("glob-parent");

const fastGlob = require("fast-glob"); // @ts-ignore


const {
  version
} = require("../package.json");

const schema = require("./options.json");

const {
  readFile,
  stat,
  throttleAll
} = require("./utils");

const template = /\[\\*([\w:]+)\\*\]/i;
/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */

/** @typedef {import("webpack").Compiler} Compiler */

/** @typedef {import("webpack").Compilation} Compilation */

/** @typedef {import("webpack").WebpackError} WebpackError */

/** @typedef {import("webpack").Asset} Asset */

/** @typedef {import("globby").Options} GlobbyOptions */

/** @typedef {import("globby").GlobEntry} GlobEntry */

/** @typedef {ReturnType<Compilation["getLogger"]>} WebpackLogger */

/** @typedef {ReturnType<Compilation["getCache"]>} CacheFacade */

/** @typedef {ReturnType<ReturnType<Compilation["getCache"]>["getLazyHashedEtag"]>} Etag */

/** @typedef {ReturnType<Compilation["fileSystemInfo"]["mergeSnapshots"]>} Snapshot */

/**
 * @typedef {boolean} Force
 */

/**
 * @typedef {Object} CopiedResult
 * @property {string} sourceFilename
 * @property {string} absoluteFilename
 * @property {string} filename
 * @property {Asset["source"]} source
 * @property {Force | undefined} force
 * @property {Record<string, any>} info
 */

/**
 * @typedef {string} StringPattern
 */

/**
 * @typedef {boolean} NoErrorOnMissing
 */

/**
 * @typedef {string} Context
 */

/**
 * @typedef {string} From
 */

/**
 * @callback ToFunction
 * @param {{ context: string, absoluteFilename?: string }} pathData
 * @return {string | Promise<string>}
 */

/**
 * @typedef {string | ToFunction} To
 */

/**
 * @typedef {"dir" | "file" | "template"} ToType
 */

/**
 * @callback TransformerFunction
 * @param {Buffer} input
 * @param {string} absoluteFilename
 * @returns {string | Buffer | Promise<string> | Promise<Buffer>}
 */

/**
 * @typedef {{ keys: { [key: string]: any } } | { keys: ((defaultCacheKeys: { [key: string]: any }, absoluteFilename: string) => Promise<{ [key: string]: any }>) }} TransformerCacheObject
 */

/**
 * @typedef {Object} TransformerObject
 * @property {TransformerFunction} transformer
 * @property {boolean | TransformerCacheObject} [cache]
 */

/**
 * @typedef {TransformerFunction | TransformerObject} Transform
 */

/**
 * @callback Filter
 * @param {string} filepath
 * @returns {boolean | Promise<boolean>}
 */

/**
 * @callback TransformAllFunction
 * @param {{ data: Buffer, sourceFilename: string, absoluteFilename: string }[]} data
 * @returns {string | Buffer | Promise<string> | Promise<Buffer>}
 */

/**
 * @typedef { Record<string, any> | ((item: { absoluteFilename: string, sourceFilename: string, filename: string, toType: ToType }) => Record<string, any>) } Info
 */

/**
 * @typedef {Object} ObjectPattern
 * @property {From} from
 * @property {GlobbyOptions} [globOptions]
 * @property {Context} [context]
 * @property {To} [to]
 * @property {ToType} [toType]
 * @property {Info} [info]
 * @property {Filter} [filter]
 * @property {Transform} [transform]
 * @property {TransformAllFunction} [transformAll]
 * @property {Force} [force]
 * @property {number} [priority]
 * @property {NoErrorOnMissing} [noErrorOnMissing]
 */

/**
 * @typedef {StringPattern | ObjectPattern} Pattern
 */

/**
 * @typedef {Object} AdditionalOptions
 * @property {number} [concurrency]
 */

/**
 * @typedef {Object} PluginOptions
 * @property {Pattern[]} patterns
 * @property {AdditionalOptions} [options]
 */

class CopyPlugin {
  /**
   * @param {PluginOptions} [options]
   */
  constructor(options = {
    patterns: []
  }) {
    validate(
    /** @type {Schema} */
    schema, options, {
      name: "Copy Plugin",
      baseDataPath: "options"
    });
    /**
     * @private
     * @type {Pattern[]}
     */

    this.patterns = options.patterns;
    /**
     * @private
     * @type {AdditionalOptions}
     */

    this.options = options.options || {};
  }
  /**
   * @private
   * @param {Compilation} compilation
   * @param {number} startTime
   * @param {string} dependency
   * @returns {Promise<Snapshot | undefined>}
   */


  static async createSnapshot(compilation, startTime, dependency) {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      compilation.fileSystemInfo.createSnapshot(startTime, [dependency], // @ts-ignore
      // eslint-disable-next-line no-undefined
      undefined, // eslint-disable-next-line no-undefined
      undefined, null, (error, snapshot) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(
        /** @type {Snapshot} */
        snapshot);
      });
    });
  }
  /**
   * @private
   * @param {Compilation} compilation
   * @param {Snapshot} snapshot
   * @returns {Promise<boolean | undefined>}
   */


  static async checkSnapshotValid(compilation, snapshot) {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      compilation.fileSystemInfo.checkSnapshotValid(snapshot, (error, isValid) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(isValid);
      });
    });
  }
  /**
   * @private
   * @param {Compiler} compiler
   * @param {Compilation} compilation
   * @param {Buffer} source
   * @returns {string}
   */


  static getContentHash(compiler, compilation, source) {
    const {
      outputOptions
    } = compilation;
    const {
      hashDigest,
      hashDigestLength,
      hashFunction,
      hashSalt
    } = outputOptions;
    const hash = compiler.webpack.util.createHash(
    /** @type {string} */
    hashFunction);

    if (hashSalt) {
      hash.update(hashSalt);
    }

    hash.update(source);
    const fullContentHash = hash.digest(hashDigest);
    return fullContentHash.toString().slice(0, hashDigestLength);
  }
  /**
   * @private
   * @param {typeof import("globby").globby} globby
   * @param {Compiler} compiler
   * @param {Compilation} compilation
   * @param {WebpackLogger} logger
   * @param {CacheFacade} cache
   * @param {ObjectPattern & { context: string }} inputPattern
   * @param {number} index
   * @returns {Promise<Array<CopiedResult | undefined> | undefined>}
   */


  static async runPattern(globby, compiler, compilation, logger, cache, inputPattern, index) {
    const {
      RawSource
    } = compiler.webpack.sources;
    const pattern = { ...inputPattern
    };
    const originalFrom = pattern.from;
    const normalizedOriginalFrom = path.normalize(originalFrom);
    logger.log(`starting to process a pattern from '${normalizedOriginalFrom}' using '${pattern.context}' context`);
    let absoluteFrom;

    if (path.isAbsolute(normalizedOriginalFrom)) {
      absoluteFrom = normalizedOriginalFrom;
    } else {
      absoluteFrom = path.resolve(pattern.context, normalizedOriginalFrom);
    }

    logger.debug(`getting stats for '${absoluteFrom}'...`);
    const {
      inputFileSystem
    } = compiler;
    let stats;

    try {
      stats = await stat(inputFileSystem, absoluteFrom);
    } catch (error) {// Nothing
    }
    /**
     * @type {"file" | "dir" | "glob"}
     */


    let fromType;

    if (stats) {
      if (stats.isDirectory()) {
        fromType = "dir";
        logger.debug(`determined '${absoluteFrom}' is a directory`);
      } else if (stats.isFile()) {
        fromType = "file";
        logger.debug(`determined '${absoluteFrom}' is a file`);
      } else {
        // Fallback
        fromType = "glob";
        logger.debug(`determined '${absoluteFrom}' is unknown`);
      }
    } else {
      fromType = "glob";
      logger.debug(`determined '${absoluteFrom}' is a glob`);
    }
    /** @type {GlobbyOptions & { objectMode: true }} */


    const globOptions = { ...{
        followSymbolicLinks: true
      },
      ...(pattern.globOptions || {}),
      ...{
        cwd: pattern.context,
        objectMode: true
      }
    }; // @ts-ignore

    globOptions.fs = inputFileSystem;
    let glob;

    switch (fromType) {
      case "dir":
        compilation.contextDependencies.add(absoluteFrom);
        logger.debug(`added '${absoluteFrom}' as a context dependency`);
        pattern.context = absoluteFrom;
        glob = path.posix.join(fastGlob.escapePath(normalizePath(path.resolve(absoluteFrom))), "**/*");
        absoluteFrom = path.join(absoluteFrom, "**/*");

        if (typeof globOptions.dot === "undefined") {
          globOptions.dot = true;
        }

        break;

      case "file":
        compilation.fileDependencies.add(absoluteFrom);
        logger.debug(`added '${absoluteFrom}' as a file dependency`);
        pattern.context = path.dirname(absoluteFrom);
        glob = fastGlob.escapePath(normalizePath(path.resolve(absoluteFrom)));

        if (typeof globOptions.dot === "undefined") {
          globOptions.dot = true;
        }

        break;

      case "glob":
      default:
        {
          const contextDependencies = path.normalize(globParent(absoluteFrom));
          compilation.contextDependencies.add(contextDependencies);
          logger.debug(`added '${contextDependencies}' as a context dependency`);
          glob = path.isAbsolute(originalFrom) ? originalFrom : path.posix.join(fastGlob.escapePath(normalizePath(path.resolve(pattern.context))), originalFrom);
        }
    }

    logger.log(`begin globbing '${glob}'...`);
    /**
     * @type {GlobEntry[]}
     */

    let globEntries;

    try {
      globEntries = await globby(glob, globOptions);
    } catch (error) {
      compilation.errors.push(
      /** @type {WebpackError} */
      error);
      return;
    }

    if (globEntries.length === 0) {
      if (pattern.noErrorOnMissing) {
        logger.log(`finished to process a pattern from '${normalizedOriginalFrom}' using '${pattern.context}' context to '${pattern.to}'`);
        return;
      }

      const missingError = new Error(`unable to locate '${glob}' glob`);
      compilation.errors.push(
      /** @type {WebpackError} */
      missingError);
      return;
    }
    /**
     * @type {Array<CopiedResult | undefined>}
     */


    let copiedResult;

    try {
      copiedResult = await Promise.all(globEntries.map(
      /**
       * @param {GlobEntry} globEntry
       * @returns {Promise<CopiedResult | undefined>}
       */
      async globEntry => {
        // Exclude directories
        if (!globEntry.dirent.isFile()) {
          return;
        }

        if (pattern.filter) {
          let isFiltered;

          try {
            isFiltered = await pattern.filter(globEntry.path);
          } catch (error) {
            compilation.errors.push(
            /** @type {WebpackError} */
            error);
            return;
          }

          if (!isFiltered) {
            logger.log(`skip '${globEntry.path}', because it was filtered`);
            return;
          }
        }

        const from = globEntry.path;
        logger.debug(`found '${from}'`); // `globby`/`fast-glob` return the relative path when the path contains special characters on windows

        const absoluteFilename = path.resolve(pattern.context, from);
        const to = typeof pattern.to === "function" ? await pattern.to({
          context: pattern.context,
          absoluteFilename
        }) : path.normalize(typeof pattern.to !== "undefined" ? pattern.to : "");
        const toType = pattern.toType ? pattern.toType : template.test(to) ? "template" : path.extname(to) === "" || to.slice(-1) === path.sep ? "dir" : "file";
        logger.log(`'to' option '${to}' determinated as '${toType}'`);
        const relativeFrom = path.relative(pattern.context, absoluteFilename);
        let filename = toType === "dir" ? path.join(to, relativeFrom) : to;

        if (path.isAbsolute(filename)) {
          filename = path.relative(
          /** @type {string} */
          compiler.options.output.path, filename);
        }

        logger.log(`determined that '${from}' should write to '${filename}'`);
        const sourceFilename = normalizePath(path.relative(compiler.context, absoluteFilename)); // If this came from a glob or dir, add it to the file dependencies

        if (fromType === "dir" || fromType === "glob") {
          compilation.fileDependencies.add(absoluteFilename);
          logger.debug(`added '${absoluteFilename}' as a file dependency`);
        }

        let cacheEntry;
        logger.debug(`getting cache for '${absoluteFilename}'...`);

        try {
          cacheEntry = await cache.getPromise(`${sourceFilename}|${index}`, null);
        } catch (error) {
          compilation.errors.push(
          /** @type {WebpackError} */
          error);
          return;
        }
        /**
         * @type {Asset["source"] | undefined}
         */


        let source;

        if (cacheEntry) {
          logger.debug(`found cache for '${absoluteFilename}'...`);
          let isValidSnapshot;
          logger.debug(`checking snapshot on valid for '${absoluteFilename}'...`);

          try {
            isValidSnapshot = await CopyPlugin.checkSnapshotValid(compilation, cacheEntry.snapshot);
          } catch (error) {
            compilation.errors.push(
            /** @type {WebpackError} */
            error);
            return;
          }

          if (isValidSnapshot) {
            logger.debug(`snapshot for '${absoluteFilename}' is valid`);
            ({
              source
            } = cacheEntry);
          } else {
            logger.debug(`snapshot for '${absoluteFilename}' is invalid`);
          }
        } else {
          logger.debug(`missed cache for '${absoluteFilename}'`);
        }

        if (!source) {
          const startTime = Date.now();
          logger.debug(`reading '${absoluteFilename}'...`);
          let data;

          try {
            data = await readFile(inputFileSystem, absoluteFilename);
          } catch (error) {
            compilation.errors.push(
            /** @type {WebpackError} */
            error);
            return;
          }

          logger.debug(`read '${absoluteFilename}'`);
          source = new RawSource(data);
          let snapshot;
          logger.debug(`creating snapshot for '${absoluteFilename}'...`);

          try {
            snapshot = await CopyPlugin.createSnapshot(compilation, startTime, absoluteFilename);
          } catch (error) {
            compilation.errors.push(
            /** @type {WebpackError} */
            error);
            return;
          }

          if (snapshot) {
            logger.debug(`created snapshot for '${absoluteFilename}'`);
            logger.debug(`storing cache for '${absoluteFilename}'...`);

            try {
              await cache.storePromise(`${sourceFilename}|${index}`, null, {
                source,
                snapshot
              });
            } catch (error) {
              compilation.errors.push(
              /** @type {WebpackError} */
              error);
              return;
            }

            logger.debug(`stored cache for '${absoluteFilename}'`);
          }
        }

        if (pattern.transform) {
          /**
           * @type {TransformerObject}
           */
          const transformObj = typeof pattern.transform === "function" ? {
            transformer: pattern.transform
          } : pattern.transform;

          if (transformObj.transformer) {
            logger.log(`transforming content for '${absoluteFilename}'...`);
            const buffer = source.buffer();

            if (transformObj.cache) {
              // TODO: remove in the next major release
              const hasher = compiler.webpack && compiler.webpack.util && compiler.webpack.util.createHash ? compiler.webpack.util.createHash("xxhash64") : // eslint-disable-next-line global-require
              require("crypto").createHash("md4");
              const defaultCacheKeys = {
                version,
                sourceFilename,
                transform: transformObj.transformer,
                contentHash: hasher.update(buffer).digest("hex"),
                index
              };
              const cacheKeys = `transform|${serialize(typeof transformObj.cache === "boolean" ? defaultCacheKeys : typeof transformObj.cache.keys === "function" ? await transformObj.cache.keys(defaultCacheKeys, absoluteFilename) : { ...defaultCacheKeys,
                ...transformObj.cache.keys
              })}`;
              logger.debug(`getting transformation cache for '${absoluteFilename}'...`);
              const cacheItem = cache.getItemCache(cacheKeys, cache.getLazyHashedEtag(source));
              source = await cacheItem.getPromise();
              logger.debug(source ? `found transformation cache for '${absoluteFilename}'` : `no transformation cache for '${absoluteFilename}'`);

              if (!source) {
                const transformed = await transformObj.transformer(buffer, absoluteFilename);
                source = new RawSource(transformed);
                logger.debug(`caching transformation for '${absoluteFilename}'...`);
                await cacheItem.storePromise(source);
                logger.debug(`cached transformation for '${absoluteFilename}'`);
              }
            } else {
              source = new RawSource(await transformObj.transformer(buffer, absoluteFilename));
            }
          }
        }

        let info = typeof pattern.info === "undefined" ? {} : typeof pattern.info === "function" ? pattern.info({
          absoluteFilename,
          sourceFilename,
          filename,
          toType
        }) || {} : pattern.info || {};

        if (toType === "template") {
          logger.log(`interpolating template '${filename}' for '${sourceFilename}'...`);
          const contentHash = CopyPlugin.getContentHash(compiler, compilation, source.buffer());
          const ext = path.extname(sourceFilename);
          const base = path.basename(sourceFilename);
          const name = base.slice(0, base.length - ext.length);
          const data = {
            filename: normalizePath(path.relative(pattern.context, absoluteFilename)),
            contentHash,
            chunk: {
              name,
              id:
              /** @type {string} */
              sourceFilename,
              hash: contentHash
            }
          };
          const {
            path: interpolatedFilename,
            info: assetInfo
          } = compilation.getPathWithInfo(normalizePath(filename), data);
          info = { ...info,
            ...assetInfo
          };
          filename = interpolatedFilename;
          logger.log(`interpolated template '${filename}' for '${sourceFilename}'`);
        } else {
          filename = normalizePath(filename);
        } // eslint-disable-next-line consistent-return


        return {
          sourceFilename,
          absoluteFilename,
          filename,
          source,
          info,
          force: pattern.force
        };
      }));
    } catch (error) {
      compilation.errors.push(
      /** @type {WebpackError} */
      error);
      return;
    }

    if (copiedResult.length === 0) {
      if (pattern.noErrorOnMissing) {
        logger.log(`finished to process a pattern from '${normalizedOriginalFrom}' using '${pattern.context}' context to '${pattern.to}'`);
        return;
      }

      const missingError = new Error(`unable to locate '${glob}' glob after filtering paths`);
      compilation.errors.push(
      /** @type {WebpackError} */
      missingError);
      return;
    }

    logger.log(`finished to process a pattern from '${normalizedOriginalFrom}' using '${pattern.context}' context`); // eslint-disable-next-line consistent-return

    return copiedResult;
  }
  /**
   * @param {Compiler} compiler
   */


  apply(compiler) {
    const pluginName = this.constructor.name;
    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
      const logger = compilation.getLogger("copy-webpack-plugin");
      const cache = compilation.getCache("CopyWebpackPlugin");
      /**
       * @type {typeof import("globby").globby}
       */

      let globby;
      compilation.hooks.processAssets.tapAsync({
        name: "copy-webpack-plugin",
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
      }, async (unusedAssets, callback) => {
        if (typeof globby === "undefined") {
          try {
            // @ts-ignore
            ({
              globby
            } = await import("globby"));
          } catch (error) {
            callback(
            /** @type {Error} */
            error);
            return;
          }
        }

        logger.log("starting to add additional assets...");
        const copiedResultMap = new Map();
        /**
         * @type {(() => Promise<void>)[]}
         */

        const scheduledTasks = [];
        this.patterns.map(
        /**
         * @param {Pattern} item
         * @param {number} index
         * @return {number}
         */
        (item, index) => scheduledTasks.push(async () => {
          /**
           * @type {ObjectPattern}
           */
          const normalizedPattern = typeof item === "string" ? {
            from: item
          } : { ...item
          };
          const context = typeof normalizedPattern.context === "undefined" ? compiler.context : path.isAbsolute(normalizedPattern.context) ? normalizedPattern.context : path.join(compiler.context, normalizedPattern.context);
          normalizedPattern.context = context;
          /**
           * @type {Array<CopiedResult | undefined> | undefined}
           */

          let copiedResult;

          try {
            copiedResult = await CopyPlugin.runPattern(globby, compiler, compilation, logger, cache,
            /** @type {ObjectPattern & { context: string }} */
            normalizedPattern, index);
          } catch (error) {
            compilation.errors.push(
            /** @type {WebpackError} */
            error);
            return;
          }

          if (!copiedResult) {
            return;
          }
          /**
           * @type {Array<CopiedResult>}
           */


          let filteredCopiedResult = copiedResult.filter(
          /**
           * @param {CopiedResult | undefined} result
           * @returns {result is CopiedResult}
           */
          result => Boolean(result));

          if (typeof normalizedPattern.transformAll !== "undefined") {
            if (typeof normalizedPattern.to === "undefined") {
              compilation.errors.push(
              /** @type {WebpackError} */
              new Error(`Invalid "pattern.to" for the "pattern.from": "${normalizedPattern.from}" and "pattern.transformAll" function. The "to" option must be specified.`));
              return;
            }

            filteredCopiedResult.sort((a, b) => a.absoluteFilename > b.absoluteFilename ? 1 : a.absoluteFilename < b.absoluteFilename ? -1 : 0);
            const mergedEtag = filteredCopiedResult.length === 1 ? cache.getLazyHashedEtag(filteredCopiedResult[0].source) : filteredCopiedResult.reduce(
            /**
             * @param {Etag} accumulator
             * @param {CopiedResult} asset
             * @param {number} i
             * @return {Etag}
             */
            // @ts-ignore
            (accumulator, asset, i) => {
              // eslint-disable-next-line no-param-reassign
              accumulator = cache.mergeEtags(i === 1 ? cache.getLazyHashedEtag(
              /** @type {CopiedResult}*/
              accumulator.source) : accumulator, cache.getLazyHashedEtag(asset.source));
              return accumulator;
            });
            const cacheItem = cache.getItemCache(`transformAll|${serialize({
              version,
              from: normalizedPattern.from,
              to: normalizedPattern.to,
              transformAll: normalizedPattern.transformAll
            })}`, mergedEtag);
            let transformedAsset = await cacheItem.getPromise();

            if (!transformedAsset) {
              transformedAsset = {
                filename: normalizedPattern.to
              };

              try {
                transformedAsset.data = await normalizedPattern.transformAll(filteredCopiedResult.map(asset => {
                  return {
                    data: asset.source.buffer(),
                    sourceFilename: asset.sourceFilename,
                    absoluteFilename: asset.absoluteFilename
                  };
                }));
              } catch (error) {
                compilation.errors.push(
                /** @type {WebpackError} */
                error);
                return;
              }

              const filename = typeof normalizedPattern.to === "function" ? await normalizedPattern.to({
                context
              }) : normalizedPattern.to;

              if (template.test(filename)) {
                const contentHash = CopyPlugin.getContentHash(compiler, compilation, transformedAsset.data);
                const {
                  path: interpolatedFilename,
                  info: assetInfo
                } = compilation.getPathWithInfo(normalizePath(filename), {
                  contentHash,
                  chunk: {
                    id: "unknown-copied-asset",
                    hash: contentHash
                  }
                });
                transformedAsset.filename = interpolatedFilename;
                transformedAsset.info = assetInfo;
              }

              const {
                RawSource
              } = compiler.webpack.sources;
              transformedAsset.source = new RawSource(transformedAsset.data);
              transformedAsset.force = normalizedPattern.force;
              await cacheItem.storePromise(transformedAsset);
            }

            filteredCopiedResult = [transformedAsset];
          }

          const priority = normalizedPattern.priority || 0;

          if (!copiedResultMap.has(priority)) {
            copiedResultMap.set(priority, []);
          }

          copiedResultMap.get(priority).push(...filteredCopiedResult);
        }));
        await throttleAll(this.options.concurrency || 100, scheduledTasks);
        const copiedResult = [...copiedResultMap.entries()].sort((a, b) => a[0] - b[0]); // Avoid writing assets inside `p-limit`, because it creates concurrency.
        // It could potentially lead to an error - 'Multiple assets emit different content to the same filename'

        copiedResult.reduce((acc, val) => acc.concat(val[1]), []).filter(Boolean).forEach(
        /**
         * @param {CopiedResult} result
         * @returns {void}
         */
        result => {
          const {
            absoluteFilename,
            sourceFilename,
            filename,
            source,
            force
          } = result;
          const existingAsset = compilation.getAsset(filename);

          if (existingAsset) {
            if (force) {
              const info = {
                copied: true,
                sourceFilename
              };
              logger.log(`force updating '${filename}' from '${absoluteFilename}' to compilation assets, because it already exists...`);
              compilation.updateAsset(filename, source, { ...info,
                ...result.info
              });
              logger.log(`force updated '${filename}' from '${absoluteFilename}' to compilation assets, because it already exists`);
              return;
            }

            logger.log(`skip adding '${filename}' from '${absoluteFilename}' to compilation assets, because it already exists`);
            return;
          }

          const info = {
            copied: true,
            sourceFilename
          };
          logger.log(`writing '${filename}' from '${absoluteFilename}' to compilation assets...`);
          compilation.emitAsset(filename, source, { ...info,
            ...result.info
          });
          logger.log(`written '${filename}' from '${absoluteFilename}' to compilation assets`);
        });
        logger.log("finished to adding additional assets");
        callback();
      });

      if (compilation.hooks.statsPrinter) {
        compilation.hooks.statsPrinter.tap(pluginName, stats => {
          stats.hooks.print.for("asset.info.copied").tap("copy-webpack-plugin", (copied, {
            green,
            formatFlag
          }) => copied ?
          /** @type {Function} */
          green(
          /** @type {Function} */
          formatFlag("copied")) : "");
        });
      }
    });
  }

}

module.exports = CopyPlugin;