/* eslint-disable import/no-extraneous-dependencies */
import type {parseExpressionAt, parse, Options as AcornOptions} from 'acorn'
import type {
  Event,
  Point as MicromarkPoint,
  TokenType
} from 'micromark-util-types'

export {eventsToAcorn} from './lib/index.js'

export type {Options as AcornOptions} from 'acorn'

/**
 * Acorn-like interface.
 */
export interface Acorn {
  /**
   * Parse an expression.
   */
  parseExpressionAt: typeof parseExpressionAt
  /**
   * Parse a program.
   */
  parse: typeof parse
}

/**
 * Configuration.
 */
export interface Options {
  /**
   * Typically `acorn`, object with `parse` and `parseExpressionAt` fields (required).
   */
  acorn: Acorn
  /**
   * Configuration for `acorn` (optional).
   */
  acornOptions?: AcornOptions | null | undefined
  /**
   * Whether an empty expression is allowed (programs are always allowed to
   * be empty) (default: `false`).
   */
  allowEmpty?: boolean | null | undefined
  /**
   * Whether this is a program or expression (default: `false`).
   */
  expression?: boolean | null | undefined
  /**
   * Text to place before events (default: `''`).
   */
  prefix?: string | null | undefined
  /**
   * Place where events start (optional, required if `allowEmpty`).
   */
  start?: MicromarkPoint | null | undefined
  /**
   * Text to place after events (default: `''`).
   */
  suffix?: string | null | undefined
  /**
   * Names of (void) tokens to consider as data; `'lineEnding'` is always
   * included (required).
   */
  tokenTypes: Array<TokenType>
}
