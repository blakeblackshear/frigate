/**
 * @import {AcornOptions, Acorn} from 'micromark-util-events-to-acorn'
 * @import {Code, Effects, State, TokenType, TokenizeContext} from 'micromark-util-types'
 */

import { cont as idCont, start as idStart } from 'estree-util-is-identifier-name';
import { factoryMdxExpression } from 'micromark-factory-mdx-expression';
import { markdownLineEndingOrSpace, markdownLineEnding, markdownSpace, unicodeWhitespace } from 'micromark-util-character';
import { VFileMessage } from 'vfile-message';
const trouble = 'https://github.com/micromark/micromark-extension-mdx-jsx';

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
// eslint-disable-next-line max-params
export function factoryTag(effects, ok, nok, acorn, acornOptions, addResult, allowLazy, tagType, tagMarkerType, tagClosingMarkerType, tagSelfClosingMarker, tagNameType, tagNamePrimaryType, tagNameMemberMarkerType, tagNameMemberType, tagNamePrefixMarkerType, tagNameLocalType, tagExpressionAttributeType, tagExpressionAttributeMarkerType, tagExpressionAttributeValueType, tagAttributeType, tagAttributeNameType, tagAttributeNamePrimaryType, tagAttributeNamePrefixMarkerType, tagAttributeNameLocalType, tagAttributeInitializerMarkerType, tagAttributeValueLiteralType, tagAttributeValueLiteralMarkerType, tagAttributeValueLiteralValueType, tagAttributeValueExpressionType, tagAttributeValueExpressionMarkerType, tagAttributeValueExpressionValueType) {
  const self = this;
  /** @type {State} */
  let returnState;
  /** @type {NonNullable<Code> | undefined} */
  let marker;
  return start;

  /**
   * Start of MDX: JSX.
   *
   * ```markdown
   * > | a <B /> c
   *       ^
   * ```
   *
   * @type {State}
   */
  function start(code) {
    effects.enter(tagType);
    effects.enter(tagMarkerType);
    effects.consume(code);
    effects.exit(tagMarkerType);
    return startAfter;
  }

  /**
   * After `<`.
   *
   * ```markdown
   * > | a <B /> c
   *        ^
   * ```
   *
   * @type {State}
   */
  function startAfter(code) {
    // Deviate from JSX, which allows arbitrary whitespace.
    // See: <https://github.com/micromark/micromark-extension-mdx-jsx/issues/7>.
    if (markdownLineEndingOrSpace(code)) {
      return nok(code);
    }

    // Any other ES whitespace does not get this treatment.
    returnState = nameBefore;
    return esWhitespaceStart(code);
  }

  /**
   * Before name, self slash, or end of tag for fragments.
   *
   * ```markdown
   * > | a <B> c
   *        ^
   * > | a </B> c
   *        ^
   * > | a <> b
   *        ^
   * ```
   *
   * @type {State}
   */
  function nameBefore(code) {
    // Closing tag.
    if (code === 47) {
      effects.enter(tagClosingMarkerType);
      effects.consume(code);
      effects.exit(tagClosingMarkerType);
      returnState = closingTagNameBefore;
      return esWhitespaceStart;
    }

    // Fragment opening tag.
    if (code === 62) {
      return tagEnd(code);
    }

    // Start of a name.
    if (code !== null && code >= 0 && idStart(code)) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return primaryName;
    }
    crash(code, 'before name', 'a character that can start a name, such as a letter, `$`, or `_`' + (code === 33 ? ' (note: to create a comment in MDX, use `{/* text */}`)' : ''));
  }

  /**
   * Before name of closing tag or end of closing fragment tag.
   *
   * ```markdown
   * > | a </> b
   *         ^
   * > | a </B> c
   *         ^
   * ```
   *
   * @type {State}
   */
  function closingTagNameBefore(code) {
    // Fragment closing tag.
    if (code === 62) {
      return tagEnd(code);
    }

    // Start of a closing tag name.
    if (code !== null && code >= 0 && idStart(code)) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return primaryName;
    }
    crash(code, 'before name', 'a character that can start a name, such as a letter, `$`, or `_`' + (code === 42 || code === 47 ? ' (note: JS comments in JSX tags are not supported in MDX)' : ''));
  }

  /**
   * In primary name.
   *
   * ```markdown
   * > | a <Bc> d
   *         ^
   * ```
   *
   * @type {State}
   */
  function primaryName(code) {
    // Continuation of name: remain.
    if (code !== null && code >= 0 && idCont(code, {
      jsx: true
    })) {
      effects.consume(code);
      return primaryName;
    }

    // End of name.
    if (code === 46 || code === 47 || code === 58 || code === 62 || code === 123 || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagNamePrimaryType);
      returnState = primaryNameAfter;
      return esWhitespaceStart(code);
    }
    crash(code, 'in name', 'a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag' + (code === 64 ? ' (note: to create a link in MDX, use `[text](url)`)' : ''));
  }

  /**
   * After primary name.
   *
   * ```markdown
   * > | a <b.c> d
   *         ^
   * > | a <b:c> d
   *         ^
   * ```
   *
   * @type {State}
   */
  function primaryNameAfter(code) {
    // Start of a member name.
    if (code === 46) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      returnState = memberNameBefore;
      return esWhitespaceStart;
    }

    // Start of a local name.
    if (code === 58) {
      effects.enter(tagNamePrefixMarkerType);
      effects.consume(code);
      effects.exit(tagNamePrefixMarkerType);
      returnState = localNameBefore;
      return esWhitespaceStart;
    }

    // End of name.
    if (code === 47 || code === 62 || code === 123 || code !== null && code >= 0 && idStart(code)) {
      effects.exit(tagNameType);
      return attributeBefore(code);
    }
    crash(code, 'after name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; whitespace before attributes; or the end of the tag');
  }

  /**
   * Before member name.
   *
   * ```markdown
   * > | a <b.c> d
   *          ^
   * ```
   *
   * @type {State}
   */
  function memberNameBefore(code) {
    // Start of a member name.
    if (code !== null && code >= 0 && idStart(code)) {
      effects.enter(tagNameMemberType);
      effects.consume(code);
      return memberName;
    }
    crash(code, 'before member name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; whitespace before attributes; or the end of the tag');
  }

  /**
   * In member name.
   *
   * ```markdown
   * > | a <b.cd> e
   *           ^
   * ```
   *
   * @type {State}
   */
  function memberName(code) {
    // Continuation of name: remain.
    if (code !== null && code >= 0 && idCont(code, {
      jsx: true
    })) {
      effects.consume(code);
      return memberName;
    }

    // End of name.
    // Note: no `:` allowed here.
    if (code === 46 || code === 47 || code === 62 || code === 123 || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagNameMemberType);
      returnState = memberNameAfter;
      return esWhitespaceStart(code);
    }
    crash(code, 'in member name', 'a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag' + (code === 64 ? ' (note: to create a link in MDX, use `[text](url)`)' : ''));
  }

  /**
   * After member name.
   *
   * ```markdown
   * > | a <b.c> d
   *           ^
   * > | a <b.c.d> e
   *           ^
   * ```
   *
   * @type {State}
   */
  function memberNameAfter(code) {
    // Start another member name.
    if (code === 46) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      returnState = memberNameBefore;
      return esWhitespaceStart;
    }

    // End of name.
    if (code === 47 || code === 62 || code === 123 || code !== null && code >= 0 && idStart(code)) {
      effects.exit(tagNameType);
      return attributeBefore(code);
    }
    crash(code, 'after member name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; whitespace before attributes; or the end of the tag');
  }

  /**
   * Local member name.
   *
   * ```markdown
   * > | a <b:c> d
   *          ^
   * ```
   *
   * @type {State}
   */
  function localNameBefore(code) {
    // Start of a local name.
    if (code !== null && code >= 0 && idStart(code)) {
      effects.enter(tagNameLocalType);
      effects.consume(code);
      return localName;
    }
    crash(code, 'before local name', 'a character that can start a name, such as a letter, `$`, or `_`' + (code === 43 || code !== null && code > 46 && code < 58 /* `/` - `9` */ ? ' (note: to create a link in MDX, use `[text](url)`)' : ''));
  }

  /**
   * In local name.
   *
   * ```markdown
   * > | a <b:cd> e
   *           ^
   * ```
   *
   * @type {State}
   */
  function localName(code) {
    // Continuation of name: remain.
    if (code !== null && code >= 0 && idCont(code, {
      jsx: true
    })) {
      effects.consume(code);
      return localName;
    }

    // End of local name (note that we don’t expect another colon, or a member).
    if (code === 47 || code === 62 || code === 123 || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagNameLocalType);
      returnState = localNameAfter;
      return esWhitespaceStart(code);
    }
    crash(code, 'in local name', 'a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag');
  }

  /**
   * After local name.
   *
   * This is like as `primary_name_after`, but we don’t expect colons or
   * periods.
   *
   * ```markdown
   * > | a <b.c> d
   *           ^
   * > | a <b.c.d> e
   *           ^
   * ```
   *
   * @type {State}
   */
  function localNameAfter(code) {
    // End of name.
    if (code === 47 || code === 62 || code === 123 || code !== null && code >= 0 && idStart(code)) {
      effects.exit(tagNameType);
      return attributeBefore(code);
    }
    crash(code, 'after local name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; whitespace before attributes; or the end of the tag');
  }

  /**
   * Before attribute.
   *
   * ```markdown
   * > | a <b /> c
   *          ^
   * > | a <b > c
   *          ^
   * > | a <b {...c}> d
   *          ^
   * > | a <b c> d
   *          ^
   * ```
   *
   * @type {State}
   */
  function attributeBefore(code) {
    // Self-closing.
    if (code === 47) {
      effects.enter(tagSelfClosingMarker);
      effects.consume(code);
      effects.exit(tagSelfClosingMarker);
      returnState = selfClosing;
      return esWhitespaceStart;
    }

    // End of tag.
    if (code === 62) {
      return tagEnd(code);
    }

    // Attribute expression.
    if (code === 123) {
      return factoryMdxExpression.call(self, effects, attributeExpressionAfter, tagExpressionAttributeType, tagExpressionAttributeMarkerType, tagExpressionAttributeValueType, acorn, acornOptions, addResult, true, false, allowLazy)(code);
    }

    // Start of an attribute name.
    if (code !== null && code >= 0 && idStart(code)) {
      effects.enter(tagAttributeType);
      effects.enter(tagAttributeNameType);
      effects.enter(tagAttributeNamePrimaryType);
      effects.consume(code);
      return attributePrimaryName;
    }
    crash(code, 'before attribute name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; whitespace before attributes; or the end of the tag');
  }

  /**
   * After attribute expression.
   *
   * ```markdown
   * > | a <b {c} d/> e
   *             ^
   * ```
   *
   * @type {State}
   */
  function attributeExpressionAfter(code) {
    returnState = attributeBefore;
    return esWhitespaceStart(code);
  }

  /**
   * In primary attribute name.
   *
   * ```markdown
   * > | a <b cd/> e
   *           ^
   * > | a <b c:d> e
   *           ^
   * > | a <b c=d> e
   *           ^
   * ```
   *
   * @type {State}
   */
  function attributePrimaryName(code) {
    // Continuation of name: remain.
    if (code !== null && code >= 0 && idCont(code, {
      jsx: true
    })) {
      effects.consume(code);
      return attributePrimaryName;
    }

    // End of attribute name or tag.
    if (code === 47 || code === 58 || code === 61 || code === 62 || code === 123 || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagAttributeNamePrimaryType);
      returnState = attributePrimaryNameAfter;
      return esWhitespaceStart(code);
    }
    crash(code, 'in attribute name', 'an attribute name character such as letters, digits, `$`, or `_`; `=` to initialize a value; whitespace before attributes; or the end of the tag');
  }

  /**
   * After primary attribute name.
   *
   * ```markdown
   * > | a <b c/> d
   *           ^
   * > | a <b c:d> e
   *           ^
   * > | a <b c=d> e
   *           ^
   * ```
   *
   * @type {State}
   */
  function attributePrimaryNameAfter(code) {
    // Start of a local name.
    if (code === 58) {
      effects.enter(tagAttributeNamePrefixMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeNamePrefixMarkerType);
      returnState = attributeLocalNameBefore;
      return esWhitespaceStart;
    }

    // Initializer: start of an attribute value.
    if (code === 61) {
      effects.exit(tagAttributeNameType);
      effects.enter(tagAttributeInitializerMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeInitializerMarkerType);
      returnState = attributeValueBefore;
      return esWhitespaceStart;
    }

    // End of tag / new attribute.
    if (code === 47 || code === 62 || code === 123 || markdownLineEndingOrSpace(code) || unicodeWhitespace(code) || code !== null && code >= 0 && idStart(code)) {
      effects.exit(tagAttributeNameType);
      effects.exit(tagAttributeType);
      returnState = attributeBefore;
      return esWhitespaceStart(code);
    }
    crash(code, 'after attribute name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; `=` to initialize a value; or the end of the tag');
  }

  /**
   * Before local attribute name.
   *
   * ```markdown
   * > | a <b c:d/> e
   *            ^
   * ```
   *
   * @type {State}
   */
  function attributeLocalNameBefore(code) {
    // Start of a local name.
    if (code !== null && code >= 0 && idStart(code)) {
      effects.enter(tagAttributeNameLocalType);
      effects.consume(code);
      return attributeLocalName;
    }
    crash(code, 'before local attribute name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; `=` to initialize a value; or the end of the tag');
  }

  /**
   * In local attribute name.
   *
   * ```markdown
   * > | a <b c:de/> f
   *             ^
   * > | a <b c:d=e/> f
   *             ^
   * ```
   *
   * @type {State}
   */
  function attributeLocalName(code) {
    // Continuation of name: remain.
    if (code !== null && code >= 0 && idCont(code, {
      jsx: true
    })) {
      effects.consume(code);
      return attributeLocalName;
    }

    // End of local name (note that we don’t expect another colon).
    if (code === 47 || code === 61 || code === 62 || code === 123 || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagAttributeNameLocalType);
      effects.exit(tagAttributeNameType);
      returnState = attributeLocalNameAfter;
      return esWhitespaceStart(code);
    }
    crash(code, 'in local attribute name', 'an attribute name character such as letters, digits, `$`, or `_`; `=` to initialize a value; whitespace before attributes; or the end of the tag');
  }

  /**
   * After local attribute name.
   *
   * ```markdown
   * > | a <b c:d/> f
   *             ^
   * > | a <b c:d=e/> f
   *             ^
   * ```
   *
   * @type {State}
   */
  function attributeLocalNameAfter(code) {
    // Start of an attribute value.
    if (code === 61) {
      effects.enter(tagAttributeInitializerMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeInitializerMarkerType);
      returnState = attributeValueBefore;
      return esWhitespaceStart;
    }

    // End of name.
    if (code === 47 || code === 62 || code === 123 || code !== null && code >= 0 && idStart(code)) {
      effects.exit(tagAttributeType);
      return attributeBefore(code);
    }
    crash(code, 'after local attribute name', 'a character that can start an attribute name, such as a letter, `$`, or `_`; `=` to initialize a value; or the end of the tag');
  }

  /**
   * After `=`, before value.
   *
   * ```markdown
   * > | a <b c="d"/> e
   *            ^
   * > | a <b c={d}/> e
   *            ^
   * ```
   *
   * @type {State}
   */
  function attributeValueBefore(code) {
    // Start of double- or single quoted value.
    if (code === 34 || code === 39) {
      effects.enter(tagAttributeValueLiteralType);
      effects.enter(tagAttributeValueLiteralMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeValueLiteralMarkerType);
      marker = code;
      return attributeValueQuotedStart;
    }

    // Attribute value expression.
    if (code === 123) {
      return factoryMdxExpression.call(self, effects, attributeValueExpressionAfter, tagAttributeValueExpressionType, tagAttributeValueExpressionMarkerType, tagAttributeValueExpressionValueType, acorn, acornOptions, addResult, false, false, allowLazy)(code);
    }
    crash(code, 'before attribute value', 'a character that can start an attribute value, such as `"`, `\'`, or `{`' + (code === 60 ? ' (note: to use an element or fragment as a prop value in MDX, use `{<element />}`)' : ''));
  }

  /**
   * After attribute value expression.
   *
   * ```markdown
   * > | a <b c={d} e/> f
   *               ^
   * ```
   *
   * @type {State}
   */
  function attributeValueExpressionAfter(code) {
    effects.exit(tagAttributeType);
    returnState = attributeBefore;
    return esWhitespaceStart(code);
  }

  /**
   * Before quoted literal attribute value.
   *
   * ```markdown
   * > | a <b c="d"/> e
   *            ^
   * ```
   *
   * @type {State}
   */
  function attributeValueQuotedStart(code) {
    if (code === null) {
      crash(code, 'in attribute value', 'a corresponding closing quote `' + String.fromCodePoint(marker) + '`');
    }
    if (code === marker) {
      effects.enter(tagAttributeValueLiteralMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeValueLiteralMarkerType);
      effects.exit(tagAttributeValueLiteralType);
      effects.exit(tagAttributeType);
      marker = undefined;
      returnState = attributeBefore;
      return esWhitespaceStart;
    }
    if (markdownLineEnding(code)) {
      returnState = attributeValueQuotedStart;
      return esWhitespaceStart(code);
    }
    effects.enter(tagAttributeValueLiteralValueType);
    return attributeValueQuoted(code);
  }

  /**
   * In quoted literal attribute value.
   *
   * ```markdown
   * > | a <b c="d"/> e
   *             ^
   * ```
   *
   * @type {State}
   */
  function attributeValueQuoted(code) {
    if (code === null || code === marker || markdownLineEnding(code)) {
      effects.exit(tagAttributeValueLiteralValueType);
      return attributeValueQuotedStart(code);
    }
    effects.consume(code);
    return attributeValueQuoted;
  }

  /**
   * After self-closing slash.
   *
   * ```markdown
   * > | a <b/> c
   *          ^
   * ```
   *
   * @type {State}
   */
  function selfClosing(code) {
    if (code === 62) {
      return tagEnd(code);
    }
    crash(code, 'after self-closing slash', '`>` to end the tag' + (code === 42 || code === 47 ? ' (note: JS comments in JSX tags are not supported in MDX)' : ''));
  }

  /**
   * At final `>`.
   *
   * ```markdown
   * > | a <b> c
   *         ^
   * ```
   *
   * @type {State}
   */
  function tagEnd(code) {
    effects.enter(tagMarkerType);
    effects.consume(code);
    effects.exit(tagMarkerType);
    effects.exit(tagType);
    return ok;
  }

  /**
   * Before optional ECMAScript whitespace.
   *
   * ```markdown
   * > | a <a b> c
   *         ^
   * ```
   *
   * @type {State}
   */
  function esWhitespaceStart(code) {
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return esWhitespaceEolAfter;
    }
    if (markdownSpace(code) || unicodeWhitespace(code)) {
      effects.enter('esWhitespace');
      return esWhitespaceInside(code);
    }
    return returnState(code);
  }

  /**
   * In ECMAScript whitespace.
   *
   * ```markdown
   * > | a <a  b> c
   *          ^
   * ```
   *
   * @type {State}
   */
  function esWhitespaceInside(code) {
    if (markdownLineEnding(code)) {
      effects.exit('esWhitespace');
      return esWhitespaceStart(code);
    }
    if (markdownSpace(code) || unicodeWhitespace(code)) {
      effects.consume(code);
      return esWhitespaceInside;
    }
    effects.exit('esWhitespace');
    return returnState(code);
  }

  /**
   * After eol in whitespace.
   *
   * ```markdown
   * > | a <a\nb> c
   *          ^
   * ```
   *
   * @type {State}
   */
  function esWhitespaceEolAfter(code) {
    // Lazy continuation in a flow tag is a syntax error.
    if (!allowLazy && self.parser.lazy[self.now().line]) {
      const error = new VFileMessage('Unexpected lazy line in container, expected line to be prefixed with `>` when in a block quote, whitespace when in a list, etc', self.now(), 'micromark-extension-mdx-jsx:unexpected-lazy');
      error.url = trouble + '#unexpected-lazy-line-in-container-expected-line-to-be';
      throw error;
    }
    return esWhitespaceStart(code);
  }

  /**
   * Crash at a nonconforming character.
   *
   * @param {Code} code
   * @param {string} at
   * @param {string} expect
   */
  function crash(code, at, expect) {
    const error = new VFileMessage('Unexpected ' + (code === null ? 'end of file' : 'character `' + (code === 96 ? '` ` `' : String.fromCodePoint(code)) + '` (' + serializeCharCode(code) + ')') + ' ' + at + ', expected ' + expect, self.now(), 'micromark-extension-mdx-jsx:unexpected-' + (code === null ? 'eof' : 'character'));
    error.url = trouble + (code === null ? '#unexpected-end-of-file-at-expected-expect' : '#unexpected-character-at-expected-expect');
    throw error;
  }
}

/**
 * @param {NonNullable<Code>} code
 * @returns {string}
 */
function serializeCharCode(code) {
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0');
}