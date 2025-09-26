"use strict";

const path = require("node:path");
const mime = require("mime-types");
const onFinishedStream = require("on-finished");
const {
  createReadStreamOrReadFileSync,
  finish,
  getHeadersSent,
  getOutgoing,
  getRequestHeader,
  getRequestMethod,
  getRequestURL,
  getResponseHeader,
  getResponseHeaders,
  getStatusCode,
  initState,
  pipe,
  removeResponseHeader,
  send,
  setResponseHeader,
  setState,
  setStatusCode
} = require("./utils/compatibleAPI");
const getFilenameFromUrl = require("./utils/getFilenameFromUrl");
const memorize = require("./utils/memorize");
const ready = require("./utils/ready");

/** @typedef {import("./index.js").NextFunction} NextFunction */
/** @typedef {import("./index.js").IncomingMessage} IncomingMessage */
/** @typedef {import("./index.js").ServerResponse} ServerResponse */
/** @typedef {import("./index.js").NormalizedHeaders} NormalizedHeaders */
/** @typedef {import("fs").ReadStream} ReadStream */

const BYTES_RANGE_REGEXP = /^ *bytes/i;

/**
 * @param {"bytes"} type type
 * @param {number} size size
 * @param {import("range-parser").Range=} range range
 * @returns {string} value of content range header
 */
function getValueContentRangeHeader(type, size, range) {
  return `${type} ${range ? `${range.start}-${range.end}` : "*"}/${size}`;
}

/**
 * Parse an HTTP Date into a number.
 * @param {string} date date
 * @returns {number} timestamp
 */
function parseHttpDate(date) {
  const timestamp = date && Date.parse(date);

  // istanbul ignore next: guard against date.js Date.parse patching
  return typeof timestamp === "number" ? timestamp : Number.NaN;
}
const CACHE_CONTROL_NO_CACHE_REGEXP = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;

/**
 * @param {import("fs").ReadStream} stream stream
 * @param {boolean} suppress do need suppress?
 * @returns {void}
 */
function destroyStream(stream, suppress) {
  if (typeof stream.destroy === "function") {
    stream.destroy();
  }
  if (typeof stream.close === "function") {
    // Node.js core bug workaround
    stream.on("open",
    /**
     * @this {import("fs").ReadStream}
     */
    function onOpenClose() {
      // @ts-expect-error
      if (typeof this.fd === "number") {
        // actually close down the fd
        this.close();
      }
    });
  }
  if (typeof stream.addListener === "function" && suppress) {
    stream.removeAllListeners("error");
    stream.addListener("error", () => {});
  }
}

/** @type {Record<number, string>} */
const statuses = {
  400: "Bad Request",
  403: "Forbidden",
  404: "Not Found",
  416: "Range Not Satisfiable",
  500: "Internal Server Error"
};
const parseRangeHeaders = memorize(
/**
 * @param {string} value value
 * @returns {import("range-parser").Result | import("range-parser").Ranges} ranges
 */
value => {
  const [len, rangeHeader] = value.split("|");
  return require("range-parser")(Number(len), rangeHeader, {
    combine: true
  });
});
const getETag = memorize(() => require("./utils/etag"));
const getEscapeHtml = memorize(() => require("./utils/escapeHtml"));
const getParseTokenList = memorize(() => require("./utils/parseTokenList"));
const MAX_MAX_AGE = 31536000000;

/**
 * @template {IncomingMessage} Request
 * @template {ServerResponse} Response
 * @typedef {object} SendErrorOptions send error options
 * @property {Record<string, number | string | string[] | undefined>=} headers headers
 * @property {import("./index").ModifyResponseData<Request, Response>=} modifyResponseData modify response data callback
 */

/**
 * @template {IncomingMessage} Request
 * @template {ServerResponse} Response
 * @param {import("./index.js").FilledContext<Request, Response>} context context
 * @returns {import("./index.js").Middleware<Request, Response>} wrapper
 */
function wrapper(context) {
  return async function middleware(req, res, next) {
    /**
     * @param {NodeJS.ErrnoException=} err an error
     * @returns {Promise<void>}
     */
    async function goNext(err) {
      if (!context.options.serverSideRender) {
        return next(err);
      }
      return new Promise(resolve => {
        ready(context, () => {
          setState(res, "webpack", {
            devMiddleware: context
          });
          resolve(next(err));
        }, req);
      });
    }
    const acceptedMethods = context.options.methods || ["GET", "HEAD"];
    // TODO do we need an option here?
    const forwardError = false;
    initState(res);
    const method = getRequestMethod(req);
    if (method && !acceptedMethods.includes(method)) {
      await goNext();
      return;
    }

    /**
     * @param {string} message an error message
     * @param {number} status status
     * @param {Partial<SendErrorOptions<Request, Response>>=} options options
     * @returns {Promise<void>}
     */
    async function sendError(message, status, options) {
      if (forwardError) {
        const error = /** @type {Error & { statusCode: number }} */
        new Error(message);
        error.statusCode = status;
        await goNext(error);
      }
      const escapeHtml = getEscapeHtml();
      const content = statuses[status] || String(status);
      let document = Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>${escapeHtml(content)}</pre>
</body>
</html>`, "utf8");

      // Clear existing headers
      const headers = getResponseHeaders(res);
      for (let i = 0; i < headers.length; i++) {
        removeResponseHeader(res, headers[i]);
      }
      if (options && options.headers) {
        const keys = Object.keys(options.headers);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = options.headers[key];
          if (typeof value !== "undefined") {
            setResponseHeader(res, key, value);
          }
        }
      }

      // Send basic response
      setStatusCode(res, status);
      setResponseHeader(res, "Content-Type", "text/html; charset=utf-8");
      setResponseHeader(res, "Content-Security-Policy", "default-src 'none'");
      setResponseHeader(res, "X-Content-Type-Options", "nosniff");
      let byteLength = Buffer.byteLength(document);
      if (options && options.modifyResponseData) {
        ({
          data: document,
          byteLength
        } = /** @type {{ data: Buffer<ArrayBuffer>, byteLength: number }} */
        options.modifyResponseData(req, res, document, byteLength));
      }
      setResponseHeader(res, "Content-Length", byteLength);
      finish(res, document);
    }

    /**
     * @param {NodeJS.ErrnoException} error error
     * @returns {Promise<void>}
     */
    async function errorHandler(error) {
      switch (error.code) {
        case "ENAMETOOLONG":
        case "ENOENT":
        case "ENOTDIR":
          await sendError(error.message, 404, {
            modifyResponseData: context.options.modifyResponseData
          });
          break;
        default:
          await sendError(error.message, 500, {
            modifyResponseData: context.options.modifyResponseData
          });
          break;
      }
    }

    /**
     * @returns {string | string[] | undefined} something when conditional get exist
     */
    function isConditionalGET() {
      return getRequestHeader(req, "if-match") || getRequestHeader(req, "if-unmodified-since") || getRequestHeader(req, "if-none-match") || getRequestHeader(req, "if-modified-since");
    }

    /**
     * @returns {boolean} true when precondition failure, otherwise false
     */
    function isPreconditionFailure() {
      // if-match
      const ifMatch = /** @type {string} */getRequestHeader(req, "if-match");

      // A recipient MUST ignore If-Unmodified-Since if the request contains
      // an If-Match header field; the condition in If-Match is considered to
      // be a more accurate replacement for the condition in
      // If-Unmodified-Since, and the two are only combined for the sake of
      // interoperating with older intermediaries that might not implement If-Match.
      if (ifMatch) {
        const etag = getResponseHeader(res, "ETag");
        return !etag || ifMatch !== "*" && getParseTokenList()(ifMatch).every(match => match !== etag && match !== `W/${etag}` && `W/${match}` !== etag);
      }

      // if-unmodified-since
      const ifUnmodifiedSince = /** @type {string} */
      getRequestHeader(req, "if-unmodified-since");
      if (ifUnmodifiedSince) {
        const unmodifiedSince = parseHttpDate(ifUnmodifiedSince);

        // A recipient MUST ignore the If-Unmodified-Since header field if the
        // received field-value is not a valid HTTP-date.
        if (!Number.isNaN(unmodifiedSince)) {
          const lastModified = parseHttpDate(/** @type {string} */getResponseHeader(res, "Last-Modified"));
          return Number.isNaN(lastModified) || lastModified > unmodifiedSince;
        }
      }
      return false;
    }

    /**
     * @returns {boolean} is cachable
     */
    function isCachable() {
      const statusCode = getStatusCode(res);
      return statusCode >= 200 && statusCode < 300 || statusCode === 304 ||
      // For Koa and Hono, because by default status code is 404, but we already found a file
      statusCode === 404;
    }

    /**
     * @param {import("http").OutgoingHttpHeaders} resHeaders res header
     * @returns {boolean} true when fresh, otherwise false
     */
    function isFresh(resHeaders) {
      // Always return stale when Cache-Control: no-cache to support end-to-end reload requests
      // https://tools.ietf.org/html/rfc2616#section-14.9.4
      const cacheControl = /** @type {string} */
      getRequestHeader(req, "cache-control");
      if (cacheControl && CACHE_CONTROL_NO_CACHE_REGEXP.test(cacheControl)) {
        return false;
      }

      // fields
      const noneMatch = /** @type {string} */
      getRequestHeader(req, "if-none-match");
      const modifiedSince = /** @type {string} */
      getRequestHeader(req, "if-modified-since");

      // unconditional request
      if (!noneMatch && !modifiedSince) {
        return false;
      }

      // if-none-match
      if (noneMatch && noneMatch !== "*") {
        if (!resHeaders.etag) {
          return false;
        }
        const matches = getParseTokenList()(noneMatch);
        let etagStale = true;
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          if (match === resHeaders.etag || match === `W/${resHeaders.etag}` || `W/${match}` === resHeaders.etag) {
            etagStale = false;
            break;
          }
        }
        if (etagStale) {
          return false;
        }
      }

      // A recipient MUST ignore If-Modified-Since if the request contains an If-None-Match header field;
      // the condition in If-None-Match is considered to be a more accurate replacement for the condition in If-Modified-Since,
      // and the two are only combined for the sake of interoperating with older intermediaries that might not implement If-None-Match.
      if (noneMatch) {
        return true;
      }

      // if-modified-since
      if (modifiedSince) {
        const lastModified = resHeaders["last-modified"];

        //  A recipient MUST ignore the If-Modified-Since header field if the
        //  received field-value is not a valid HTTP-date, or if the request
        //  method is neither GET nor HEAD.
        const modifiedStale = !lastModified || !(parseHttpDate(lastModified) <= parseHttpDate(modifiedSince));
        if (modifiedStale) {
          return false;
        }
      }
      return true;
    }

    /**
     * @returns {boolean} true when range is fresh, otherwise false
     */
    function isRangeFresh() {
      const ifRange = /** @type {string | undefined} */
      getRequestHeader(req, "if-range");
      if (!ifRange) {
        return true;
      }

      // if-range as etag
      if (ifRange.includes('"')) {
        const etag = /** @type {string | undefined} */
        getResponseHeader(res, "ETag");
        if (!etag) {
          return true;
        }
        return Boolean(etag && ifRange.includes(etag));
      }

      // if-range as modified date
      const lastModified = /** @type {string | undefined} */
      getResponseHeader(res, "Last-Modified");
      if (!lastModified) {
        return true;
      }
      return parseHttpDate(lastModified) <= parseHttpDate(ifRange);
    }

    /**
     * @returns {string | undefined} range header
     */
    function getRangeHeader() {
      const range = /** @type {string} */getRequestHeader(req, "range");
      if (range && BYTES_RANGE_REGEXP.test(range)) {
        return range;
      }
      return undefined;
    }

    /**
     * @param {import("range-parser").Range} range range
     * @returns {[number, number]} offset and length
     */
    function getOffsetAndLenFromRange(range) {
      const offset = range.start;
      const len = range.end - range.start + 1;
      return [offset, len];
    }

    /**
     * @param {number} offset offset
     * @param {number} len len
     * @returns {[number, number]} start and end
     */
    function calcStartAndEnd(offset, len) {
      const start = offset;
      const end = Math.max(offset, offset + len - 1);
      return [start, end];
    }

    /**
     * @returns {Promise<void>}
     */
    async function processRequest() {
      // Pipe and SendFile
      /** @type {import("./utils/getFilenameFromUrl").Extra} */
      const extra = {};
      const filename = getFilenameFromUrl(context, /** @type {string} */getRequestURL(req), extra);
      if (extra.errorCode) {
        if (extra.errorCode === 403) {
          context.logger.error(`Malicious path "${filename}".`);
        }
        await sendError(extra.errorCode === 400 ? "Bad Request" : "Forbidden", extra.errorCode, {
          modifyResponseData: context.options.modifyResponseData
        });
        return;
      }
      if (!filename) {
        await goNext();
        return;
      }
      if (getHeadersSent(res)) {
        await goNext();
        return;
      }
      const {
        size
      } = /** @type {import("fs").Stats} */extra.stats;
      let len = size;
      let offset = 0;

      // Send logic
      if (context.options.headers) {
        let {
          headers
        } = context.options;
        if (typeof headers === "function") {
          headers = /** @type {NormalizedHeaders} */
          headers(req, res, context);
        }

        /**
         * @type {{key: string, value: string | number}[]}
         */
        const allHeaders = [];
        if (typeof headers !== "undefined") {
          if (!Array.isArray(headers)) {
            for (const name in headers) {
              allHeaders.push({
                key: name,
                value: headers[name]
              });
            }
            headers = allHeaders;
          }
          for (const {
            key,
            value
          } of headers) {
            setResponseHeader(res, key, value);
          }
        }
      }
      if (!getResponseHeader(res, "Accept-Ranges")) {
        setResponseHeader(res, "Accept-Ranges", "bytes");
      }
      if (!getResponseHeader(res, "Cache-Control")) {
        // TODO enable the `cacheImmutable` by default for the next major release
        const cacheControl = context.options.cacheImmutable && extra.immutable ? {
          immutable: true
        } : context.options.cacheControl;
        if (cacheControl) {
          let cacheControlValue;
          if (typeof cacheControl === "boolean") {
            cacheControlValue = "public, max-age=31536000";
          } else if (typeof cacheControl === "number") {
            const maxAge = Math.floor(Math.min(Math.max(0, cacheControl), MAX_MAX_AGE) / 1000);
            cacheControlValue = `public, max-age=${maxAge}`;
          } else if (typeof cacheControl === "string") {
            cacheControlValue = cacheControl;
          } else {
            const maxAge = cacheControl.maxAge ? Math.floor(Math.min(Math.max(0, cacheControl.maxAge), MAX_MAX_AGE) / 1000) : MAX_MAX_AGE / 1000;
            cacheControlValue = `public, max-age=${maxAge}`;
            if (cacheControl.immutable) {
              cacheControlValue += ", immutable";
            }
          }
          setResponseHeader(res, "Cache-Control", cacheControlValue);
        }
      }
      if (context.options.lastModified && !getResponseHeader(res, "Last-Modified")) {
        const modified = /** @type {import("fs").Stats} */
        extra.stats.mtime.toUTCString();
        setResponseHeader(res, "Last-Modified", modified);
      }

      /** @type {number} */
      let start;
      /** @type {number} */
      let end;

      /** @type {undefined | Buffer | ReadStream} */
      let bufferOrStream;
      /** @type {number | undefined} */
      let byteLength;
      const rangeHeader = getRangeHeader();
      if (context.options.etag && !getResponseHeader(res, "ETag")) {
        const isStrongETag = context.options.etag === "strong";

        // TODO cache strong etag generation?
        if (isStrongETag) {
          if (rangeHeader) {
            const parsedRanges = /** @type {import("range-parser").Ranges | import("range-parser").Result} */
            parseRangeHeaders(`${size}|${rangeHeader}`);
            if (parsedRanges !== -2 && parsedRanges !== -1 && parsedRanges.length === 1) {
              [offset, len] = getOffsetAndLenFromRange(parsedRanges[0]);
            }
          }
          [start, end] = calcStartAndEnd(offset, len);
          try {
            const result = createReadStreamOrReadFileSync(filename, context.outputFileSystem, start, end);
            ({
              bufferOrStream,
              byteLength
            } = result);
          } catch (error) {
            await errorHandler(/** @type {NodeJS.ErrnoException} */error);
            return;
          }
        }
        const result = await getETag()(isStrongETag ? (/** @type {Buffer | ReadStream} */bufferOrStream) : (/** @type {import("fs").Stats} */extra.stats));

        // Because we already read stream, we can cache buffer to avoid extra read from fs
        if (result.buffer) {
          bufferOrStream = result.buffer;
        }
        setResponseHeader(res, "ETag", result.hash);
      }
      if (!getResponseHeader(res, "Content-Type") || getStatusCode(res) === 404) {
        removeResponseHeader(res, "Content-Type");
        // content-type name (like application/javascript; charset=utf-8) or false
        const contentType = mime.contentType(path.extname(filename));

        // Only set content-type header if media type is known
        // https://tools.ietf.org/html/rfc7231#section-3.1.1.5
        if (contentType) {
          setResponseHeader(res, "Content-Type", contentType);
        } else if (context.options.mimeTypeDefault) {
          setResponseHeader(res, "Content-Type", context.options.mimeTypeDefault);
        }
      }

      // Conditional GET support
      if (isConditionalGET()) {
        if (isPreconditionFailure()) {
          await sendError("Precondition Failed", 412, {
            modifyResponseData: context.options.modifyResponseData
          });
          return;
        }
        if (isCachable() && isFresh({
          etag: (/** @type {string | undefined} */
          getResponseHeader(res, "ETag")),
          "last-modified": (/** @type {string | undefined} */
          getResponseHeader(res, "Last-Modified"))
        })) {
          setStatusCode(res, 304);

          // Remove content header fields
          removeResponseHeader(res, "Content-Encoding");
          removeResponseHeader(res, "Content-Language");
          removeResponseHeader(res, "Content-Length");
          removeResponseHeader(res, "Content-Range");
          removeResponseHeader(res, "Content-Type");
          finish(res);
          return;
        }
      }
      let isPartialContent = false;
      if (rangeHeader) {
        let parsedRanges = /** @type {import("range-parser").Ranges | import("range-parser").Result | []} */
        parseRangeHeaders(`${size}|${rangeHeader}`);

        // If-Range support
        if (!isRangeFresh()) {
          parsedRanges = [];
        }
        if (parsedRanges === -1) {
          context.logger.error("Unsatisfiable range for 'Range' header.");
          setResponseHeader(res, "Content-Range", getValueContentRangeHeader("bytes", size));
          await sendError("Range Not Satisfiable", 416, {
            headers: {
              "Content-Range": getResponseHeader(res, "Content-Range")
            },
            modifyResponseData: context.options.modifyResponseData
          });
          return;
        } else if (parsedRanges === -2) {
          context.logger.error("A malformed 'Range' header was provided. A regular response will be sent for this request.");
        } else if (parsedRanges.length > 1) {
          context.logger.error("A 'Range' header with multiple ranges was provided. Multiple ranges are not supported, so a regular response will be sent for this request.");
        }
        if (parsedRanges !== -2 && parsedRanges.length === 1) {
          // Content-Range
          setStatusCode(res, 206);
          setResponseHeader(res, "Content-Range", getValueContentRangeHeader("bytes", size, /** @type {import("range-parser").Ranges} */parsedRanges[0]));
          isPartialContent = true;
          [offset, len] = getOffsetAndLenFromRange(parsedRanges[0]);
        }
      }

      // When strong Etag generation is enabled we already read file, so we can skip extra fs call
      if (!bufferOrStream) {
        [start, end] = calcStartAndEnd(offset, len);
        try {
          ({
            bufferOrStream,
            byteLength
          } = createReadStreamOrReadFileSync(filename, context.outputFileSystem, start, end));
        } catch (error) {
          await errorHandler(/** @type {NodeJS.ErrnoException} */error);
          return;
        }
      }
      if (context.options.modifyResponseData) {
        ({
          data: bufferOrStream,
          byteLength
        } = context.options.modifyResponseData(req, res, bufferOrStream, /** @type {number} */
        byteLength));
      }
      setResponseHeader(res, "Content-Length", /** @type {number} */
      byteLength);
      if (method === "HEAD") {
        if (!isPartialContent) {
          setStatusCode(res, 200);
        }
        finish(res);
        return;
      }
      if (!isPartialContent) {
        setStatusCode(res, 200);
      }
      const isPipeSupports = typeof (/** @type {import("fs").ReadStream} */bufferOrStream.pipe) === "function";
      if (!isPipeSupports) {
        send(res, /** @type {Buffer} */bufferOrStream);
        return;
      }

      // Cleanup
      const cleanup = () => {
        destroyStream(/** @type {import("fs").ReadStream} */bufferOrStream, true);
      };

      // Error handling
      /** @type {import("fs").ReadStream} */
      bufferOrStream.on("error", error => {
        // clean up stream early
        cleanup();
        errorHandler(error);
      });
      pipe(res, /** @type {ReadStream} */bufferOrStream);
      const outgoing = getOutgoing(res);
      if (outgoing) {
        // Response finished, cleanup
        onFinishedStream(outgoing, cleanup);
      }
    }
    ready(context, processRequest, req);
  };
}
module.exports = wrapper;