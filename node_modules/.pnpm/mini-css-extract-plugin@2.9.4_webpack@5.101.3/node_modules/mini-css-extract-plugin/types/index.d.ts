export = MiniCssExtractPlugin;
declare class MiniCssExtractPlugin {
  /**
   * @param {Compiler["webpack"]} webpack webpack
   * @returns {CssModuleConstructor} CSS module constructor
   */
  static getCssModule(webpack: Compiler["webpack"]): CssModuleConstructor;
  /**
   * @param {Compiler["webpack"]} webpack webpack
   * @returns {CssDependencyConstructor} CSS dependency constructor
   */
  static getCssDependency(
    webpack: Compiler["webpack"],
  ): CssDependencyConstructor;
  /**
   * Returns all hooks for the given compilation
   * @param {Compilation} compilation the compilation
   * @returns {MiniCssExtractPluginCompilationHooks} hooks
   */
  static getCompilationHooks(
    compilation: Compilation,
  ): MiniCssExtractPluginCompilationHooks;
  /**
   * @param {PluginOptions=} options options
   */
  constructor(options?: PluginOptions | undefined);
  /**
   * @private
   * @type {WeakMap<Chunk, Set<CssModule>>}
   */
  private _sortedModulesCache;
  /**
   * @private
   * @type {NormalizedPluginOptions}
   */
  private options;
  /**
   * @private
   * @type {RuntimeOptions}
   */
  private runtimeOptions;
  /**
   * @param {Compiler} compiler compiler
   */
  apply(compiler: Compiler): void;
  /**
   * @private
   * @param {Chunk} chunk chunk
   * @param {ChunkGraph} chunkGraph chunk graph
   * @returns {Iterable<Module>} modules
   */
  private getChunkModules;
  /**
   * @private
   * @param {Compilation} compilation compilation
   * @param {Chunk} chunk chunk
   * @param {CssModule[]} modules modules
   * @param {Compilation["requestShortener"]} requestShortener request shortener
   * @returns {Set<CssModule>} css modules
   */
  private sortModules;
  /**
   * @private
   * @param {Compiler} compiler compiler
   * @param {Compilation} compilation compilation
   * @param {Chunk} chunk chunk
   * @param {CssModule[]} modules modules
   * @param {Compiler["requestShortener"]} requestShortener request shortener
   * @param {string} filenameTemplate filename template
   * @param {Parameters<Exclude<Required<Configuration>['output']['filename'], string | undefined>>[0]} pathData path data
   * @returns {Source} source
   */
  private renderContentAsset;
}
declare namespace MiniCssExtractPlugin {
  export {
    pluginName,
    pluginSymbol,
    loader,
    Schema,
    Compiler,
    Compilation,
    ChunkGraph,
    Chunk,
    ChunkGroup,
    Module,
    Dependency,
    Source,
    Configuration,
    WebpackError,
    AssetInfo,
    LoaderDependency,
    Filename,
    ChunkFilename,
    LoaderOptions,
    PluginOptions,
    NormalizedPluginOptions,
    RuntimeOptions,
    CssModuleDependency,
    CssModule,
    CssModuleConstructor,
    CssDependency,
    CssDependencyOptions,
    CssDependencyConstructor,
    VarNames,
    MiniCssExtractPluginCompilationHooks,
  };
}
/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").ChunkGraph} ChunkGraph */
/** @typedef {import("webpack").Chunk} Chunk */
/** @typedef {import("webpack").ChunkGroup} ChunkGroup */
/** @typedef {import("webpack").Module} Module */
/** @typedef {import("webpack").Dependency} Dependency */
/** @typedef {import("webpack").sources.Source} Source */
/** @typedef {import("webpack").Configuration} Configuration */
/** @typedef {import("webpack").WebpackError} WebpackError */
/** @typedef {import("webpack").AssetInfo} AssetInfo */
/** @typedef {import("./loader.js").Dependency} LoaderDependency */
/** @typedef {NonNullable<Required<Configuration>['output']['filename']>} Filename */
/** @typedef {NonNullable<Required<Configuration>['output']['chunkFilename']>} ChunkFilename */
/**
 * @typedef {object} LoaderOptions
 * @property {string | ((resourcePath: string, rootContext: string) => string)=} publicPath public path
 * @property {boolean=} emit true when need to emit, otherwise false
 * @property {boolean=} esModule need to generate ES module syntax
 * @property {string=} layer a layer
 * @property {boolean=} defaultExport true when need to use default export, otherwise false
 */
/**
 * @typedef {object} PluginOptions
 * @property {Filename=} filename filename
 * @property {ChunkFilename=} chunkFilename chunk filename
 * @property {boolean=} ignoreOrder true when need to ignore order, otherwise false
 * @property {string | ((linkTag: HTMLLinkElement) => void)=} insert link insert place or a custom insert function
 * @property {Record<string, string>=} attributes link attributes
 * @property {string | false | 'text/css'=} linkType value of a link type attribute
 * @property {boolean=} runtime true when need to generate runtime code, otherwise false
 * @property {boolean=} experimentalUseImportModule true when need to use `experimentalUseImportModule` API, otherwise false
 */
/**
 * @typedef {object} NormalizedPluginOptions
 * @property {Filename} filename filename
 * @property {ChunkFilename=} chunkFilename chunk filename
 * @property {boolean} ignoreOrder true when need to ignore order, otherwise false
 * @property {string | ((linkTag: HTMLLinkElement) => void)=} insert a link insert place or a custom insert function
 * @property {Record<string, string>=} attributes link attributes
 * @property {string | false | 'text/css'=} linkType value of a link type attribute
 * @property {boolean} runtime true when need to generate runtime code, otherwise false
 * @property {boolean=} experimentalUseImportModule true when need to use `experimentalUseImportModule` API, otherwise false
 */
/**
 * @typedef {object} RuntimeOptions
 * @property {string | ((linkTag: HTMLLinkElement) => void)=} insert a link insert place or a custom insert function
 * @property {string | false | 'text/css'} linkType value of a link type attribute
 * @property {Record<string, string>=} attributes link attributes
 */
declare const pluginName: "mini-css-extract-plugin";
declare const pluginSymbol: unique symbol;
declare var loader: string;
type Schema = import("schema-utils/declarations/validate").Schema;
type Compiler = import("webpack").Compiler;
type Compilation = import("webpack").Compilation;
type ChunkGraph = import("webpack").ChunkGraph;
type Chunk = import("webpack").Chunk;
type ChunkGroup = import("webpack").ChunkGroup;
type Module = import("webpack").Module;
type Dependency = import("webpack").Dependency;
type Source = import("webpack").sources.Source;
type Configuration = import("webpack").Configuration;
type WebpackError = import("webpack").WebpackError;
type AssetInfo = import("webpack").AssetInfo;
type LoaderDependency = import("./loader.js").Dependency;
type Filename = NonNullable<Required<Configuration>["output"]["filename"]>;
type ChunkFilename = NonNullable<
  Required<Configuration>["output"]["chunkFilename"]
>;
type LoaderOptions = {
  /**
   * public path
   */
  publicPath?:
    | (string | ((resourcePath: string, rootContext: string) => string))
    | undefined;
  /**
   * true when need to emit, otherwise false
   */
  emit?: boolean | undefined;
  /**
   * need to generate ES module syntax
   */
  esModule?: boolean | undefined;
  /**
   * a layer
   */
  layer?: string | undefined;
  /**
   * true when need to use default export, otherwise false
   */
  defaultExport?: boolean | undefined;
};
type PluginOptions = {
  /**
   * filename
   */
  filename?: Filename | undefined;
  /**
   * chunk filename
   */
  chunkFilename?: ChunkFilename | undefined;
  /**
   * true when need to ignore order, otherwise false
   */
  ignoreOrder?: boolean | undefined;
  /**
   * link insert place or a custom insert function
   */
  insert?: (string | ((linkTag: HTMLLinkElement) => void)) | undefined;
  /**
   * link attributes
   */
  attributes?: Record<string, string> | undefined;
  /**
   * value of a link type attribute
   */
  linkType?: (string | false | "text/css") | undefined;
  /**
   * true when need to generate runtime code, otherwise false
   */
  runtime?: boolean | undefined;
  /**
   * true when need to use `experimentalUseImportModule` API, otherwise false
   */
  experimentalUseImportModule?: boolean | undefined;
};
type NormalizedPluginOptions = {
  /**
   * filename
   */
  filename: Filename;
  /**
   * chunk filename
   */
  chunkFilename?: ChunkFilename | undefined;
  /**
   * true when need to ignore order, otherwise false
   */
  ignoreOrder: boolean;
  /**
   * a link insert place or a custom insert function
   */
  insert?: (string | ((linkTag: HTMLLinkElement) => void)) | undefined;
  /**
   * link attributes
   */
  attributes?: Record<string, string> | undefined;
  /**
   * value of a link type attribute
   */
  linkType?: (string | false | "text/css") | undefined;
  /**
   * true when need to generate runtime code, otherwise false
   */
  runtime: boolean;
  /**
   * true when need to use `experimentalUseImportModule` API, otherwise false
   */
  experimentalUseImportModule?: boolean | undefined;
};
type RuntimeOptions = {
  /**
   * a link insert place or a custom insert function
   */
  insert?: (string | ((linkTag: HTMLLinkElement) => void)) | undefined;
  /**
   * value of a link type attribute
   */
  linkType: string | false | "text/css";
  /**
   * link attributes
   */
  attributes?: Record<string, string> | undefined;
};
type CssModuleDependency = {
  context: string | null;
  identifier: string;
  identifierIndex: number;
  content: Buffer;
  sourceMap?: Buffer;
  media?: string;
  supports?: string;
  layer?: any;
  assetsInfo?: Map<string, AssetInfo>;
  assets?: {
    [key: string]: Source;
  };
};
type CssModule = Module & {
  content: Buffer;
  media?: string;
  sourceMap?: Buffer;
  supports?: string;
  layer?: string;
  assets?: {
    [key: string]: Source;
  };
  assetsInfo?: Map<string, AssetInfo>;
};
type CssModuleConstructor = {
  new (dependency: CssModuleDependency): CssModule;
};
type CssDependency = Dependency & CssModuleDependency;
type CssDependencyOptions = Omit<LoaderDependency, "context">;
type CssDependencyConstructor = {
  new (
    loaderDependency: CssDependencyOptions,
    context: string | null,
    identifierIndex: number,
  ): CssDependency;
};
type VarNames = {
  /**
   * tag
   */
  tag: string;
  /**
   * chunk id
   */
  chunkId: string;
  /**
   * href
   */
  href: string;
  /**
   * resolve
   */
  resolve: string;
  /**
   * reject
   */
  reject: string;
};
type MiniCssExtractPluginCompilationHooks = {
  /**
   * before tag insert hook
   */
  beforeTagInsert: import("tapable").SyncWaterfallHook<
    [string, VarNames],
    string
  >;
  /**
   * link preload hook
   */
  linkPreload: SyncWaterfallHook<[string, Chunk]>;
  /**
   * link prefetch hook
   */
  linkPrefetch: SyncWaterfallHook<[string, Chunk]>;
};
import { SyncWaterfallHook } from "tapable";
