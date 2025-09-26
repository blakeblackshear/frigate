/**
 * @this {TokenizeContext}
 * @param {Effects} effects
 * @param {State} ok
 * @param {State} nok
 * @param {Acorn | null | undefined} acorn
 * @param {AcornOptions | null | undefined} acornOptions
 * @param {boolean | null | undefined} addResult
 * @param {boolean | undefined} allowLazy
 * @param {TokenType} tagType
 * @param {TokenType} tagMarkerType
 * @param {TokenType} tagClosingMarkerType
 * @param {TokenType} tagSelfClosingMarker
 * @param {TokenType} tagNameType
 * @param {TokenType} tagNamePrimaryType
 * @param {TokenType} tagNameMemberMarkerType
 * @param {TokenType} tagNameMemberType
 * @param {TokenType} tagNamePrefixMarkerType
 * @param {TokenType} tagNameLocalType
 * @param {TokenType} tagExpressionAttributeType
 * @param {TokenType} tagExpressionAttributeMarkerType
 * @param {TokenType} tagExpressionAttributeValueType
 * @param {TokenType} tagAttributeType
 * @param {TokenType} tagAttributeNameType
 * @param {TokenType} tagAttributeNamePrimaryType
 * @param {TokenType} tagAttributeNamePrefixMarkerType
 * @param {TokenType} tagAttributeNameLocalType
 * @param {TokenType} tagAttributeInitializerMarkerType
 * @param {TokenType} tagAttributeValueLiteralType
 * @param {TokenType} tagAttributeValueLiteralMarkerType
 * @param {TokenType} tagAttributeValueLiteralValueType
 * @param {TokenType} tagAttributeValueExpressionType
 * @param {TokenType} tagAttributeValueExpressionMarkerType
 * @param {TokenType} tagAttributeValueExpressionValueType
 */
export function factoryTag(this: TokenizeContext, effects: Effects, ok: State, nok: State, acorn: Acorn | null | undefined, acornOptions: AcornOptions | null | undefined, addResult: boolean | null | undefined, allowLazy: boolean | undefined, tagType: TokenType, tagMarkerType: TokenType, tagClosingMarkerType: TokenType, tagSelfClosingMarker: TokenType, tagNameType: TokenType, tagNamePrimaryType: TokenType, tagNameMemberMarkerType: TokenType, tagNameMemberType: TokenType, tagNamePrefixMarkerType: TokenType, tagNameLocalType: TokenType, tagExpressionAttributeType: TokenType, tagExpressionAttributeMarkerType: TokenType, tagExpressionAttributeValueType: TokenType, tagAttributeType: TokenType, tagAttributeNameType: TokenType, tagAttributeNamePrimaryType: TokenType, tagAttributeNamePrefixMarkerType: TokenType, tagAttributeNameLocalType: TokenType, tagAttributeInitializerMarkerType: TokenType, tagAttributeValueLiteralType: TokenType, tagAttributeValueLiteralMarkerType: TokenType, tagAttributeValueLiteralValueType: TokenType, tagAttributeValueExpressionType: TokenType, tagAttributeValueExpressionMarkerType: TokenType, tagAttributeValueExpressionValueType: TokenType): (code: Code) => State | undefined;
import type { Effects } from 'micromark-util-types';
import type { State } from 'micromark-util-types';
import type { Acorn } from 'micromark-util-events-to-acorn';
import type { AcornOptions } from 'micromark-util-events-to-acorn';
import type { TokenType } from 'micromark-util-types';
import type { TokenizeContext } from 'micromark-util-types';
import type { Code } from 'micromark-util-types';
//# sourceMappingURL=factory-tag.d.ts.map