/**
 * @import {Compatible, VFile} from 'vfile'
 * @import {ProcessorOptions} from './core.js'
 */

/**
 * @typedef {Omit<ProcessorOptions, 'format'>} CoreProcessorOptions
 *   Core configuration.
 *
 * @typedef ExtraOptions
 *   Extra configuration.
 * @property {'detect' | 'md' | 'mdx' | null | undefined} [format='detect']
 *   Format of `file` (default: `'detect'`).
 *
 * @typedef {CoreProcessorOptions & ExtraOptions} CompileOptions
 *   Configuration for `compile`.
 *
 *   `CompileOptions` is the same as `ProcessorOptions` with the exception that
 *   the `format` option supports a `'detect'` value, which is the default.
 *   The `'detect'` format means to use `'md'` for files with an extension in
 *   `mdExtensions` and `'mdx'` otherwise.
 */

import {resolveFileAndOptions} from './util/resolve-file-and-options.js'
import {createProcessor} from './core.js'

/**
 * Compile MDX to JS.
 *
 * @param {Readonly<Compatible>} vfileCompatible
 *   MDX document to parse.
 * @param {Readonly<CompileOptions> | null | undefined} [compileOptions]
 *   Compile configuration (optional).
 * @return {Promise<VFile>}
 *   Promise to compiled file.
 */
export function compile(vfileCompatible, compileOptions) {
  const {file, options} = resolveFileAndOptions(vfileCompatible, compileOptions)
  return createProcessor(options).process(file)
}

/**
 * Synchronously compile MDX to JS.
 *
 * When possible please use the async `compile`.
 *
 * @param {Readonly<Compatible>} vfileCompatible
 *   MDX document to parse.
 * @param {Readonly<CompileOptions> | null | undefined} [compileOptions]
 *   Compile configuration (optional).
 * @return {VFile}
 *   Compiled file.
 */
export function compileSync(vfileCompatible, compileOptions) {
  const {file, options} = resolveFileAndOptions(vfileCompatible, compileOptions)
  return createProcessor(options).processSync(file)
}
