/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownOptions
 * @typedef {import('unified').Compiler<Root, string>} Compiler
 * @typedef {import('unified').Processor<undefined, undefined, undefined, Root, string>} Processor
 */

/**
 * @typedef {Omit<ToMarkdownOptions, 'extensions'>} Options
 */

import {toMarkdown} from 'mdast-util-to-markdown'

/**
 * Add support for serializing to markdown.
 *
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export default function remarkStringify(options) {
  /** @type {Processor} */
  // @ts-expect-error: TS in JSDoc generates wrong types if `this` is typed regularly.
  const self = this

  self.compiler = compiler

  /**
   * @type {Compiler}
   */
  function compiler(tree) {
    return toMarkdown(tree, {
      ...self.data('settings'),
      ...options,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: self.data('toMarkdownExtensions') || []
    })
  }
}
