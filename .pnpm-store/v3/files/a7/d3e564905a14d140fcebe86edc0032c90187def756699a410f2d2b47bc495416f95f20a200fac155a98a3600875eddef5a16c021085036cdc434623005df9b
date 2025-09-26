export = wdm;
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
declare function wdm<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
>(
  compiler: Compiler | MultiCompiler,
  options?: Options<RequestInternal, ResponseInternal> | undefined,
): API<RequestInternal, ResponseInternal>;
declare namespace wdm {
  export {
    hapiWrapper,
    koaWrapper,
    honoWrapper,
    Schema,
    Compiler,
    MultiCompiler,
    Configuration,
    Stats,
    MultiStats,
    ReadStream,
    ExtendedServerResponse,
    IncomingMessage,
    ServerResponse,
    NextFunction,
    WatchOptions,
    Watching,
    MultiWatching,
    OutputFileSystem,
    Logger,
    Callback,
    ResponseData,
    ModifyResponseData,
    Context,
    FilledContext,
    NormalizedHeaders,
    Headers,
    Options,
    Middleware,
    Extra,
    GetFilenameFromUrl,
    WaitUntilValid,
    Invalidate,
    Close,
    AdditionalMethods,
    API,
    WithOptional,
    WithoutUndefined,
    HapiPluginBase,
    HapiPlugin,
    HapiOptions,
  };
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
declare function hapiWrapper<
  HapiServer,
  HapiOptionsInternal extends HapiOptions,
>(): HapiPlugin<HapiServer, HapiOptionsInternal>;
/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @param {Compiler | MultiCompiler} compiler compiler
 * @param {Options<RequestInternal, ResponseInternal>=} options options
 * @returns {(ctx: any, next: Function) => Promise<void> | void} kow wrapper
 */
declare function koaWrapper<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
>(
  compiler: Compiler | MultiCompiler,
  options?: Options<RequestInternal, ResponseInternal> | undefined,
): (ctx: any, next: Function) => Promise<void> | void;
/**
 * @template {IncomingMessage} [RequestInternal=IncomingMessage]
 * @template {ServerResponse} [ResponseInternal=ServerResponse]
 * @param {Compiler | MultiCompiler} compiler compiler
 * @param {Options<RequestInternal, ResponseInternal>=} options options
 * @returns {(ctx: any, next: Function) => Promise<void> | void} hono wrapper
 */
declare function honoWrapper<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
>(
  compiler: Compiler | MultiCompiler,
  options?: Options<RequestInternal, ResponseInternal> | undefined,
): (ctx: any, next: Function) => Promise<void> | void;
type Schema = import("schema-utils/declarations/validate").Schema;
type Compiler = import("webpack").Compiler;
type MultiCompiler = import("webpack").MultiCompiler;
type Configuration = import("webpack").Configuration;
type Stats = import("webpack").Stats;
type MultiStats = import("webpack").MultiStats;
type ReadStream = import("fs").ReadStream;
type ExtendedServerResponse = {
  /**
   * locals
   */
  locals?:
    | {
        webpack?: {
          devMiddleware?: Context<IncomingMessage, ServerResponse>;
        };
      }
    | undefined;
};
type IncomingMessage = import("http").IncomingMessage;
type ServerResponse = import("http").ServerResponse & ExtendedServerResponse;
type NextFunction = (err?: any | undefined) => void;
type WatchOptions = NonNullable<Configuration["watchOptions"]>;
type Watching = Compiler["watching"];
type MultiWatching = ReturnType<MultiCompiler["watch"]>;
type OutputFileSystem = import("webpack").OutputFileSystem & {
  createReadStream?: typeof import("fs").createReadStream;
  statSync: import("fs").StatSyncFn;
  readFileSync: typeof import("fs").readFileSync;
};
type Logger = ReturnType<Compiler["getInfrastructureLogger"]>;
type Callback = (stats?: (Stats | MultiStats) | undefined) => any;
type ResponseData = {
  /**
   * data
   */
  data: Buffer | ReadStream;
  /**
   * byte length
   */
  byteLength: number;
};
type ModifyResponseData<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
> = (
  req: RequestInternal,
  res: ResponseInternal,
  data: Buffer | ReadStream,
  byteLength: number,
) => ResponseData;
type Context<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
> = {
  /**
   * state
   */
  state: boolean;
  /**
   * stats
   */
  stats: Stats | MultiStats | undefined;
  /**
   * callbacks
   */
  callbacks: Callback[];
  /**
   * options
   */
  options: Options<RequestInternal, ResponseInternal>;
  /**
   * compiler
   */
  compiler: Compiler | MultiCompiler;
  /**
   * watching
   */
  watching: Watching | MultiWatching | undefined;
  /**
   * logger
   */
  logger: Logger;
  /**
   * output file system
   */
  outputFileSystem: OutputFileSystem;
};
type FilledContext<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
> = WithoutUndefined<Context<RequestInternal, ResponseInternal>, "watching">;
type NormalizedHeaders =
  | Record<string, string | number>
  | Array<{
      key: string;
      value: number | string;
    }>;
type Headers<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
> =
  | NormalizedHeaders
  | ((
      req: RequestInternal,
      res: ResponseInternal,
      context: Context<RequestInternal, ResponseInternal>,
    ) => void | undefined | NormalizedHeaders)
  | undefined;
type Options<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
> = {
  /**
   * mime types
   */
  mimeTypes?:
    | {
        [key: string]: string;
      }
    | undefined;
  /**
   * mime type default
   */
  mimeTypeDefault?: (string | undefined) | undefined;
  /**
   * write to disk
   */
  writeToDisk?: (boolean | ((targetPath: string) => boolean)) | undefined;
  /**
   * methods
   */
  methods?: string[] | undefined;
  /**
   * headers
   */
  headers?: Headers<RequestInternal, ResponseInternal> | undefined;
  /**
   * public path
   */
  publicPath?: NonNullable<Configuration["output"]>["publicPath"] | undefined;
  /**
   * stats
   */
  stats?: Configuration["stats"] | undefined;
  /**
   * is server side render
   */
  serverSideRender?: boolean | undefined;
  /**
   * output file system
   */
  outputFileSystem?: OutputFileSystem | undefined;
  /**
   * index
   */
  index?: (boolean | string) | undefined;
  /**
   * modify response data
   */
  modifyResponseData?:
    | ModifyResponseData<RequestInternal, ResponseInternal>
    | undefined;
  /**
   * options to generate etag header
   */
  etag?: ("weak" | "strong") | undefined;
  /**
   * options to generate last modified header
   */
  lastModified?: boolean | undefined;
  /**
   * options to generate cache headers
   */
  cacheControl?:
    | (
        | boolean
        | number
        | string
        | {
            maxAge?: number;
            immutable?: boolean;
          }
      )
    | undefined;
  /**
   * is cache immutable
   */
  cacheImmutable?: boolean | undefined;
};
type Middleware<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
> = (
  req: RequestInternal,
  res: ResponseInternal,
  next: NextFunction,
) => Promise<void>;
type Extra = import("./utils/getFilenameFromUrl").Extra;
type GetFilenameFromUrl = (
  url: string,
  extra?: Extra | undefined,
) => string | undefined;
type WaitUntilValid = (callback: Callback) => any;
type Invalidate = (callback: Callback) => any;
type Close = (callback: (err: Error | null | undefined) => void) => any;
type AdditionalMethods<
  RequestInternal extends IncomingMessage,
  ResponseInternal extends ServerResponse,
> = {
  /**
   * get filename from url
   */
  getFilenameFromUrl: GetFilenameFromUrl;
  /**
   * wait until valid
   */
  waitUntilValid: WaitUntilValid;
  /**
   * invalidate
   */
  invalidate: Invalidate;
  /**
   * close
   */
  close: Close;
  /**
   * context
   */
  context: Context<RequestInternal, ResponseInternal>;
};
type API<
  RequestInternal extends IncomingMessage = import("http").IncomingMessage,
  ResponseInternal extends ServerResponse = ServerResponse,
> = Middleware<RequestInternal, ResponseInternal> &
  AdditionalMethods<RequestInternal, ResponseInternal>;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<T>;
type WithoutUndefined<T, K extends keyof T> = T & {
  [P in K]: NonNullable<T[P]>;
};
type HapiPluginBase<S, O> = {
  /**
   * register
   */
  register: (server: S, options: O) => void | Promise<void>;
};
type HapiPlugin<S, O> = HapiPluginBase<S, O> & {
  pkg: {
    name: string;
  };
  multiple: boolean;
};
type HapiOptions = Options & {
  compiler: Compiler | MultiCompiler;
};
