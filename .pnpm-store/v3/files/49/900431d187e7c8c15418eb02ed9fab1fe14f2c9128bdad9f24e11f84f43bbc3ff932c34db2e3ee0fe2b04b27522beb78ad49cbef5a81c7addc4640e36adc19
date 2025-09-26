"use strict";

const mime = require("mime-types");
const {
  validate
} = require("schema-utils");
const middleware = require("./middleware");
const schema = require("./options.json");
const getFilenameFromUrl = require("./utils/getFilenameFromUrl");
const ready = require("./utils/ready");
const setupHooks = require("./utils/setupHooks");
const setupOutputFileSystem = require("./utils/setupOutputFileSystem");
const setupWriteToDisk = require("./utils/setupWriteToDisk");
const noop = () => {};

/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").MultiCompiler} MultiCompiler */
/** @typedef {import("webpack").Configuration} Configuration */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").MultiStats} MultiStats */
/** @typedef {import("fs").ReadStream} ReadStream */

/**
 * @typedef {object} ExtendedServerResponse
 * @property {{ webpack?: { devMiddleware?: Context<IncomingMessage, ServerResponse> } }=} locals locals
 */

/** @typedef {import("http").IncomingMessage} IncomingMessage */
/** @typedef {import("http").ServerResponse & ExtendedServerResponse} ServerResponse */

// eslint-disable-next-line jsdoc/no-restricted-syntax
/**
 * @callback NextFunction
 * @param {any=} err error
 * @returns {void}
 */

/**
 * @typedef {NonNullable<Configuration["watchOptions"]>} WatchOptions
 */

/**
 * @typedef {Compiler["watching"]} Watching
 */

/**
 * @typedef {ReturnType<MultiCompiler["watch"]>} MultiWatching
 */

/**
 * @typedef {import("webpack").OutputFileSystem & { createReadStream?: import("fs").createReadStream, statSync: import("fs").statSync, readFileSync: import("fs").readFileSync }} OutputFileSystem
 */

/** @typedef {ReturnType<Compiler["getInfrastructureLogger"]>} Logger */

/**
 * @callback Callback
 * @param {(Stats | MultiStats)=} stats
 */

/**
 * @typedef {object} ResponseData
 * @property {Buffer | ReadStream} data data
 * @property {number} byteLength byte length
 */

/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @callback ModifyResponseData
 * @param {RequestInternal} req req
 * @param {ResponseInternal} res res
 * @param {Buffer | ReadStream} data data
 * @param {number} byteLength byte length
 * @returns {ResponseData}
 */

/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @typedef {object} Context
 * @property {boolean} state state
 * @property {Stats | MultiStats | undefined} stats stats
 * @property {Callback[]} callbacks callbacks
 * @property {Options<RequestInternal, ResponseInternal>} options options
 * @property {Compiler | MultiCompiler} compiler compiler
 * @property {Watching | MultiWatching | undefined} watching watching
 * @property {Logger} logger logger
 * @property {OutputFileSystem} outputFileSystem output file system
 */

/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @typedef {WithoutUndefined<Context<RequestInternal, ResponseInternal>, "watching">} FilledContext
 */

/** @typedef {Record<string, string | number> | Array<{ key: string, value: number | string }>} NormalizedHeaders */

/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @typedef {NormalizedHeaders | ((req: RequestInternal, res: ResponseInternal, context: Context<RequestInternal, ResponseInternal>) =>  void | undefined | NormalizedHeaders) | undefined} Headers
 */

/**
 * @template {IncomingMessage} [RequestInternal = IncomingMessage]
 * @template {ServerResponse} [ResponseInternal = ServerResponse]
 * @typedef {object} Options
 * @property {{ [key: string]: string }=} mimeTypes mime types
 * @property {(string | undefined)=} mimeTypeDefault mime type default
 * @property {(boolean | ((targetPath: string) => boolean))=} writeToDisk write to disk
 * @property {string[]=} methods methods
 * @property {Headers<RequestInternal, ResponseInternal>=} headers headers
 * @property {NonNullable<Configuration["output"]>["publicPath"]=} publicPath public path
 * @property {Configuration["stats"]=} stats stats
 * @property {boolean=} serverSideRender is server side render
 * @property {OutputFileSystem=} outputFileSystem output file system
 * @property {(boolean | string)=} index index
 * @property {ModifyResponseData<RequestInternal, ResponseInternal>=} modifyResponseData modify response data
 * @property {"weak" | "strong"=} etag options to generate etag header
 * @property {boolean=} lastModified options to generate last modified header
 * @property {(boolean | number | string | { maxAge?: number, immutable?: boolean })=} cacheControl options to generate cache headers
 * @property {boolean=} cacheImmutable is cache immutable
 */

/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @callback Middleware
 * @param {RequestInternal} req
 * @param {ResponseInternal} res
 * @param {NextFunction} next
 * @returns {Promise<void>}
 */

/** @typedef {import("./utils/getFilenameFromUrl").Extra} Extra */

/**
 * @callback GetFilenameFromUrl
 * @param {string} url
 * @param {Extra=} extra
 * @returns {string | undefined}
 */

/**
 * @callback WaitUntilValid
 * @param {Callback} callback
 */

/**
 * @callback Invalidate
 * @param {Callback} callback
 */

/**
 * @callback Close
 * @param {(err: Error | null | undefined) => void} callback
 */

/**
 * @template {IncomingMessage} RequestInternal
 * @template {ServerResponse} ResponseInternal
 * @typedef {object} AdditionalMethods
 * @property {GetFilenameFromUrl} getFilenameFromUrl get filename from url
 * @property {WaitUntilValid} waitUntilValid wait until valid
 * @property {Invalidate} invalidate invalidate
 * @property {Close} close close
 * @property {Context<RequestInternal, ResponseInternal>} context context
 */

/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @typedef {Middleware<RequestInternal, ResponseInternal> & AdditionalMethods<RequestInternal, ResponseInternal>} API
 */

/**
 * @template T
 * @template {keyof T} K
 * @typedef {Omit<T, K> & Partial<T>} WithOptional
 */

/**
 * @template T
 * @template {keyof T} K
 * @typedef {T & { [P in K]: NonNullable<T[P]> }} WithoutUndefined
 */

/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @param {Compiler | MultiCompiler} compiler compiler
 * @param {Options<RequestInternal, ResponseInternal>=} options options
 * @returns {API<RequestInternal, ResponseInternal>} webpack dev middleware
 */
function wdm(compiler, options = {}) {
  validate(/** @type {Schema} */schema, options, {
    name: "Dev Middleware",
    baseDataPath: "options"
  });
  const {
    mimeTypes
  } = options;
  if (mimeTypes) {
    const {
      types
    } = mime;

    // mimeTypes from user provided options should take priority
    // over existing, known types
    // @ts-expect-error
    mime.types = {
      ...types,
      ...mimeTypes
    };
  }

  /**
   * @type {WithOptional<Context<RequestInternal, ResponseInternal>, "watching" | "outputFileSystem">}
   */
  const context = {
    state: false,
    stats: undefined,
    callbacks: [],
    options,
    compiler,
    logger: compiler.getInfrastructureLogger("webpack-dev-middleware")
  };
  setupHooks(context);
  if (options.writeToDisk) {
    setupWriteToDisk(context);
  }
  setupOutputFileSystem(context);

  // Start watching
  if (/** @type {Compiler} */context.compiler.watching) {
    context.watching = /** @type {Compiler} */context.compiler.watching;
  } else {
    /**
     * @param {Error | null | undefined} error error
     */
    const errorHandler = error => {
      if (error) {
        // TODO: improve that in future
        // For example - `writeToDisk` can throw an error and right now it is ends watching.
        // We can improve that and keep watching active, but it is require API on webpack side.
        // Let's implement that in webpack@5 because it is rare case.
        context.logger.error(error);
      }
    };
    if (Array.isArray(/** @type {MultiCompiler} */context.compiler.compilers)) {
      const compilers = /** @type {MultiCompiler} */context.compiler;
      const watchOptions = compilers.compilers.map(childCompiler => childCompiler.options.watchOptions || {});
      context.watching = compiler.watch(watchOptions, errorHandler);
    } else {
      const oneCompiler = /** @type {Compiler} */context.compiler;
      const watchOptions = oneCompiler.options.watchOptions || {};
      context.watching = compiler.watch(watchOptions, errorHandler);
    }
  }
  const filledContext = /** @type {FilledContext<RequestInternal, ResponseInternal>} */
  context;
  const instance = /** @type {API<RequestInternal, ResponseInternal>} */
  middleware(filledContext);

  // API
  instance.getFilenameFromUrl = (url, extra) => getFilenameFromUrl(filledContext, url, extra);
  instance.waitUntilValid = (callback = noop) => {
    ready(filledContext, callback);
  };
  instance.invalidate = (callback = noop) => {
    ready(filledContext, callback);
    filledContext.watching.invalidate();
  };
  instance.close = (callback = noop) => {
    filledContext.watching.close(callback);
  };
  instance.context = filledContext;
  return instance;
}

/**
 * @template S
 * @template O
 * @typedef {object} HapiPluginBase
 * @property {(server: S, options: O) => void | Promise<void>} register register
 */

/**
 * @template S
 * @template O
 * @typedef {HapiPluginBase<S, O> & { pkg: { name: string }, multiple: boolean }} HapiPlugin
 */

/**
 * @typedef {Options & { compiler: Compiler | MultiCompiler }} HapiOptions
 */

/**
 * @template HapiServer
 * @template {HapiOptions} HapiOptionsInternal
 * @returns {HapiPlugin<HapiServer, HapiOptionsInternal>} hapi wrapper
 */
function hapiWrapper() {
  return {
    pkg: {
      name: "webpack-dev-middleware"
    },
    // Allow to have multiple middleware
    multiple: true,
    register(server, options) {
      const {
        compiler,
        ...rest
      } = options;
      if (!compiler) {
        throw new Error("The compiler options is required.");
      }
      const devMiddleware = wdm(compiler, rest);

      // @ts-expect-error
      if (!server.decorations.server.includes("webpackDevMiddleware")) {
        // @ts-expect-error
        server.decorate("server", "webpackDevMiddleware", devMiddleware);
      }

      // @ts-expect-error
      // eslint-disable-next-line id-length
      server.ext("onRequest", (request, h) => new Promise((resolve, reject) => {
        let isFinished = false;

        /**
         * @param {(string | Buffer)=} data
         */

        request.raw.res.send = data => {
          isFinished = true;
          request.raw.res.end(data);
        };

        /**
         * @param {(string | Buffer)=} data
         */

        request.raw.res.finish = data => {
          isFinished = true;
          request.raw.res.end(data);
        };
        devMiddleware(request.raw.req, request.raw.res, error => {
          if (error) {
            reject(error);
            return;
          }
          if (!isFinished) {
            resolve(request);
          }
        });
      }).then(() => h.continue).catch(error => {
        throw error;
      }));
    }
  };
}
wdm.hapiWrapper = hapiWrapper;

// eslint-disable-next-line jsdoc/no-restricted-syntax
/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @param {Compiler | MultiCompiler} compiler compiler
 * @param {Options<RequestInternal, ResponseInternal>=} options options
 * @returns {(ctx: any, next: Function) => Promise<void> | void} kow wrapper
 */
function koaWrapper(compiler, options) {
  const devMiddleware = wdm(compiler, options);

  // eslint-disable-next-line jsdoc/no-restricted-syntax
  /**
   * @param {{req: RequestInternal, res: ResponseInternal & import("./utils/compatibleAPI").ExpectedServerResponse, status: number, body: string | Buffer | import("fs").ReadStream | {message: string}, state: object}} ctx context
   * @param {Function} next next
   * @returns {Promise<void>}
   */
  async function webpackDevMiddleware(ctx, next) {
    const {
      req,
      res
    } = ctx;
    res.locals = ctx.state;
    let {
      status
    } = ctx;

    /**
     * @returns {number} code
     */
    res.getStatusCode = () => status;

    /**
     * @param {number} statusCode status code
     */
    res.setStatusCode = statusCode => {
      status = statusCode;
      ctx.status = statusCode;
    };
    let isFinished = false;
    let needNext = false;
    try {
      await new Promise(
      /**
       * @param {(value: void) => void} resolve resolve
       * @param {(reason?: Error) => void} reject reject
       */
      (resolve, reject) => {
        /**
         * @param {import("fs").ReadStream} stream readable stream
         */
        res.stream = stream => {
          ctx.body = stream;
          isFinished = true;
          resolve();
        };
        /**
         * @param {string | Buffer} data data
         */
        res.send = data => {
          ctx.body = data;
          isFinished = true;
          resolve();
        };

        /**
         * @param {(string | Buffer)=} data data
         */
        res.finish = data => {
          ctx.status = status;
          res.end(data);
          isFinished = true;
          resolve();
        };
        devMiddleware(req, res, err => {
          if (err) {
            reject(err);
            return;
          }
          needNext = true;
          if (!isFinished) {
            resolve();
          }
        });
      });
    } catch (err) {
      ctx.status = /** @type {Error & { statusCode: number }} */err.statusCode || /** @type {Error & { status: number }} */err.status || 500;
      ctx.body = {
        message: /** @type {Error} */err.message
      };
    }
    if (needNext) {
      await next();
    }
  }
  webpackDevMiddleware.devMiddleware = devMiddleware;
  return webpackDevMiddleware;
}
wdm.koaWrapper = koaWrapper;

// eslint-disable-next-line jsdoc/no-restricted-syntax
/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @param {Compiler | MultiCompiler} compiler compiler
 * @param {Options<RequestInternal, ResponseInternal>=} options options
 * @returns {(ctx: any, next: Function) => Promise<void> | void} hono wrapper
 */
function honoWrapper(compiler, options) {
  const devMiddleware = wdm(compiler, options);

  // eslint-disable-next-line jsdoc/no-restricted-syntax
  /**
   * @param {{ env: any, body: any, json: any, status: any, set: any, req: RequestInternal & import("./utils/compatibleAPI").ExpectedIncomingMessage & { header: (name: string) => string }, res: ResponseInternal & import("./utils/compatibleAPI").ExpectedServerResponse & { headers: any, status: any } }} context context
   * @param {Function} next next function
   * @returns {Promise<void>}
   */
  async function webpackDevMiddleware(context, next) {
    const {
      req,
      res
    } = context;
    context.set("webpack", {
      devMiddleware: devMiddleware.context
    });

    /**
     * @returns {string | undefined} method
     */
    req.getMethod = () => context.req.method;

    /**
     * @param {string} name name
     * @returns {string | string[] | undefined} header value
     */
    req.getHeader = name => context.req.header(name);

    /**
     * @returns {string | undefined} URL
     */
    req.getURL = () => context.req.url;
    let {
      status
    } = context.res;

    /**
     * @returns {number} code code
     */
    res.getStatusCode = () => status;

    /**
     * @param {number} code code
     */
    res.setStatusCode = code => {
      status = code;
    };

    /**
     * @param {string} name header name
     * @returns {string | string[] | undefined} header
     */
    res.getHeader = name => context.res.headers.get(name);

    // eslint-disable-next-line jsdoc/no-restricted-syntax
    /**
     * @param {string} name header name
     * @param {string | number | Readonly<string[]>} value value
     * @returns {ResponseInternal & import("./utils/compatibleAPI").ExpectedServerResponse & { headers: any, status: any }} response
     */
    res.setHeader = (name, value) => {
      context.res.headers.append(name, value);
      return context.res;
    };

    /**
     * @param {string} name header name
     */
    res.removeHeader = name => {
      context.res.headers.delete(name);
    };

    /**
     * @returns {string[]} response headers
     */
    res.getResponseHeaders = () => [...context.res.headers.keys()];

    /**
     * @returns {ServerResponse} server response
     */
    res.getOutgoing = () => context.env.outgoing;
    res.setState = () => {
      // Do nothing, because we set it before
    };
    res.getHeadersSent = () => context.env.outgoing.headersSent;
    let body;
    let isFinished = false;
    try {
      await new Promise(
      /**
       * @param {(value: void) => void} resolve resolve
       * @param {(reason?: Error) => void} reject reject
       */
      (resolve, reject) => {
        /**
         * @param {import("fs").ReadStream} stream readable stream
         */
        res.stream = stream => {
          body = stream;
          isFinished = true;
          resolve();
        };

        /**
         * @param {string | Buffer} data data
         */
        res.send = data => {
          // Hono sets `Content-Length` by default
          context.res.headers.delete("Content-Length");
          body = data;
          isFinished = true;
          resolve();
        };

        /**
         * @param {(string | Buffer)=} data data
         */
        res.finish = data => {
          const isDataExist = typeof data !== "undefined";

          // Hono sets `Content-Length` by default
          if (isDataExist) {
            context.res.headers.delete("Content-Length");
          }
          body = isDataExist ? data : null;
          isFinished = true;
          resolve();
        };
        devMiddleware(req, res, err => {
          if (err) {
            reject(err);
            return;
          }
          if (!isFinished) {
            resolve();
          }
        });
      });
    } catch (err) {
      context.status(500);
      return context.json({
        message: /** @type {Error} */err.message
      });
    }
    if (typeof body !== "undefined") {
      return context.body(body, status);
    }
    await next();
  }
  webpackDevMiddleware.devMiddleware = devMiddleware;
  return webpackDevMiddleware;
}
wdm.honoWrapper = honoWrapper;
module.exports = wdm;