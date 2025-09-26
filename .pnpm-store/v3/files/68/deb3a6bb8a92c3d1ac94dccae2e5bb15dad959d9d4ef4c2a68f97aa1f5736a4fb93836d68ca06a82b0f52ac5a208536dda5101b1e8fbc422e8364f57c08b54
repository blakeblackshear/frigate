import type {Program} from 'estree'
import type {AcornOptions, Acorn} from 'micromark-util-events-to-acorn'

export {mdxJsx} from './lib/syntax.js'

/**
 * Configuration (optional).
 */
export interface Options {
  /**
   * Configuration for acorn (default: `{ecmaVersion: 2024, locations: true,
   * sourceType: 'module'}`); all fields except `locations` can be set.
   */
  acornOptions?: AcornOptions | null | undefined
  /**
   * Acorn parser to use (optional).
   */
  acorn?: Acorn | null | undefined
  /**
   * Whether to add `estree` fields to tokens with results from acorn
   * (default: `false`).
   */
  addResult?: boolean | null | undefined
}

/**
 * Augment types.
 */
declare module 'micromark-util-types' {
  /**
   * Token types.
   */
  interface TokenTypeMap {
    esWhitespace: 'esWhitespace'

    mdxJsxFlowTag: 'mdxJsxFlowTag'
    mdxJsxFlowTagMarker: 'mdxJsxFlowTagMarker'
    mdxJsxFlowTagClosingMarker: 'mdxJsxFlowTagClosingMarker'
    mdxJsxFlowTagSelfClosingMarker: 'mdxJsxFlowTagSelfClosingMarker'
    mdxJsxFlowTagName: 'mdxJsxFlowTagName'
    mdxJsxFlowTagNamePrimary: 'mdxJsxFlowTagNamePrimary'
    mdxJsxFlowTagNameMemberMarker: 'mdxJsxFlowTagNameMemberMarker'
    mdxJsxFlowTagNameMember: 'mdxJsxFlowTagNameMember'
    mdxJsxFlowTagNamePrefixMarker: 'mdxJsxFlowTagNamePrefixMarker'
    mdxJsxFlowTagNameLocal: 'mdxJsxFlowTagNameLocal'
    mdxJsxFlowTagExpressionAttribute: 'mdxJsxFlowTagExpressionAttribute'
    mdxJsxFlowTagExpressionAttributeMarker: 'mdxJsxFlowTagExpressionAttributeMarker'
    mdxJsxFlowTagExpressionAttributeValue: 'mdxJsxFlowTagExpressionAttributeValue'
    mdxJsxFlowTagAttribute: 'mdxJsxFlowTagAttribute'
    mdxJsxFlowTagAttributeName: 'mdxJsxFlowTagAttributeName'
    mdxJsxFlowTagAttributeNamePrimary: 'mdxJsxFlowTagAttributeNamePrimary'
    mdxJsxFlowTagAttributeNamePrefixMarker: 'mdxJsxFlowTagAttributeNamePrefixMarker'
    mdxJsxFlowTagAttributeNameLocal: 'mdxJsxFlowTagAttributeNameLocal'
    mdxJsxFlowTagAttributeInitializerMarker: 'mdxJsxFlowTagAttributeInitializerMarker'
    mdxJsxFlowTagAttributeValueLiteral: 'mdxJsxFlowTagAttributeValueLiteral'
    mdxJsxFlowTagAttributeValueLiteralMarker: 'mdxJsxFlowTagAttributeValueLiteralMarker'
    mdxJsxFlowTagAttributeValueLiteralValue: 'mdxJsxFlowTagAttributeValueLiteralValue'
    mdxJsxFlowTagAttributeValueExpression: 'mdxJsxFlowTagAttributeValueExpression'
    mdxJsxFlowTagAttributeValueExpressionMarker: 'mdxJsxFlowTagAttributeValueExpressionMarker'
    mdxJsxFlowTagAttributeValueExpressionValue: 'mdxJsxFlowTagAttributeValueExpressionValue'

    mdxJsxTextTag: 'mdxJsxTextTag'
    mdxJsxTextTagMarker: 'mdxJsxTextTagMarker'
    mdxJsxTextTagClosingMarker: 'mdxJsxTextTagClosingMarker'
    mdxJsxTextTagSelfClosingMarker: 'mdxJsxTextTagSelfClosingMarker'
    mdxJsxTextTagName: 'mdxJsxTextTagName'
    mdxJsxTextTagNamePrimary: 'mdxJsxTextTagNamePrimary'
    mdxJsxTextTagNameMemberMarker: 'mdxJsxTextTagNameMemberMarker'
    mdxJsxTextTagNameMember: 'mdxJsxTextTagNameMember'
    mdxJsxTextTagNamePrefixMarker: 'mdxJsxTextTagNamePrefixMarker'
    mdxJsxTextTagNameLocal: 'mdxJsxTextTagNameLocal'
    mdxJsxTextTagExpressionAttribute: 'mdxJsxTextTagExpressionAttribute'
    mdxJsxTextTagExpressionAttributeMarker: 'mdxJsxTextTagExpressionAttributeMarker'
    mdxJsxTextTagExpressionAttributeValue: 'mdxJsxTextTagExpressionAttributeValue'
    mdxJsxTextTagAttribute: 'mdxJsxTextTagAttribute'
    mdxJsxTextTagAttributeName: 'mdxJsxTextTagAttributeName'
    mdxJsxTextTagAttributeNamePrimary: 'mdxJsxTextTagAttributeNamePrimary'
    mdxJsxTextTagAttributeNamePrefixMarker: 'mdxJsxTextTagAttributeNamePrefixMarker'
    mdxJsxTextTagAttributeNameLocal: 'mdxJsxTextTagAttributeNameLocal'
    mdxJsxTextTagAttributeInitializerMarker: 'mdxJsxTextTagAttributeInitializerMarker'
    mdxJsxTextTagAttributeValueLiteral: 'mdxJsxTextTagAttributeValueLiteral'
    mdxJsxTextTagAttributeValueLiteralMarker: 'mdxJsxTextTagAttributeValueLiteralMarker'
    mdxJsxTextTagAttributeValueLiteralValue: 'mdxJsxTextTagAttributeValueLiteralValue'
    mdxJsxTextTagAttributeValueExpression: 'mdxJsxTextTagAttributeValueExpression'
    mdxJsxTextTagAttributeValueExpressionMarker: 'mdxJsxTextTagAttributeValueExpressionMarker'
    mdxJsxTextTagAttributeValueExpressionValue: 'mdxJsxTextTagAttributeValueExpressionValue'
  }

  /**
   * Token fields.
   */
  interface Token {
    estree?: Program
  }
}
