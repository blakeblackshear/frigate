/**
 * @import {Options} from 'micromark-extension-mdx-jsx'
 * @import {Acorn} from 'micromark-util-events-to-acorn'
 * @import {Construct, State, TokenizeContext, Tokenizer} from 'micromark-util-types'
 */

import {ok as assert} from 'devlop'
import {markdownLineEnding, markdownSpace} from 'micromark-util-character'
import {factorySpace} from 'micromark-factory-space'
import {codes, types} from 'micromark-util-symbol'
import {factoryTag} from './factory-tag.js'

/**
 * Parse JSX (flow).
 *
 * @param {Acorn | undefined} acorn
 *   Acorn parser to use (optional).
 * @param {Options} options
 *   Configuration.
 * @returns {Construct}
 *   Construct.
 */
export function jsxFlow(acorn, options) {
  return {concrete: true, name: 'mdxJsxFlowTag', tokenize: tokenizeJsxFlow}

  /**
   * MDX JSX (flow).
   *
   * ```markdown
   * > | <A />
   *     ^^^^^
   * ```
   *
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeJsxFlow(effects, ok, nok) {
    const self = this

    return start

    /**
     * Start of MDX: JSX (flow).
     *
     * ```markdown
     * > | <A />
     *     ^
     * ```
     *
     * @type {State}
     */
    function start(code) {
      // To do: in `markdown-rs`, constructs need to parse the indent themselves.
      // This should also be introduced in `micromark-js`.
      assert(code === codes.lessThan, 'expected `<`')
      return before(code)
    }

    /**
     * After optional whitespace, before of MDX JSX (flow).
     *
     * ```markdown
     * > | <A />
     *     ^
     * ```
     *
     * @type {State}
     */
    function before(code) {
      return factoryTag.call(
        self,
        effects,
        after,
        nok,
        acorn,
        options.acornOptions,
        options.addResult,
        false,
        'mdxJsxFlowTag',
        'mdxJsxFlowTagMarker',
        'mdxJsxFlowTagClosingMarker',
        'mdxJsxFlowTagSelfClosingMarker',
        'mdxJsxFlowTagName',
        'mdxJsxFlowTagNamePrimary',
        'mdxJsxFlowTagNameMemberMarker',
        'mdxJsxFlowTagNameMember',
        'mdxJsxFlowTagNamePrefixMarker',
        'mdxJsxFlowTagNameLocal',
        'mdxJsxFlowTagExpressionAttribute',
        'mdxJsxFlowTagExpressionAttributeMarker',
        'mdxJsxFlowTagExpressionAttributeValue',
        'mdxJsxFlowTagAttribute',
        'mdxJsxFlowTagAttributeName',
        'mdxJsxFlowTagAttributeNamePrimary',
        'mdxJsxFlowTagAttributeNamePrefixMarker',
        'mdxJsxFlowTagAttributeNameLocal',
        'mdxJsxFlowTagAttributeInitializerMarker',
        'mdxJsxFlowTagAttributeValueLiteral',
        'mdxJsxFlowTagAttributeValueLiteralMarker',
        'mdxJsxFlowTagAttributeValueLiteralValue',
        'mdxJsxFlowTagAttributeValueExpression',
        'mdxJsxFlowTagAttributeValueExpressionMarker',
        'mdxJsxFlowTagAttributeValueExpressionValue'
      )(code)
    }

    /**
     * After an MDX JSX (flow) tag.
     *
     * ```markdown
     * > | <A>
     *        ^
     * ```
     *
     * @type {State}
     */
    function after(code) {
      return markdownSpace(code)
        ? factorySpace(effects, end, types.whitespace)(code)
        : end(code)
    }

    /**
     * After an MDX JSX (flow) tag, after optional whitespace.
     *
     * ```markdown
     * > | <A> <B>
     *         ^
     * ```
     *
     * @type {State}
     */
    function end(code) {
      // We want to allow expressions directly after tags.
      // See <https://github.com/micromark/micromark-extension-mdx-expression/blob/d5d92b9/packages/micromark-extension-mdx-expression/dev/lib/syntax.js#L183>
      // for more info.
      const leftBraceValue = self.parser.constructs.flow[codes.leftCurlyBrace]
      /* c8 ignore next 5 -- always a list when normalized. */
      const constructs = Array.isArray(leftBraceValue)
        ? leftBraceValue
        : leftBraceValue
          ? [leftBraceValue]
          : []
      /** @type {Construct | undefined} */
      let expression

      for (const construct of constructs) {
        if (construct.name === 'mdxFlowExpression') {
          expression = construct
          break
        }
      }

      // Another tag.
      return code === codes.lessThan
        ? // We can’t just say: fine. Lines of blocks have to be parsed until an eol/eof.
          start(code)
        : code === codes.leftCurlyBrace && expression
          ? effects.attempt(expression, end, nok)(code)
          : code === codes.eof || markdownLineEnding(code)
            ? ok(code)
            : nok(code)
    }
  }
}
