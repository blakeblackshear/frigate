/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').ConstructRecord} ConstructRecord
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').TokenType} TokenType
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 *
 * @typedef {import('./to-matters.js').Info} Info
 * @typedef {import('./to-matters.js').Matter} Matter
 * @typedef {import('./to-matters.js').Options} Options
 */

import {markdownLineEnding, markdownSpace} from 'micromark-util-character'
import {codes, types} from 'micromark-util-symbol'
import {toMatters} from './to-matters.js'

/**
 * Create an extension for `micromark` to enable frontmatter syntax.
 *
 * @param {Options | null | undefined} [options='yaml']
 *   Configuration (default: `'yaml'`).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions`, to
 *   enable frontmatter syntax.
 */
export function frontmatter(options) {
  const matters = toMatters(options)
  /** @type {ConstructRecord} */
  const flow = {}
  let index = -1

  while (++index < matters.length) {
    const matter = matters[index]
    const code = fence(matter, 'open').charCodeAt(0)
    const construct = createConstruct(matter)
    const existing = flow[code]

    if (Array.isArray(existing)) {
      existing.push(construct)
    } else {
      // Never a single object, always an array.
      flow[code] = [construct]
    }
  }

  return {flow}
}

/**
 * @param {Matter} matter
 * @returns {Construct}
 */
function createConstruct(matter) {
  const anywhere = matter.anywhere
  const frontmatterType = /** @type {TokenType} */ (matter.type)
  const fenceType = /** @type {TokenType} */ (frontmatterType + 'Fence')
  const sequenceType = /** @type {TokenType} */ (fenceType + 'Sequence')
  const valueType = /** @type {TokenType} */ (frontmatterType + 'Value')
  const closingFenceConstruct = {tokenize: tokenizeClosingFence, partial: true}

  /**
   * Fence to look for.
   *
   * @type {string}
   */
  let buffer
  let bufferIndex = 0

  return {tokenize: tokenizeFrontmatter, concrete: true}

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeFrontmatter(effects, ok, nok) {
    const self = this

    return start

    /**
     * Start of frontmatter.
     *
     * ```markdown
     * > | ---
     *     ^
     *   | title: "Venus"
     *   | ---
     * ```
     *
     * @type {State}
     */
    function start(code) {
      const position = self.now()

      if (
        // Indent not allowed.
        position.column === 1 &&
        // Normally, only allowed in first line.
        (position.line === 1 || anywhere)
      ) {
        buffer = fence(matter, 'open')
        bufferIndex = 0

        if (code === buffer.charCodeAt(bufferIndex)) {
          effects.enter(frontmatterType)
          effects.enter(fenceType)
          effects.enter(sequenceType)
          return openSequence(code)
        }
      }

      return nok(code)
    }

    /**
     * In open sequence.
     *
     * ```markdown
     * > | ---
     *     ^
     *   | title: "Venus"
     *   | ---
     * ```
     *
     * @type {State}
     */
    function openSequence(code) {
      if (bufferIndex === buffer.length) {
        effects.exit(sequenceType)

        if (markdownSpace(code)) {
          effects.enter(types.whitespace)
          return openSequenceWhitespace(code)
        }

        return openAfter(code)
      }

      if (code === buffer.charCodeAt(bufferIndex++)) {
        effects.consume(code)
        return openSequence
      }

      return nok(code)
    }

    /**
     * In whitespace after open sequence.
     *
     * ```markdown
     * > | ---␠
     *        ^
     *   | title: "Venus"
     *   | ---
     * ```
     *
     * @type {State}
     */
    function openSequenceWhitespace(code) {
      if (markdownSpace(code)) {
        effects.consume(code)
        return openSequenceWhitespace
      }

      effects.exit(types.whitespace)
      return openAfter(code)
    }

    /**
     * After open sequence.
     *
     * ```markdown
     * > | ---
     *        ^
     *   | title: "Venus"
     *   | ---
     * ```
     *
     * @type {State}
     */
    function openAfter(code) {
      if (markdownLineEnding(code)) {
        effects.exit(fenceType)
        effects.enter(types.lineEnding)
        effects.consume(code)
        effects.exit(types.lineEnding)
        // Get ready for closing fence.
        buffer = fence(matter, 'close')
        bufferIndex = 0
        return effects.attempt(closingFenceConstruct, after, contentStart)
      }

      // EOF is not okay.
      return nok(code)
    }

    /**
     * Start of content chunk.
     *
     * ```markdown
     *   | ---
     * > | title: "Venus"
     *     ^
     *   | ---
     * ```
     *
     * @type {State}
     */
    function contentStart(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        return contentEnd(code)
      }

      effects.enter(valueType)
      return contentInside(code)
    }

    /**
     * In content chunk.
     *
     * ```markdown
     *   | ---
     * > | title: "Venus"
     *     ^
     *   | ---
     * ```
     *
     * @type {State}
     */
    function contentInside(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit(valueType)
        return contentEnd(code)
      }

      effects.consume(code)
      return contentInside
    }

    /**
     * End of content chunk.
     *
     * ```markdown
     *   | ---
     * > | title: "Venus"
     *                   ^
     *   | ---
     * ```
     *
     * @type {State}
     */
    function contentEnd(code) {
      // Require a closing fence.
      if (code === codes.eof) {
        return nok(code)
      }

      // Can only be an eol.
      effects.enter(types.lineEnding)
      effects.consume(code)
      effects.exit(types.lineEnding)
      return effects.attempt(closingFenceConstruct, after, contentStart)
    }

    /**
     * After frontmatter.
     *
     * ```markdown
     *   | ---
     *   | title: "Venus"
     * > | ---
     *        ^
     * ```
     *
     * @type {State}
     */
    function after(code) {
      // `code` must be eol/eof.
      effects.exit(frontmatterType)
      return ok(code)
    }
  }

  /** @type {Tokenizer} */
  function tokenizeClosingFence(effects, ok, nok) {
    let bufferIndex = 0

    return closeStart

    /**
     * Start of close sequence.
     *
     * ```markdown
     *   | ---
     *   | title: "Venus"
     * > | ---
     *     ^
     * ```
     *
     * @type {State}
     */
    function closeStart(code) {
      if (code === buffer.charCodeAt(bufferIndex)) {
        effects.enter(fenceType)
        effects.enter(sequenceType)
        return closeSequence(code)
      }

      return nok(code)
    }

    /**
     * In close sequence.
     *
     * ```markdown
     *   | ---
     *   | title: "Venus"
     * > | ---
     *     ^
     * ```
     *
     * @type {State}
     */
    function closeSequence(code) {
      if (bufferIndex === buffer.length) {
        effects.exit(sequenceType)

        if (markdownSpace(code)) {
          effects.enter(types.whitespace)
          return closeSequenceWhitespace(code)
        }

        return closeAfter(code)
      }

      if (code === buffer.charCodeAt(bufferIndex++)) {
        effects.consume(code)
        return closeSequence
      }

      return nok(code)
    }

    /**
     * In whitespace after close sequence.
     *
     * ```markdown
     * > | ---
     *   | title: "Venus"
     *   | ---␠
     *        ^
     * ```
     *
     * @type {State}
     */
    function closeSequenceWhitespace(code) {
      if (markdownSpace(code)) {
        effects.consume(code)
        return closeSequenceWhitespace
      }

      effects.exit(types.whitespace)
      return closeAfter(code)
    }

    /**
     * After close sequence.
     *
     * ```markdown
     *   | ---
     *   | title: "Venus"
     * > | ---
     *        ^
     * ```
     *
     * @type {State}
     */
    function closeAfter(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit(fenceType)
        return ok(code)
      }

      return nok(code)
    }
  }
}

/**
 * @param {Matter} matter
 * @param {'close' | 'open'} prop
 * @returns {string}
 */
function fence(matter, prop) {
  return matter.marker
    ? pick(matter.marker, prop).repeat(3)
    : // @ts-expect-error: They’re mutually exclusive.
      pick(matter.fence, prop)
}

/**
 * @param {Info | string} schema
 * @param {'close' | 'open'} prop
 * @returns {string}
 */
function pick(schema, prop) {
  return typeof schema === 'string' ? schema : schema[prop]
}
