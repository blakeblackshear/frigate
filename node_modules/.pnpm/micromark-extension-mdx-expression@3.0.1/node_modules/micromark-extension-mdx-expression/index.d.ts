import type {Program} from 'estree'
import type {Acorn, AcornOptions} from 'micromark-util-events-to-acorn'

export {mdxExpression} from './lib/syntax.js'

/**
 * Configuration (optional).
 */
export interface Options {
  /**
   * Acorn parser to use (optional).
   */
  acorn?: Acorn | null | undefined
  /**
   * Configuration for acorn (default: `{ecmaVersion: 2024, locations: true,
   * sourceType: 'module'}`).
   *
   * All fields except `locations` can be set.
   */
  acornOptions?: AcornOptions | null | undefined
  /**
   * Whether to add `estree` fields to tokens with results from acorn (default:
   * `false`).
   */
  addResult?: boolean | null | undefined
  /**
   * Undocumented option to parse only a spread (used by
   * `micromark-extension-mdx-jsx` to parse spread attributes) (default:
   * `false`).
   */
  spread?: boolean | null | undefined
  /**
   * Undocumented option to disallow empty attributes (used by
   * `micromark-extension-mdx-jsx` to prohobit empty attribute values)
   * (default: `false`).
   */
  allowEmpty?: boolean | null | undefined
}

/**
 * Augment types.
 */
declare module 'micromark-util-types' {
  /**
   * Token fields.
   */
  interface Token {
    estree?: Program
  }

  /**
   * Token types.
   */
  interface TokenTypeMap {
    mdxFlowExpression: 'mdxFlowExpression'
    mdxFlowExpressionMarker: 'mdxFlowExpressionMarker'
    mdxFlowExpressionChunk: 'mdxFlowExpressionChunk'

    mdxTextExpression: 'mdxTextExpression'
    mdxTextExpressionMarker: 'mdxTextExpressionMarker'
    mdxTextExpressionChunk: 'mdxTextExpressionChunk'
  }
}
