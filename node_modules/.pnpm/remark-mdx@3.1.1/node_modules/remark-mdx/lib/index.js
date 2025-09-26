/**
 * @import {ToMarkdownOptions} from 'mdast-util-mdx'
 * @import {Options as MicromarkOptions} from 'micromark-extension-mdxjs'
 * @import {Processor} from 'unified'
 */

/**
 * @typedef {MicromarkOptions & ToMarkdownOptions} Options
 *   Configuration.
 */

import {mdxFromMarkdown, mdxToMarkdown} from 'mdast-util-mdx'
import {mdxjs} from 'micromark-extension-mdxjs'

/** @type {Readonly<Options>} */
const emptyOptions = {}

/**
 * Add support for MDX (JSX: `<Video id={123} />`, export/imports: `export {x}
 * from 'y'`; and expressions: `{1 + 1}`).
 *
 * @this {Processor}
 *   Processor.
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export default function remarkMdx(options) {
  const self = this
  const settings = options || emptyOptions
  const data = self.data()

  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = [])
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
  const toMarkdownExtensions =
    data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

  micromarkExtensions.push(mdxjs(settings))
  fromMarkdownExtensions.push(mdxFromMarkdown())
  toMarkdownExtensions.push(mdxToMarkdown(settings))
}
