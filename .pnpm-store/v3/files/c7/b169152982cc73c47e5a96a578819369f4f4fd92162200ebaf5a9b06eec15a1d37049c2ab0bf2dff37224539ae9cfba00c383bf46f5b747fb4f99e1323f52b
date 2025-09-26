/**
 * Simplify one or more options.
 *
 * @param {Options | null | undefined} [options='yaml']
 *   Configuration (default: `'yaml'`).
 * @returns {Array<Matter>}
 *   List of matters.
 */
export function matters(options?: Options | null | undefined): Array<Matter>
/**
 * Known name of a frontmatter style.
 */
export type Preset = 'toml' | 'yaml'
/**
 * Sequence.
 *
 * Depending on how this structure is used, it reflects a marker or a fence.
 */
export type Info = {
  /**
   *   Closing.
   */
  close: string
  /**
   *   Opening.
   */
  open: string
}
/**
 * Fields describing a kind of matter.
 */
export type MatterProps = {
  /**
   *   Node type to tokenize as.
   */
  type: string
  /**
   * Whether matter can be found anywhere in the document, normally, only matter
   * at the start of the document is recognized.
   *
   * > 👉 **Note**: using this is a terrible idea.
   * > It’s called frontmatter, not matter-in-the-middle or so.
   * > This makes your markdown less portable.
   */
  anywhere?: boolean | null | undefined
}
/**
 * Marker configuration.
 */
export type MarkerProps = {
  /**
   *   Character repeated 3 times, used as complete fences.
   *
   *   For example the character `'-'` will result in `'---'` being used as the
   *   fence
   *   Pass `open` and `close` to specify different characters for opening and
   *   closing fences.
   */
  marker: Info | string
  /**
   * If `marker` is set, `fence` must not be set.
   */
  fence?: never
}
/**
 * Fence configuration.
 */
export type FenceProps = {
  /**
   *   Complete fences.
   *
   *   This can be used when fences contain different characters or lengths
   *   other than 3.
   *   Pass `open` and `close` to interface to specify different characters for opening and
   *   closing fences.
   */
  fence: Info | string
  /**
   * If `fence` is set, `marker` must not be set.
   */
  marker?: never
}
/**
 * Fields describing a kind of matter.
 *
 * > 👉 **Note**: using `anywhere` is a terrible idea.
 * > It’s called frontmatter, not matter-in-the-middle or so.
 * > This makes your markdown less portable.
 *
 * > 👉 **Note**: `marker` and `fence` are mutually exclusive.
 * > If `marker` is set, `fence` must not be set, and vice versa.
 */
export type Matter = (MatterProps & FenceProps) | (MatterProps & MarkerProps)
/**
 * Configuration.
 */
export type Options = Matter | Preset | Array<Matter | Preset>
