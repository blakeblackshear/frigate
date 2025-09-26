/**
 * @import {Program} from 'estree'
 * @import {Acorn, AcornOptions} from 'micromark-util-events-to-acorn'
 * @import {Effects, Point, State, TokenType, TokenizeContext} from 'micromark-util-types'
 */

/**
 * @typedef MdxSignalOk
 *   Good result.
 * @property {'ok'} type
 *   Type.
 * @property {Program | undefined} estree
 *   Value.
 *
 * @typedef MdxSignalNok
 *   Bad result.
 * @property {'nok'} type
 *   Type.
 * @property {VFileMessage} message
 *   Value.
 *
 * @typedef {MdxSignalNok | MdxSignalOk} MdxSignal
 */

import {ok as assert} from 'devlop'
import {factorySpace} from 'micromark-factory-space'
import {markdownLineEnding, markdownSpace} from 'micromark-util-character'
import {eventsToAcorn} from 'micromark-util-events-to-acorn'
import {codes, types} from 'micromark-util-symbol'
import {positionFromEstree} from 'unist-util-position-from-estree'
import {VFileMessage} from 'vfile-message'

// Tab-size to eat has to be the same as what we serialize as.
// While in some places in markdown that’s 4, in JS it’s more common as 2.
// Which is what’s also in `mdast-util-mdx-jsx`:
// <https://github.com/syntax-tree/mdast-util-mdx-jsx/blob/40b951b/lib/index.js#L52>
const indentSize = 2

const trouble =
  'https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-extension-mdx-expression'

const unexpectedEndOfFileHash =
  '#unexpected-end-of-file-in-expression-expected-a-corresponding-closing-brace-for-'
const unexpectedLazyHash =
  '#unexpected-lazy-line-in-expression-in-container-expected-line-to-be-prefixed'
const nonSpreadHash =
  '#unexpected-type-in-code-expected-an-object-spread-spread'
const spreadExtraHash =
  '#unexpected-extra-content-in-spread-only-a-single-spread-is-supported'
const acornHash = '#could-not-parse-expression-with-acorn'

/**
 * @this {TokenizeContext}
 *   Context.
 * @param {Effects} effects
 *   Context.
 * @param {State} ok
 *   State switched to when successful
 * @param {TokenType} type
 *   Token type for whole (`{}`).
 * @param {TokenType} markerType
 *   Token type for the markers (`{`, `}`).
 * @param {TokenType} chunkType
 *   Token type for the value (`1`).
 * @param {Acorn | null | undefined} [acorn]
 *   Object with `acorn.parse` and `acorn.parseExpressionAt`.
 * @param {AcornOptions | null | undefined} [acornOptions]
 *   Configuration for acorn.
 * @param {boolean | null | undefined} [addResult=false]
 *   Add `estree` to token (default: `false`).
 * @param {boolean | null | undefined} [spread=false]
 *   Support a spread (`{...a}`) only (default: `false`).
 * @param {boolean | null | undefined} [allowEmpty=false]
 *   Support an empty expression (default: `false`).
 * @param {boolean | null | undefined} [allowLazy=false]
 *   Support lazy continuation of an expression (default: `false`).
 * @returns {State}
 */
// eslint-disable-next-line max-params
export function factoryMdxExpression(
  effects,
  ok,
  type,
  markerType,
  chunkType,
  acorn,
  acornOptions,
  addResult,
  spread,
  allowEmpty,
  allowLazy
) {
  const self = this
  const eventStart = this.events.length + 3 // Add main and marker token
  let size = 0
  /** @type {Point} */
  let pointStart
  /** @type {Error} */
  let lastCrash

  return start

  /**
   * Start of an MDX expression.
   *
   * ```markdown
   * > | a {Math.PI} c
   *       ^
   * ```
   *
   * @type {State}
   */
  function start(code) {
    assert(code === codes.leftCurlyBrace, 'expected `{`')
    effects.enter(type)
    effects.enter(markerType)
    effects.consume(code)
    effects.exit(markerType)
    pointStart = self.now()
    return before
  }

  /**
   * Before data.
   *
   * ```markdown
   * > | a {Math.PI} c
   *        ^
   * ```
   *
   * @type {State}
   */
  function before(code) {
    if (code === codes.eof) {
      if (lastCrash) throw lastCrash

      const error = new VFileMessage(
        'Unexpected end of file in expression, expected a corresponding closing brace for `{`',
        {
          place: self.now(),
          ruleId: 'unexpected-eof',
          source: 'micromark-extension-mdx-expression'
        }
      )
      error.url = trouble + unexpectedEndOfFileHash
      throw error
    }

    if (markdownLineEnding(code)) {
      effects.enter(types.lineEnding)
      effects.consume(code)
      effects.exit(types.lineEnding)
      return eolAfter
    }

    if (code === codes.rightCurlyBrace && size === 0) {
      /** @type {MdxSignal} */
      const next = acorn
        ? mdxExpressionParse.call(
            self,
            acorn,
            acornOptions,
            chunkType,
            eventStart,
            pointStart,
            allowEmpty || false,
            spread || false
          )
        : {type: 'ok', estree: undefined}

      if (next.type === 'ok') {
        effects.enter(markerType)
        effects.consume(code)
        effects.exit(markerType)
        const token = effects.exit(type)

        if (addResult && next.estree) {
          Object.assign(token, {estree: next.estree})
        }

        return ok
      }

      lastCrash = next.message
      effects.enter(chunkType)
      effects.consume(code)
      return inside
    }

    effects.enter(chunkType)
    return inside(code)
  }

  /**
   * In data.
   *
   * ```markdown
   * > | a {Math.PI} c
   *        ^
   * ```
   *
   * @type {State}
   */
  function inside(code) {
    if (
      (code === codes.rightCurlyBrace && size === 0) ||
      code === codes.eof ||
      markdownLineEnding(code)
    ) {
      effects.exit(chunkType)
      return before(code)
    }

    // Don’t count if gnostic.
    if (code === codes.leftCurlyBrace && !acorn) {
      size += 1
    } else if (code === codes.rightCurlyBrace) {
      size -= 1
    }

    effects.consume(code)
    return inside
  }

  /**
   * After eol.
   *
   * ```markdown
   *   | a {b +
   * > | c} d
   *     ^
   * ```
   *
   * @type {State}
   */
  function eolAfter(code) {
    const now = self.now()

    // Lazy continuation in a flow expression (or flow tag) is a syntax error.
    if (
      now.line !== pointStart.line &&
      !allowLazy &&
      self.parser.lazy[now.line]
    ) {
      const error = new VFileMessage(
        'Unexpected lazy line in expression in container, expected line to be prefixed with `>` when in a block quote, whitespace when in a list, etc',
        {
          place: self.now(),
          ruleId: 'unexpected-lazy',
          source: 'micromark-extension-mdx-expression'
        }
      )
      error.url = trouble + unexpectedLazyHash
      throw error
    }

    // Note: `markdown-rs` uses `4`, but we use `2`.
    //
    // Idea: investigate if we’d need to use more complex stripping.
    // Take this example:
    //
    // ```markdown
    // >  aaa <b c={`
    // >      d
    // >  `} /> eee
    // ```
    //
    // Currently, the “paragraph” starts at `> | aaa`, so for the next line
    // here we split it into `>␠|␠␠|␠␠␠d` (prefix, this indent here,
    // expression data).
    if (markdownSpace(code)) {
      return factorySpace(
        effects,
        before,
        types.linePrefix,
        indentSize + 1
      )(code)
    }

    return before(code)
  }
}

/**
 * Mix of `markdown-rs`’s `parse_expression` and `MdxExpressionParse`
 * functionality, to wrap our `eventsToAcorn`.
 *
 * In the future, the plan is to realise the rust way, which allows arbitrary
 * parsers.
 *
 * @this {TokenizeContext}
 * @param {Acorn} acorn
 * @param {AcornOptions | null | undefined} acornOptions
 * @param {TokenType} chunkType
 * @param {number} eventStart
 * @param {Point} pointStart
 * @param {boolean} allowEmpty
 * @param {boolean} spread
 * @returns {MdxSignal}
 */
// eslint-disable-next-line max-params
function mdxExpressionParse(
  acorn,
  acornOptions,
  chunkType,
  eventStart,
  pointStart,
  allowEmpty,
  spread
) {
  // Gnostic mode: parse w/ acorn.
  const result = eventsToAcorn(this.events.slice(eventStart), {
    acorn,
    tokenTypes: [chunkType],
    acornOptions,
    start: pointStart,
    expression: true,
    allowEmpty,
    prefix: spread ? '({' : '',
    suffix: spread ? '})' : ''
  })
  const estree = result.estree

  // Get the spread value.
  if (spread && estree) {
    // Should always be the case as we wrap in `d={}`
    assert(estree.type === 'Program', 'expected program')
    const head = estree.body[0]
    assert(head, 'expected body')

    if (
      head.type !== 'ExpressionStatement' ||
      head.expression.type !== 'ObjectExpression'
    ) {
      const place = positionFromEstree(head)
      assert(place, 'expected position')
      const error = new VFileMessage(
        'Unexpected `' +
          head.type +
          '` in code: expected an object spread (`{...spread}`)',
        {
          place: place.start,
          ruleId: 'non-spread',
          source: 'micromark-extension-mdx-expression'
        }
      )
      error.url = trouble + nonSpreadHash
      throw error
    }

    if (head.expression.properties[1]) {
      const place = positionFromEstree(head.expression.properties[1])
      assert(place, 'expected position')
      const error = new VFileMessage(
        'Unexpected extra content in spread: only a single spread is supported',
        {
          place: place.start,
          ruleId: 'spread-extra',
          source: 'micromark-extension-mdx-expression'
        }
      )
      error.url = trouble + spreadExtraHash
      throw error
    }

    if (
      head.expression.properties[0] &&
      head.expression.properties[0].type !== 'SpreadElement'
    ) {
      const place = positionFromEstree(head.expression.properties[0])
      assert(place, 'expected position')
      const error = new VFileMessage(
        'Unexpected `' +
          head.expression.properties[0].type +
          '` in code: only spread elements are supported',
        {
          place: place.start,
          ruleId: 'non-spread',
          source: 'micromark-extension-mdx-expression'
        }
      )
      error.url = trouble + nonSpreadHash
      throw error
    }
  }

  if (result.error) {
    const error = new VFileMessage('Could not parse expression with acorn', {
      cause: result.error,
      place: {
        line: result.error.loc.line,
        column: result.error.loc.column + 1,
        offset: result.error.pos
      },
      ruleId: 'acorn',
      source: 'micromark-extension-mdx-expression'
    })
    error.url = trouble + acornHash

    return {type: 'nok', message: error}
  }

  return {type: 'ok', estree}
}
