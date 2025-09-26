export type Compilation = import("webpack").Compilation;
export type Module = import("webpack").Module;
export type LoaderContext = import("webpack").LoaderContext<any>;
export const ABSOLUTE_PUBLIC_PATH: "webpack:///mini-css-extract-plugin/";
export const AUTO_PUBLIC_PATH: "__mini_css_extract_plugin_public_path_auto__";
export const BASE_URI: "webpack://";
export const MODULE_TYPE: "css/mini-extract";
export const SINGLE_DOT_PATH_SEGMENT: "__mini_css_extract_plugin_single_dot_path_segment__";
/**
 * @param {Module} a a
 * @param {Module} b b
 * @returns {0 | 1 | -1} result of comparing
 */
export function compareModulesByIdentifier(a: Module, b: Module): 0 | 1 | -1;
/**
 * @param {Record<string | number, boolean>} map value map
 * @returns {boolean | ((value: string) => string)} true/false, when unconditionally true/false, or a template function to determine the value at runtime
 */
export function compileBooleanMatcher(
  map: Record<string | number, boolean>,
): boolean | ((value: string) => string);
/**
 * @param {LoaderContext} loaderContext loader context
 * @param {string | Buffer} code code
 * @param {string} filename filename
 * @returns {Record<string, any>} exports of a module
 */
export function evalModuleCode(
  loaderContext: LoaderContext,
  code: string | Buffer,
  filename: string,
): Record<string, any>;
/**
 * @param {Compilation} compilation compilation
 * @param {string | number} id module id
 * @returns {null | Module} the found module
 */
export function findModuleById(
  compilation: Compilation,
  id: string | number,
): null | Module;
/**
 * @param {string} filename filename
 * @param {string} outputPath output path
 * @param {boolean} enforceRelative true when need to enforce relative path, otherwise false
 * @returns {string} undo path
 */
export function getUndoPath(
  filename: string,
  outputPath: string,
  enforceRelative: boolean,
): string;
/**
 * @param {string | Function} value local
 * @returns {string} stringified local
 */
export function stringifyLocal(value: string | Function): string;
/**
 * @param {LoaderContext} loaderContext the loader context
 * @param {string} request a request
 * @returns {string} a stringified request
 */
export function stringifyRequest(
  loaderContext: LoaderContext,
  request: string,
): string;
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Module} Module */
/** @typedef {import("webpack").LoaderContext<any>} LoaderContext */
/**
 * @returns {boolean} always returns true
 */
export function trueFn(): boolean;
