/**
 * @import {Compatible} from 'vfile'
 * @import {CompileOptions} from '../compile.js'
 * @import {ProcessorOptions} from '../core.js'
 */

import {VFile} from 'vfile'
import {md} from './extnames.js'

/**
 * Create a file and options from a given `vfileCompatible` and options that
 * might contain `format: 'detect'`.
 *
 * @param {Readonly<Compatible>} vfileCompatible
 *   File.
 * @param {Readonly<CompileOptions> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {{file: VFile, options: ProcessorOptions}}
 *   File and options.
 */
export function resolveFileAndOptions(vfileCompatible, options) {
  const file = looksLikeAVFile(vfileCompatible)
    ? vfileCompatible
    : new VFile(vfileCompatible)
  const {format, ...rest} = options || {}
  return {
    file,
    options: {
      format:
        format === 'md' || format === 'mdx'
          ? format
          : file.extname && (rest.mdExtensions || md).includes(file.extname)
            ? 'md'
            : 'mdx',
      ...rest
    }
  }
}

/**
 * @param {Readonly<Compatible> | null | undefined} [value]
 *   Thing.
 * @returns {value is VFile}
 *   Check.
 */
function looksLikeAVFile(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'message' in value &&
      'messages' in value
  )
}
