export {gfmStrikethroughHtml} from './lib/html.js'
export {gfmStrikethrough} from './lib/syntax.js'

/**
 * Configuration (optional).
 */
export interface Options {
  /**
   * Whether to support strikethrough with a single tilde (default: `true`).
   *
   * Single tildes work on github.com, but are technically prohibited by the
   * GFM spec.
   */
  singleTilde?: boolean | null | undefined
}

/**
 * Augment.
 */
declare module 'micromark-util-types' {
  /**
   * Token types.
   */
  interface TokenTypeMap {
    strikethroughSequence: 'strikethroughSequence'
    strikethroughSequenceTemporary: 'strikethroughSequenceTemporary'
    strikethrough: 'strikethrough'
    strikethroughText: 'strikethroughText'
  }
}
