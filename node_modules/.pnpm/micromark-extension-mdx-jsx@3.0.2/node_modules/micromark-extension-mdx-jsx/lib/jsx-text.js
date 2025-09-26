/**
 * @import {Options} from 'micromark-extension-mdx-jsx'
 * @import {Acorn} from 'micromark-util-events-to-acorn'
 * @import {Construct, TokenizeContext, Tokenizer} from 'micromark-util-types'
 */

import { factoryTag } from './factory-tag.js';

/**
 * Parse JSX (text).
 *
 * @param {Acorn | undefined} acorn
 *   Acorn parser to use (optional).
 * @param {Options} options
 *   Configuration.
 * @returns {Construct}
 *   Construct.
 */
export function jsxText(acorn, options) {
  return {
    name: 'mdxJsxTextTag',
    tokenize: tokenizeJsxText
  };

  /**
   * MDX JSX (text).
   *
   * ```markdown
   * > | a <b />.
   *       ^^^^^
   * ```
   *
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeJsxText(effects, ok, nok) {
    return factoryTag.call(this, effects, ok, nok, acorn, options.acornOptions, options.addResult, true, 'mdxJsxTextTag', 'mdxJsxTextTagMarker', 'mdxJsxTextTagClosingMarker', 'mdxJsxTextTagSelfClosingMarker', 'mdxJsxTextTagName', 'mdxJsxTextTagNamePrimary', 'mdxJsxTextTagNameMemberMarker', 'mdxJsxTextTagNameMember', 'mdxJsxTextTagNamePrefixMarker', 'mdxJsxTextTagNameLocal', 'mdxJsxTextTagExpressionAttribute', 'mdxJsxTextTagExpressionAttributeMarker', 'mdxJsxTextTagExpressionAttributeValue', 'mdxJsxTextTagAttribute', 'mdxJsxTextTagAttributeName', 'mdxJsxTextTagAttributeNamePrimary', 'mdxJsxTextTagAttributeNamePrefixMarker', 'mdxJsxTextTagAttributeNameLocal', 'mdxJsxTextTagAttributeInitializerMarker', 'mdxJsxTextTagAttributeValueLiteral', 'mdxJsxTextTagAttributeValueLiteralMarker', 'mdxJsxTextTagAttributeValueLiteralValue', 'mdxJsxTextTagAttributeValueExpression', 'mdxJsxTextTagAttributeValueExpressionMarker', 'mdxJsxTextTagAttributeValueExpressionValue');
  }
}