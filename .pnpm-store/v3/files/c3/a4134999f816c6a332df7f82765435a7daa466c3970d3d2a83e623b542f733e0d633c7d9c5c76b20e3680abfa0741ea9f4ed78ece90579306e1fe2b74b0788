"use strict";

const path = require("node:path");
const querystring = require("node:querystring");
// eslint-disable-next-line n/no-deprecated-api
const {
  parse
} = require("node:url");
const getPaths = require("./getPaths");
const memorize = require("./memorize");

/** @typedef {import("../index.js").IncomingMessage} IncomingMessage */
/** @typedef {import("../index.js").ServerResponse} ServerResponse */

/**
 * @param {string} input input
 * @returns {string} unescape input
 */
function decode(input) {
  return querystring.unescape(input);
}
const memoizedParse = memorize(parse, undefined, value => {
  if (value.pathname) {
    value.pathname = decode(value.pathname);
  }
  return value;
});
const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

/**
 * @typedef {object} Extra
 * @property {import("fs").Stats=} stats stats
 * @property {number=} errorCode error code
 * @property {boolean=} immutable true when immutable, otherwise false
 */

/**
 * decodeURIComponent.
 *
 * Allows V8 to only deoptimize this fn instead of all of send().
 * @param {string} input
 * @returns {string}
 */

// TODO refactor me in the next major release, this function should return `{ filename, stats, error }`
// TODO fix redirect logic when `/` at the end, like https://github.com/pillarjs/send/blob/master/index.js#L586
/**
 * @template {IncomingMessage} Request
 * @template {ServerResponse} Response
 * @param {import("../index.js").FilledContext<Request, Response>} context context
 * @param {string} url url
 * @param {Extra=} extra extra
 * @returns {string | undefined} filename
 */
function getFilenameFromUrl(context, url, extra = {}) {
  const {
    options
  } = context;
  const paths = getPaths(context);

  /** @type {string | undefined} */
  let foundFilename;
  /** @type {import("node:url").Url} */
  let urlObject;
  try {
    // The `url` property of the `request` is contains only  `pathname`, `search` and `hash`
    urlObject = memoizedParse(url, false, true);
  } catch {
    return;
  }
  for (const {
    publicPath,
    outputPath,
    assetsInfo
  } of paths) {
    /** @type {string | undefined} */
    let filename;
    /** @type {import("node:url").Url} */
    let publicPathObject;
    try {
      publicPathObject = memoizedParse(publicPath !== "auto" && publicPath ? publicPath : "/", false, true);
    } catch {
      continue;
    }
    const {
      pathname
    } = urlObject;
    const {
      pathname: publicPathPathname
    } = publicPathObject;
    if (pathname && publicPathPathname && pathname.startsWith(publicPathPathname)) {
      // Null byte(s)
      if (pathname.includes("\0")) {
        extra.errorCode = 400;
        return;
      }

      // ".." is malicious
      if (UP_PATH_REGEXP.test(path.normalize(`./${pathname}`))) {
        extra.errorCode = 403;
        return;
      }

      // Strip the `pathname` property from the `publicPath` option from the start of requested url
      // `/complex/foo.js` => `foo.js`
      // and add outputPath
      // `foo.js` => `/home/user/my-project/dist/foo.js`
      filename = path.join(outputPath, pathname.slice(publicPathPathname.length));
      try {
        extra.stats = context.outputFileSystem.statSync(filename);
      } catch {
        continue;
      }
      if (extra.stats.isFile()) {
        foundFilename = filename;

        // Rspack does not yet support `assetsInfo`, so we need to check if `assetsInfo` exists here
        if (assetsInfo) {
          const assetInfo = assetsInfo.get(pathname.slice(publicPathPathname.length));
          extra.immutable = assetInfo ? assetInfo.immutable : false;
        }
        break;
      } else if (extra.stats.isDirectory() && (typeof options.index === "undefined" || options.index)) {
        const indexValue = typeof options.index === "undefined" || typeof options.index === "boolean" ? "index.html" : options.index;
        filename = path.join(filename, indexValue);
        try {
          extra.stats = context.outputFileSystem.statSync(filename);
        } catch {
          continue;
        }
        if (extra.stats.isFile()) {
          foundFilename = filename;
          break;
        }
      }
    }
  }
  return foundFilename;
}
module.exports = getFilenameFromUrl;