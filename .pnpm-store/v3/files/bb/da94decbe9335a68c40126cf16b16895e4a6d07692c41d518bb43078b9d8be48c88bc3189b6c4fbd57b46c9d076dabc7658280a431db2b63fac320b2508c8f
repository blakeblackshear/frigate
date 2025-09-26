/**
 * @typedef {import('astring').State} State
 * @typedef {import('estree-jsx').Node} Nodes
 * @typedef {import('estree-jsx').Program} Program
 * @typedef {typeof import('source-map').SourceMapGenerator} SourceMapGenerator
 * @typedef {import('source-map').RawSourceMap} Map
 */

/**
 * @typedef {Record<Nodes['type'], Handler>} Generator
 *
 * @callback Handler
 *  Handle a particular node.
 * @param {Generator} this
 *   `astring` generator.
 * @param {any} node
 *   Node to serialize.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 *
 * @typedef {Partial<import('astring').Generator>} Handlers
 */

/**
 * @typedef {OptionsWithMaybeMapGenerator} Options
 *   Configuration.
 *
 * @typedef OptionsFieldsBase
 *   Base shared option fields.
 * @property {Handlers | null | undefined} [handlers]
 *   Object mapping node types to functions handling the corresponding nodes.
 *
 * @typedef OptionsFieldsWithoutSourceMapGenerator
 *   Extra option fields where there’s definitely no source map generator.
 * @property {null | undefined} [SourceMapGenerator]
 *   Generate a source map by passing a `SourceMapGenerator` from `source-map`
 *   in; this works if there is positional info on nodes.
 * @property {null | undefined} [filePath]
 *   Path to input file; only used in source map.
 *
 * @typedef OptionsFieldsWithSourceMapGenerator
 *   Extra option fields where there’s definitely a source map generator.
 * @property {SourceMapGenerator} SourceMapGenerator
 *   Generate a source map by passing a `SourceMapGenerator` from `source-map`
 *   in; this works if there is positional info on nodes.
 * @property {string | null | undefined} [filePath]
 *   Path to input file; only used in source map.
 *
 * @typedef OptionsFieldsMaybeSourceMapGenerator
 *   Extra option fields where there may or may not be a source map generator.
 * @property {SourceMapGenerator | null | undefined} [SourceMapGenerator]
 *   Generate a source map by passing a `SourceMapGenerator` from `source-map`
 *   in; this works if there is positional info on nodes.
 * @property {string | null | undefined} [filePath]
 *   Path to input file; only used in source map.
 *
 * @typedef {OptionsFieldsBase & OptionsFieldsWithoutSourceMapGenerator} OptionsWithoutSourceMapGenerator
 *   Options where there’s definitely no source map generator.
 * @typedef {OptionsFieldsBase & OptionsFieldsWithSourceMapGenerator} OptionsWithSourceMapGenerator
 *   Options where there’s definitely a source map generator.
 * @typedef {OptionsFieldsBase & OptionsFieldsMaybeSourceMapGenerator} OptionsWithMaybeMapGenerator
 *   Options where there may or may not be a source map generator.
 *
 * @typedef {ResultWithMaybeSourceMapGenerator} Result
 *   Result.
 *
 * @typedef ResultFieldsBase
 *   Base shared result fields.
 * @property {string} value
 *   Serialized JavaScript.
 *
 * @typedef ResultFieldsWithoutSourceMapGenerator
 *   Extra result fields where there’s definitely no source map generator.
 * @property {undefined} map
 *   Source map as (parsed) JSON, if `SourceMapGenerator` is passed.
 *
 * @typedef ResultFieldsWithSourceMapGenerator
 *   Extra result fields where there’s definitely a source map generator.
 * @property {Map} map
 *   Source map as (parsed) JSON, if `SourceMapGenerator` is not passed.
 *
 * @typedef ResultFieldsMaybeSourceMapGenerator
 *   Extra result fields where there may or may not be a source map generator.
 * @property {Map | undefined} map
 *   Source map as (parsed) JSON, if `SourceMapGenerator` might be passed.
 *
 * @typedef {ResultFieldsBase & ResultFieldsWithoutSourceMapGenerator} ResultWithoutSourceMapGenerator
 *   Result where there’s definitely no source map generator.
 * @typedef {ResultFieldsBase & ResultFieldsWithSourceMapGenerator} ResultWithSourceMapGenerator
 *   Result where there’s definitely a source map generator.
 * @typedef {ResultFieldsBase & ResultFieldsMaybeSourceMapGenerator} ResultWithMaybeSourceMapGenerator
 *   Result where there may or may not be a source map generator.
 */

import {GENERATOR, generate} from 'astring'

/** @type {Options} */
const emptyOptions = {}

/**
 * Serialize an estree as JavaScript.
 *
 * @overload
 * @param {Program} tree
 * @param {OptionsWithSourceMapGenerator} options
 * @returns {ResultWithSourceMapGenerator}
 *
 * @overload
 * @param {Program} tree
 * @param {OptionsWithMaybeMapGenerator} options
 * @returns {ResultWithMaybeSourceMapGenerator}
 *
 * @overload
 * @param {Program} tree
 * @param {OptionsWithoutSourceMapGenerator | null | undefined} [options]
 * @returns {ResultWithoutSourceMapGenerator}
 *
 * @param {Program} tree
 *   Estree (esast).
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Result}
 *   Result, optionally with source map.
 */
export function toJs(tree, options) {
  const {SourceMapGenerator, filePath, handlers} = options || emptyOptions
  const sourceMap = SourceMapGenerator
    ? new SourceMapGenerator({file: filePath || '<unknown>.js'})
    : undefined

  const value = generate(
    tree,
    // @ts-expect-error: `sourceMap` can be undefined, `astring` types are buggy.
    {
      comments: true,
      generator: {...GENERATOR, ...handlers},
      sourceMap: sourceMap || undefined
    }
  )
  const map = sourceMap ? sourceMap.toJSON() : undefined

  return {value, map}
}
