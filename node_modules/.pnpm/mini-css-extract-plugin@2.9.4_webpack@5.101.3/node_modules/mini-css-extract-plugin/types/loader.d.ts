export = loader;
/**
 * @this {import("webpack").LoaderContext<LoaderOptions>}
 * @param {string} content content
 * @returns {string | undefined} the original content
 */
declare function loader(
  this: import("webpack").LoaderContext<MiniCssExtractPlugin.LoaderOptions>,
  content: string,
): string | undefined;
declare namespace loader {
  export {
    hotLoader,
    pitch,
    Schema,
    Compiler,
    Compilation,
    Chunk,
    Module,
    Source,
    AssetInfo,
    NormalModule,
    LoaderOptions,
    Locals,
    EXPECTED_ANY,
    Dependency,
  };
}
import MiniCssExtractPlugin = require("./index");
/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Chunk} Chunk */
/** @typedef {import("webpack").Module} Module */
/** @typedef {import("webpack").sources.Source} Source */
/** @typedef {import("webpack").AssetInfo} AssetInfo */
/** @typedef {import("webpack").NormalModule} NormalModule */
/** @typedef {import("./index.js").LoaderOptions} LoaderOptions */
/** @typedef {{[key: string]: string | Function }} Locals */
/** @typedef {any} EXPECTED_ANY */
/**
 * @typedef {object} Dependency
 * @property {string} identifier identifier
 * @property {string | null} context context
 * @property {Buffer} content content
 * @property {string=} media media
 * @property {string=} supports supports
 * @property {string=} layer layer
 * @property {Buffer=} sourceMap source map
 */
/**
 * @param {string} code code
 * @param {{ loaderContext: import("webpack").LoaderContext<LoaderOptions>, options: LoaderOptions, locals: Locals | undefined }} context context
 * @returns {string} code and HMR code
 */
declare function hotLoader(
  code: string,
  context: {
    loaderContext: import("webpack").LoaderContext<LoaderOptions>;
    options: LoaderOptions;
    locals: Locals | undefined;
  },
): string;
/**
 * @this {import("webpack").LoaderContext<LoaderOptions>}
 * @param {string} request request
 */
declare function pitch(
  this: import("webpack").LoaderContext<MiniCssExtractPlugin.LoaderOptions>,
  request: string,
): void;
type Schema = import("schema-utils/declarations/validate").Schema;
type Compiler = import("webpack").Compiler;
type Compilation = import("webpack").Compilation;
type Chunk = import("webpack").Chunk;
type Module = import("webpack").Module;
type Source = import("webpack").sources.Source;
type AssetInfo = import("webpack").AssetInfo;
type NormalModule = import("webpack").NormalModule;
type LoaderOptions = import("./index.js").LoaderOptions;
type Locals = {
  [key: string]: string | Function;
};
type EXPECTED_ANY = any;
type Dependency = {
  /**
   * identifier
   */
  identifier: string;
  /**
   * context
   */
  context: string | null;
  /**
   * content
   */
  content: Buffer;
  /**
   * media
   */
  media?: string | undefined;
  /**
   * supports
   */
  supports?: string | undefined;
  /**
   * layer
   */
  layer?: string | undefined;
  /**
   * source map
   */
  sourceMap?: Buffer | undefined;
};
