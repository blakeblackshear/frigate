/**
 * @typedef {import('micromark-util-events-to-acorn').Acorn} Acorn
 * @typedef {import('micromark-util-events-to-acorn').AcornOptions} AcornOptions
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 */

/**
 * @typedef Options
 *   Configuration (required).
 * @property {Acorn} acorn
 *   Acorn parser to use (required).
 * @property {AcornOptions | null | undefined} [acornOptions]
 *   Configuration for acorn (default: `{ecmaVersion: 2024, locations: true,
 *   sourceType: 'module'}`); all fields except `locations` can be set.
 * @property {boolean | null | undefined} [addResult=false]
 *   Whether to add `estree` fields to tokens with results from acorn
 *   (default: `false`).
 */

import {ok as assert} from 'devlop'
import {blankLine} from 'micromark-core-commonmark'
import {asciiAlpha, markdownLineEnding} from 'micromark-util-character'
import {eventsToAcorn} from 'micromark-util-events-to-acorn'
import {codes, types} from 'micromark-util-symbol'
import {positionFromEstree} from 'unist-util-position-from-estree'
import {VFileMessage} from 'vfile-message'

const blankLineBefore = {tokenize: tokenizeNextBlank, partial: true}

const trouble = 'https://github.com/micromark/micromark-extension-mdxjs-esm'

const allowedAcornTypes = new Set([
  'ExportAllDeclaration',
  'ExportDefaultDeclaration',
  'ExportNamedDeclaration',
  'ImportDeclaration'
])

/**
 * Create an extension for `micromark` to enable MDX ESM syntax.
 *
 * @param {Options} options
 *   Configuration (required).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   ESM syntax.
 */
export function mdxjsEsm(options) {
  const exportImportConstruct = {tokenize: tokenizeExportImport, concrete: true}

  if (!options || !options.acorn || !options.acorn.parse) {
    throw new Error('Expected an `acorn` instance passed in as `options.acorn`')
  }

  const acorn = options.acorn
  const acornOptions = Object.assign(
    {ecmaVersion: 2024, sourceType: 'module'},
    options.acornOptions,
    {locations: true}
  )

  return {
    flow: {
      [codes.lowercaseE]: exportImportConstruct,
      [codes.lowercaseI]: exportImportConstruct
    }
  }

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeExportImport(effects, ok, nok) {
    const self = this
    const definedModuleSpecifiers =
      self.parser.definedModuleSpecifiers ||
      (self.parser.definedModuleSpecifiers = [])
    const eventStart = this.events.length + 1 // Add the main `mdxjsEsm` token
    let buffer = ''

    return self.interrupt ? nok : start

    /**
     * Start of MDX ESM.
     *
     * ```markdown
     * > | import a from 'b'
     *     ^
     * ```
     *
     * @type {State}
     */
    function start(code) {
      assert(
        code === codes.lowercaseE || code === codes.lowercaseI,
        'expected `e` or `i`'
      )

      // Only at the start of a line, not at whitespace or in a container.
      if (self.now().column > 1) return nok(code)

      effects.enter('mdxjsEsm')
      effects.enter('mdxjsEsmData')
      effects.consume(code)
      // eslint-disable-next-line unicorn/prefer-code-point
      buffer += String.fromCharCode(code)
      return word
    }

    /**
     * In keyword.
     *
     * ```markdown
     * > | import a from 'b'
     *     ^^^^^^
     * ```
     *
     * @type {State}
     */
    function word(code) {
      if (asciiAlpha(code)) {
        effects.consume(code)
        // @ts-expect-error: definitely a number.
        // eslint-disable-next-line unicorn/prefer-code-point
        buffer += String.fromCharCode(code)
        return word
      }

      if (
        (buffer === 'import' || buffer === 'export') &&
        code === codes.space
      ) {
        effects.consume(code)
        return inside
      }

      return nok(code)
    }

    /**
     * In data.
     *
     * ```markdown
     * > | import a from 'b'
     *           ^
     * ```
     *
     * @type {State}
     */
    function inside(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit('mdxjsEsmData')
        return lineStart(code)
      }

      effects.consume(code)
      return inside
    }

    /**
     * At line ending.
     *
     * ```markdown
     * > | import a from 'b'
     *                      ^
     *   | export {a}
     * ```
     *
     * @type {State}
     */
    function lineStart(code) {
      if (code === codes.eof) {
        return atEnd(code)
      }

      if (markdownLineEnding(code)) {
        return effects.check(blankLineBefore, atEnd, continuationStart)(code)
      }

      effects.enter('mdxjsEsmData')
      return inside(code)
    }

    /**
     * At line ending that continues.
     *
     * ```markdown
     * > | import a from 'b'
     *                      ^
     *   | export {a}
     * ```
     *
     * @type {State}
     */
    function continuationStart(code) {
      assert(markdownLineEnding(code))
      effects.enter(types.lineEnding)
      effects.consume(code)
      effects.exit(types.lineEnding)
      return lineStart
    }

    /**
     * At end of line (blank or eof).
     *
     * ```markdown
     * > | import a from 'b'
     *                      ^
     * ```
     *
     * @type {State}
     */
    function atEnd(code) {
      const result = eventsToAcorn(self.events.slice(eventStart), {
        acorn,
        acornOptions,
        tokenTypes: ['mdxjsEsmData'],
        prefix:
          definedModuleSpecifiers.length > 0
            ? 'var ' + definedModuleSpecifiers.join(',') + '\n'
            : ''
      })

      if (result.error) {
        // There’s an error, which could be solved with more content, and there
        // is more content.
        if (code !== codes.eof && result.swallow) {
          return continuationStart(code)
        }

        const error = new VFileMessage(
          'Could not parse import/exports with acorn',
          {
            cause: result.error,
            place: {
              line: result.error.loc.line,
              column: result.error.loc.column + 1,
              offset: result.error.pos
            },
            ruleId: 'acorn',
            source: 'micromark-extension-mdxjs-esm'
          }
        )
        error.url = trouble + '#could-not-parse-importexports-with-acorn'
        throw error
      }

      assert(result.estree, 'expected `estree` to be defined')

      // Remove the `VariableDeclaration`.
      if (definedModuleSpecifiers.length > 0) {
        const declaration = result.estree.body.shift()
        assert(declaration)
        assert(declaration.type === 'VariableDeclaration')
      }

      let index = -1

      while (++index < result.estree.body.length) {
        const node = result.estree.body[index]

        if (!allowedAcornTypes.has(node.type)) {
          const error = new VFileMessage(
            'Unexpected `' +
              node.type +
              '` in code: only import/exports are supported',
            {
              place: positionFromEstree(node),
              ruleId: 'non-esm',
              source: 'micromark-extension-mdxjs-esm'
            }
          )
          error.url =
            trouble +
            '#unexpected-type-in-code-only-importexports-are-supported'
          throw error
        }

        // Otherwise, when we’re not interrupting (hacky, because `interrupt` is
        // used to parse containers and “sniff” if this is ESM), collect all the
        // local values that are imported.
        if (node.type === 'ImportDeclaration' && !self.interrupt) {
          let index = -1

          while (++index < node.specifiers.length) {
            const specifier = node.specifiers[index]
            definedModuleSpecifiers.push(specifier.local.name)
          }
        }
      }

      Object.assign(
        effects.exit('mdxjsEsm'),
        options.addResult ? {estree: result.estree} : undefined
      )

      return ok(code)
    }
  }
}

/** @type {Tokenizer} */
function tokenizeNextBlank(effects, ok, nok) {
  return start

  /**
   * @type {State}
   */
  function start(code) {
    assert(markdownLineEnding(code))
    effects.enter(types.lineEndingBlank)
    effects.consume(code)
    effects.exit(types.lineEndingBlank)
    return effects.attempt(blankLine, ok, nok)
  }
}
