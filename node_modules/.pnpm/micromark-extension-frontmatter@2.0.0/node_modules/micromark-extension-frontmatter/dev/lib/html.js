/**
 * @typedef {import('micromark-util-types').CompileContext} CompileContext
 * @typedef {import('micromark-util-types').Handle} Handle
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 * @typedef {import('micromark-util-types').TokenType} TokenType
 * @typedef {import('./to-matters.js').Options} Options
 */

import {toMatters} from './to-matters.js'

/**
 * Create an extension for `micromark` to support frontmatter when serializing
 * to HTML.
 *
 * > 👉 **Note**: this makes sure nothing is generated in the output HTML for
 * > frontmatter.
 *
 * @param {Options | null | undefined} [options='yaml']
 *   Configuration (default: `'yaml'`).
 * @returns {HtmlExtension}
 *   Extension for `micromark` that can be passed in `htmlExtensions`, to
 *   support frontmatter when serializing to HTML.
 */
export function frontmatterHtml(options) {
  const matters = toMatters(options)
  /** @type {HtmlExtension['enter']} */
  const enter = {}
  /** @type {HtmlExtension['exit']} */
  const exit = {}
  let index = -1

  while (++index < matters.length) {
    const type = /** @type {TokenType} */ (matters[index].type)
    enter[type] = start
    exit[type] = end
  }

  return {enter, exit}

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function start() {
    this.buffer()
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function end() {
    this.resume()
    this.setData('slurpOneLineEnding', true)
  }
}
