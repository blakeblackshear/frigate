// @ts-check
"use strict";

/** @typedef {import("webpack").Compilation} Compilation */

/**
 * @type {{[sortmode: string] : (entryPointNames: Array<string>, compilation: Compilation, htmlWebpackPluginOptions: any) => Array<string> }}
 * This file contains different sort methods for the entry chunks names
 */
module.exports = {};

/**
 * Performs identity mapping (no-sort).
 * @param  {Array<string>} chunks the chunks to sort
 * @return {Array<string>} The sorted chunks
 */
module.exports.none = (chunks) => chunks;

/**
 * Sort manually by the chunks
 * @param {string[]} entryPointNames the chunks to sort
 * @param {Compilation} compilation the webpack compilation
 * @param {any} htmlWebpackPluginOptions the plugin options
 * @return {string[]} The sorted chunks
 */
module.exports.manual = (
  entryPointNames,
  compilation,
  htmlWebpackPluginOptions,
) => {
  const chunks = htmlWebpackPluginOptions.chunks;
  if (!Array.isArray(chunks)) {
    return entryPointNames;
  }
  // Remove none existing entries from
  // htmlWebpackPluginOptions.chunks
  return chunks.filter((entryPointName) => {
    return compilation.entrypoints.has(entryPointName);
  });
};

/**
 * Defines the default sorter.
 */
module.exports.auto = module.exports.none;
