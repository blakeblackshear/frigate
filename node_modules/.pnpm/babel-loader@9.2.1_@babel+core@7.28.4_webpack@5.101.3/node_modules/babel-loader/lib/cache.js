/**
 * Filesystem Cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const {
  promisify
} = require("util");
const {
  readFile,
  writeFile,
  mkdir
} = require("fs/promises");
const findCacheDirP = import("find-cache-dir");
const transform = require("./transform");
// Lazily instantiated when needed
let defaultCacheDirectory = null;
let hashType = "sha256";
// use md5 hashing if sha256 is not available
try {
  crypto.createHash(hashType);
} catch {
  hashType = "md5";
}
const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

/**
 * Read the contents from the compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 */
const read = async function (filename, compress) {
  const data = await readFile(filename + (compress ? ".gz" : ""));
  const content = compress ? await gunzip(data) : data;
  return JSON.parse(content.toString());
};

/**
 * Write contents into a compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 * @params {String} result
 */
const write = async function (filename, compress, result) {
  const content = JSON.stringify(result);
  const data = compress ? await gzip(content) : content;
  return await writeFile(filename + (compress ? ".gz" : ""), data);
};

/**
 * Build the filename for the cached file
 *
 * @params {String} source  File source code
 * @params {Object} options Options used
 *
 * @return {String}
 */
const filename = function (source, identifier, options) {
  const hash = crypto.createHash(hashType);
  const contents = JSON.stringify({
    source,
    options,
    identifier
  });
  hash.update(contents);
  return hash.digest("hex") + ".json";
};

/**
 * Handle the cache
 *
 * @params {String} directory
 * @params {Object} params
 */
const handleCache = async function (directory, params) {
  const {
    source,
    options = {},
    cacheIdentifier,
    cacheDirectory,
    cacheCompression,
    logger
  } = params;
  const file = path.join(directory, filename(source, cacheIdentifier, options));
  try {
    // No errors mean that the file was previously cached
    // we just need to return it
    logger.debug(`reading cache file '${file}'`);
    return await read(file, cacheCompression);
  } catch {
    // conitnue if cache can't be read
    logger.debug(`discarded cache as it can not be read`);
  }
  const fallback = typeof cacheDirectory !== "string" && directory !== os.tmpdir();

  // Make sure the directory exists.
  try {
    // overwrite directory if exists
    logger.debug(`creating cache folder '${directory}'`);
    await mkdir(directory, {
      recursive: true
    });
  } catch (err) {
    if (fallback) {
      return handleCache(os.tmpdir(), params);
    }
    throw err;
  }

  // Otherwise just transform the file
  // return it to the user asap and write it in cache
  logger.debug(`applying Babel transform`);
  const result = await transform(source, options);

  // Do not cache if there are external dependencies,
  // since they might change and we cannot control it.
  if (!result.externalDependencies.length) {
    try {
      logger.debug(`writing result to cache file '${file}'`);
      await write(file, cacheCompression, result);
    } catch (err) {
      if (fallback) {
        // Fallback to tmpdir if node_modules folder not writable
        return handleCache(os.tmpdir(), params);
      }
      throw err;
    }
  }
  return result;
};

/**
 * Retrieve file from cache, or create a new one for future reads
 *
 * @async
 * @param  {Object}   params
 * @param  {String}   params.cacheDirectory   Directory to store cached files
 * @param  {String}   params.cacheIdentifier  Unique identifier to bust cache
 * @param  {Boolean}  params.cacheCompression Whether compressing cached files
 * @param  {String}   params.source   Original contents of the file to be cached
 * @param  {Object}   params.options  Options to be given to the transform fn
 *
 * @example
 *
 *   const result = await cache({
 *     cacheDirectory: '.tmp/cache',
 *     cacheIdentifier: 'babel-loader-cachefile',
 *     cacheCompression: false,
 *     source: *source code from file*,
 *     options: {
 *       experimental: true,
 *       runtime: true
 *     },
 *   });
 */

module.exports = async function (params) {
  let directory;
  if (typeof params.cacheDirectory === "string") {
    directory = params.cacheDirectory;
  } else {
    if (defaultCacheDirectory === null) {
      const {
        default: findCacheDir
      } = await findCacheDirP;
      defaultCacheDirectory = findCacheDir({
        name: "babel-loader"
      }) || os.tmpdir();
    }
    directory = defaultCacheDirectory;
  }
  return await handleCache(directory, params);
};