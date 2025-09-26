export = CopyPlugin;
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
declare class CopyPlugin {
  /**
   * @private
   * @param {Compilation} compilation
   * @param {number} startTime
   * @param {string} dependency
   * @returns {Promise<Snapshot | undefined>}
   */
  private static createSnapshot;
  /**
   * @private
   * @param {Compilation} compilation
   * @param {Snapshot} snapshot
   * @returns {Promise<boolean | undefined>}
   */
  private static checkSnapshotValid;
  /**
   * @private
   * @param {Compiler} compiler
   * @param {Compilation} compilation
   * @param {Buffer} source
   * @returns {string}
   */
  private static getContentHash;
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
  private static runPattern;
  /**
   * @param {PluginOptions} [options]
   */
  constructor(options?: PluginOptions | undefined);
  /**
   * @private
   * @type {Pattern[]}
   */
  private patterns;
  /**
   * @private
   * @type {AdditionalOptions}
   */
  private options;
  /**
   * @param {Compiler} compiler
   */
  apply(compiler: Compiler): void;
}
declare namespace CopyPlugin {
  export {
    Schema,
    Compiler,
    Compilation,
    WebpackError,
    Asset,
    GlobbyOptions,
    GlobEntry,
    WebpackLogger,
    CacheFacade,
    Etag,
    Snapshot,
    Force,
    CopiedResult,
    StringPattern,
    NoErrorOnMissing,
    Context,
    From,
    ToFunction,
    To,
    ToType,
    TransformerFunction,
    TransformerCacheObject,
    TransformerObject,
    Transform,
    Filter,
    TransformAllFunction,
    Info,
    ObjectPattern,
    Pattern,
    AdditionalOptions,
    PluginOptions,
  };
}
type Compiler = import("webpack").Compiler;
type PluginOptions = {
  patterns: Pattern[];
  options?: AdditionalOptions | undefined;
};
type Schema = import("schema-utils/declarations/validate").Schema;
type Compilation = import("webpack").Compilation;
type WebpackError = import("webpack").WebpackError;
type Asset = import("webpack").Asset;
type GlobbyOptions = import("globby").Options;
type GlobEntry = import("globby").GlobEntry;
type WebpackLogger = ReturnType<Compilation["getLogger"]>;
type CacheFacade = ReturnType<Compilation["getCache"]>;
type Etag = ReturnType<
  ReturnType<Compilation["getCache"]>["getLazyHashedEtag"]
>;
type Snapshot = ReturnType<Compilation["fileSystemInfo"]["mergeSnapshots"]>;
type Force = boolean;
type CopiedResult = {
  sourceFilename: string;
  absoluteFilename: string;
  filename: string;
  source: Asset["source"];
  force: Force | undefined;
  info: Record<string, any>;
};
type StringPattern = string;
type NoErrorOnMissing = boolean;
type Context = string;
type From = string;
type ToFunction = (pathData: {
  context: string;
  absoluteFilename?: string;
}) => string | Promise<string>;
type To = string | ToFunction;
type ToType = "dir" | "file" | "template";
type TransformerFunction = (
  input: Buffer,
  absoluteFilename: string
) => string | Buffer | Promise<string> | Promise<Buffer>;
type TransformerCacheObject =
  | {
      keys: {
        [key: string]: any;
      };
    }
  | {
      keys: (
        defaultCacheKeys: {
          [key: string]: any;
        },
        absoluteFilename: string
      ) => Promise<{
        [key: string]: any;
      }>;
    };
type TransformerObject = {
  transformer: TransformerFunction;
  cache?: boolean | TransformerCacheObject | undefined;
};
type Transform = TransformerFunction | TransformerObject;
type Filter = (filepath: string) => boolean | Promise<boolean>;
type TransformAllFunction = (
  data: {
    data: Buffer;
    sourceFilename: string;
    absoluteFilename: string;
  }[]
) => string | Buffer | Promise<string> | Promise<Buffer>;
type Info =
  | Record<string, any>
  | ((item: {
      absoluteFilename: string;
      sourceFilename: string;
      filename: string;
      toType: ToType;
    }) => Record<string, any>);
type ObjectPattern = {
  from: From;
  globOptions?: import("globby").Options | undefined;
  context?: string | undefined;
  to?: To | undefined;
  toType?: ToType | undefined;
  info?: Info | undefined;
  filter?: Filter | undefined;
  transform?: Transform | undefined;
  transformAll?: TransformAllFunction | undefined;
  force?: boolean | undefined;
  priority?: number | undefined;
  noErrorOnMissing?: boolean | undefined;
};
type Pattern = StringPattern | ObjectPattern;
type AdditionalOptions = {
  concurrency?: number | undefined;
};
