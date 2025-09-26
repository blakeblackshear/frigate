/**
 * Collapse white space.
 *
 * @param {string} value
 *   Value to collapse white space in.
 * @param {Style|Options} [options='js']
 *   Configuration.
 * @returns {string}
 *   Value with collapsed white space.
 */
export function collapseWhiteSpace(
  value: string,
  options?: Style | Options | undefined
): string
export type Style = 'html' | 'js'
/**
 * Configuration.
 */
export type Options = {
  /**
   * Style of white space to support.
   */
  style?: Style | undefined
  /**
   * Whether to collapse white space containing a line ending to that line
   * ending.
   * The default is to collapse to a single space.
   */
  preserveLineEndings?: boolean | undefined
  /**
   * Whether to drop white space at the start and end of `value`.
   * The default is to keep it.
   */
  trim?: boolean | undefined
}
