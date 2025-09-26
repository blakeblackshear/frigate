/**
 * @import {Program} from 'estree-jsx'
 * @import {Root} from 'mdast'
 * @import {Processor} from 'unified'
 * @import {Compatible, VFile} from 'vfile'
 * @import {CompileOptions} from '../compile.js'
 */

/**
 * @typedef FormatAwareProcessors
 *   Result.
 * @property {ReadonlyArray<string>} extnames
 *   Extensions to use.
 * @property {Process} process
 *   Smart processor, async.
 *
 * @callback Process
 *   Smart processor.
 * @param {Compatible} vfileCompatible
 *   MDX or markdown document.
 * @return {Promise<VFile>}
 *   File.
 */

import {createProcessor} from '../core.js'
import {md, mdx} from './extnames.js'
import {resolveFileAndOptions} from './resolve-file-and-options.js'

/**
 * Create smart processors to handle different formats.
 *
 * @param {Readonly<CompileOptions> | null | undefined} [compileOptions]
 *   Configuration (optional).
 * @return {FormatAwareProcessors}
 *   Smart processor.
 */
export function createFormatAwareProcessors(compileOptions) {
  const compileOptions_ = compileOptions || {}
  const mdExtensions = compileOptions_.mdExtensions || md
  const mdxExtensions = compileOptions_.mdxExtensions || mdx
  /** @type {Processor<Root, Program, Program, Program, string>} */
  let cachedMarkdown
  /** @type {Processor<Root, Program, Program, Program, string>} */
  let cachedMdx

  return {
    extnames:
      compileOptions_.format === 'md'
        ? mdExtensions
        : compileOptions_.format === 'mdx'
          ? mdxExtensions
          : [...mdExtensions, ...mdxExtensions],
    process
  }

  /**
   * Smart processor.
   *
   * @type {Process}
   */
  function process(vfileCompatible) {
    const {file, processor} = split(vfileCompatible)
    return processor.process(file)
  }

  /**
   * Make a full vfile from what’s given, and figure out which processor
   * should be used for it.
   * This caches processors (one for markdown and one for MDX) so that they do
   * not have to be reconstructed for each file.
   *
   * @param {Compatible} vfileCompatible
   *   MDX or markdown document.
   * @return {{file: VFile, processor: Processor<Root, Program, Program, Program, string>}}
   *   File and corresponding processor.
   */
  function split(vfileCompatible) {
    const {file, options} = resolveFileAndOptions(
      vfileCompatible,
      compileOptions_
    )
    const processor =
      options.format === 'md'
        ? cachedMarkdown || (cachedMarkdown = createProcessor(options))
        : cachedMdx || (cachedMdx = createProcessor(options))
    return {file, processor}
  }
}
