/**
 * Create an extension for `micromark` to enable frontmatter syntax.
 *
 * @param {Options | null | undefined} [options='yaml']
 *   Configuration (default: `'yaml'`).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions`, to
 *   enable frontmatter syntax.
 */
export function frontmatter(options?: Options | null | undefined): Extension
export type Construct = import('micromark-util-types').Construct
export type ConstructRecord = import('micromark-util-types').ConstructRecord
export type Extension = import('micromark-util-types').Extension
export type State = import('micromark-util-types').State
export type TokenType = import('micromark-util-types').TokenType
export type TokenizeContext = import('micromark-util-types').TokenizeContext
export type Tokenizer = import('micromark-util-types').Tokenizer
export type Info = import('./to-matters.js').Info
export type Matter = import('./to-matters.js').Matter
export type Options = import('./to-matters.js').Options
