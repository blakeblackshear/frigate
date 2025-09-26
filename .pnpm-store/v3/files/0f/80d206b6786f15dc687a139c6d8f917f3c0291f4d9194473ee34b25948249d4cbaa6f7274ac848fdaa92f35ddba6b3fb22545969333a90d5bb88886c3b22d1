/**
 * @typedef {import('mdast').Literal} Literal
 *
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 *
 * @typedef {import('micromark-extension-frontmatter').Info} Info
 * @typedef {import('micromark-extension-frontmatter').Matter} Matter
 * @typedef {import('micromark-extension-frontmatter').Options} Options
 */

import {ok as assert} from 'devlop'
import {toMatters} from 'micromark-extension-frontmatter'
import escapeStringRegexp from 'escape-string-regexp'

/**
 * Create an extension for `mdast-util-from-markdown`.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown`.
 */
export function frontmatterFromMarkdown(options) {
  const matters = toMatters(options)
  /** @type {FromMarkdownExtension['enter']} */
  const enter = {}
  /** @type {FromMarkdownExtension['exit']} */
  const exit = {}
  let index = -1

  while (++index < matters.length) {
    const matter = matters[index]
    enter[matter.type] = opener(matter)
    exit[matter.type] = close
    exit[matter.type + 'Value'] = value
  }

  return {enter, exit}
}

/**
 * @param {Matter} matter
 * @returns {FromMarkdownHandle} enter
 */
function opener(matter) {
  return open

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function open(token) {
    // @ts-expect-error: custom.
    this.enter({type: matter.type, value: ''}, token)
    this.buffer()
  }
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function close(token) {
  const data = this.resume()
  const node = this.stack[this.stack.length - 1]
  assert('value' in node)
  this.exit(token)
  // Remove the initial and final eol.
  node.value = data.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, '')
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function value(token) {
  this.config.enter.data.call(this, token)
  this.config.exit.data.call(this, token)
}

/**
 * Create an extension for `mdast-util-to-markdown`.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown`.
 */
export function frontmatterToMarkdown(options) {
  /** @type {ToMarkdownExtension['unsafe']} */
  const unsafe = []
  /** @type {ToMarkdownExtension['handlers']} */
  const handlers = {}
  const matters = toMatters(options)
  let index = -1

  while (++index < matters.length) {
    const matter = matters[index]

    // @ts-expect-error: this can add custom frontmatter nodes.
    // Typing those is the responsibility of the end user.
    handlers[matter.type] = handler(matter)

    const open = fence(matter, 'open')

    unsafe.push({
      atBreak: true,
      character: open.charAt(0),
      after: escapeStringRegexp(open.charAt(1))
    })
  }

  return {unsafe, handlers}
}

/**
 * Create a handle that can serialize a frontmatter node as markdown.
 *
 * @param {Matter} matter
 *   Structure.
 * @returns {(node: Literal) => string} enter
 *   Handler.
 */
function handler(matter) {
  const open = fence(matter, 'open')
  const close = fence(matter, 'close')

  return handle

  /**
   * Serialize a frontmatter node as markdown.
   *
   * @param {Literal} node
   *   Node to serialize.
   * @returns {string}
   *   Serialized node.
   */
  function handle(node) {
    return open + (node.value ? '\n' + node.value : '') + '\n' + close
  }
}

/**
 * Get an `open` or `close` fence.
 *
 * @param {Matter} matter
 *   Structure.
 * @param {'close' | 'open'} prop
 *   Field to get.
 * @returns {string}
 *   Fence.
 */
function fence(matter, prop) {
  return matter.marker
    ? pick(matter.marker, prop).repeat(3)
    : // @ts-expect-error: They’re mutually exclusive.
      pick(matter.fence, prop)
}

/**
 * Take `open` or `close` fields when schema is an info object, or use the
 * given value when it is a string.
 *
 * @param {Info | string} schema
 *   Info object or value.
 * @param {'close' | 'open'} prop
 *   Field to get.
 * @returns {string}
 *   Thing to use for the opening or closing.
 */
function pick(schema, prop) {
  return typeof schema === 'string' ? schema : schema[prop]
}
