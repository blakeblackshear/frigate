import type {Root} from 'mdast'
import type {Options as ToMarkdownExtension} from 'mdast-util-to-markdown'
import type {Plugin} from 'unified'
import type {Options} from './lib/index.js'

export type {Options} from './lib/index.js'

/**
 * Add support for serializing to markdown.
 *
 * @this
 *   Unified processor.
 * @param
 *   Configuration (optional).
 * @returns
 *   Nothing.
 */
declare const remarkStringify: Plugin<
  [(Readonly<Options> | null | undefined)?],
  Root,
  string
>
export default remarkStringify

// Add custom settings supported when `remark-stringify` is added.
declare module 'unified' {
  interface Settings extends Options {}

  interface Data {
    /**
     * List of `mdast-util-to-markdown` extensions to use.
     *
     * This type is registered by `remark-stringify`.
     * Values can be registered by remark plugins that extend
     * `mdast-util-to-markdown`.
     * See {@link ToMarkdownExtension | `Options`} from
     * {@link https://github.com/syntax-tree/mdast-util-to-markdown#options | `mdast-util-to-markdown`}.
     */
    toMarkdownExtensions?: ToMarkdownExtension[]
  }
}
