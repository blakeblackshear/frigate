/**
 * @import {Options} from 'micromark-extension-mdx-expression'
 * @import {AcornOptions} from 'micromark-util-events-to-acorn'
 * @import {Extension, State, TokenizeContext, Tokenizer} from 'micromark-util-types'
 */

import { factoryMdxExpression } from 'micromark-factory-mdx-expression';
import { factorySpace } from 'micromark-factory-space';
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
/**
 * Create an extension for `micromark` to enable MDX expression syntax.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   expression syntax.
 */
export function mdxExpression(options) {
  const options_ = options || {};
  const addResult = options_.addResult;
  const acorn = options_.acorn;
  // Hidden: `micromark-extension-mdx-jsx` supports expressions in tags,
  // and one of them is only “spread” elements.
  // It also has expressions that are not allowed to be empty (`<x y={}/>`).
  // Instead of duplicating code there, this are two small hidden feature here
  // to test that behavior.
  const spread = options_.spread;
  let allowEmpty = options_.allowEmpty;
  /** @type {AcornOptions} */
  let acornOptions;
  if (allowEmpty === null || allowEmpty === undefined) {
    allowEmpty = true;
  }
  if (acorn) {
    if (!acorn.parseExpressionAt) {
      throw new Error('Expected a proper `acorn` instance passed in as `options.acorn`');
    }
    acornOptions = Object.assign({
      ecmaVersion: 2024,
      sourceType: 'module'
    }, options_.acornOptions);
  } else if (options_.acornOptions || options_.addResult) {
    throw new Error('Expected an `acorn` instance passed in as `options.acorn`');
  }
  return {
    flow: {
      [123]: {
        name: 'mdxFlowExpression',
        tokenize: tokenizeFlowExpression,
        concrete: true
      }
    },
    text: {
      [123]: {
        name: 'mdxTextExpression',
        tokenize: tokenizeTextExpression
      }
    }
  };

  /**
   * MDX expression (flow).
   *
   * ```markdown
   * > | {Math.PI}
   *     ^^^^^^^^^
   * ```
   *
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeFlowExpression(effects, ok, nok) {
    const self = this;
    return start;

    /**
     * Start of an MDX expression (flow).
     *
     * ```markdown
     * > | {Math.PI}
     *     ^
     * ```
     *
     * @type {State}
     */
    function start(code) {
      // To do: in `markdown-rs`, constructs need to parse the indent themselves.
      // This should also be introduced in `micromark-js`.

      return before(code);
    }

    /**
     * After optional whitespace, before expression.
     *
     * ```markdown
     * > | {Math.PI}
     *     ^
     * ```
     *
     * @type {State}
     */
    function before(code) {
      return factoryMdxExpression.call(self, effects, after, 'mdxFlowExpression', 'mdxFlowExpressionMarker', 'mdxFlowExpressionChunk', acorn, acornOptions, addResult, spread, allowEmpty)(code);
    }

    /**
     * After expression.
     *
     * ```markdown
     * > | {Math.PI}
     *              ^
     * ```
     *
     * @type {State}
     */
    function after(code) {
      return markdownSpace(code) ? factorySpace(effects, end, "whitespace")(code) : end(code);
    }

    /**
     * After expression, after optional whitespace.
     *
     * ```markdown
     * > | {Math.PI}␠␊
     *               ^
     * ```
     *
     * @type {State}
     */
    function end(code) {
      // We want to allow tags directly after expressions.
      //
      // This case is useful:
      //
      // ```mdx
      // <a>{b}</a>
      // ```
      //
      // This case is not (very?) useful:
      //
      // ```mdx
      // {a}<b/>
      // ```
      //
      // …but it would be tougher than needed to disallow.
      //
      // To allow that, here we call the flow construct of
      // `micromark-extension-mdx-jsx`, and there we call this one.
      //
      // It would introduce a cyclical interdependency if we test JSX and
      // expressions here.
      // Because the JSX extension already uses parts of this monorepo, we
      // instead test it there.
      const lessThanValue = self.parser.constructs.flow[60];
      const constructs = Array.isArray(lessThanValue) ? lessThanValue : /* c8 ignore next 3 -- always a list when normalized. */
      lessThanValue ? [lessThanValue] : [];
      const jsxTag = constructs.find(function (d) {
        return d.name === 'mdxJsxFlowTag';
      });

      /* c8 ignore next 3 -- this is tested in `micromark-extension-mdx-jsx` */
      if (code === 60 && jsxTag) {
        return effects.attempt(jsxTag, end, nok)(code);
      }
      return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
    }
  }

  /**
   * MDX expression (text).
   *
   * ```markdown
   * > | a {Math.PI} c.
   *       ^^^^^^^^^
   * ```
   *
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeTextExpression(effects, ok) {
    const self = this;
    return start;

    /**
     * Start of an MDX expression (text).
     *
     * ```markdown
     * > | a {Math.PI} c.
     *       ^
     * ```
     *
     *
     * @type {State}
     */
    function start(code) {
      return factoryMdxExpression.call(self, effects, ok, 'mdxTextExpression', 'mdxTextExpressionMarker', 'mdxTextExpressionChunk', acorn, acornOptions, addResult, spread, allowEmpty, true)(code);
    }
  }
}