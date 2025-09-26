/// <reference types="remark-parse" />
/// <reference types="remark-stringify" />

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('micromark-extension-frontmatter').Options} Options
 * @typedef {import('unified').Processor<Root>} Processor
 */

import {
  frontmatterFromMarkdown,
  frontmatterToMarkdown
} from 'mdast-util-frontmatter'
import {frontmatter} from 'micromark-extension-frontmatter'

/** @type {Options} */
const emptyOptions = 'yaml'

/**
 * Add support for frontmatter.
 *
 * ###### Notes
 *
 * Doesn’t parse the data inside them: create your own plugin to do that.
 *
 * @param {Options | null | undefined} [options='yaml']
 *   Configuration (default: `'yaml'`).
 * @returns {undefined}
 *   Nothing.
 */
export default function remarkFrontmatter(options) {
  // @ts-expect-error: TS is wrong about `this`.
  // eslint-disable-next-line unicorn/no-this-assignment
  const self = /** @type {Processor} */ (this)
  const settings = options || emptyOptions
  const data = self.data()

  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = [])
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
  const toMarkdownExtensions =
    data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

  micromarkExtensions.push(frontmatter(settings))
  fromMarkdownExtensions.push(frontmatterFromMarkdown(settings))
  toMarkdownExtensions.push(frontmatterToMarkdown(settings))
}
