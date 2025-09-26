import type {VFile} from 'vfile'

export {raw} from './lib/index.js'

/**
 * Configuration.
 */
export interface Options {
  /**
   * Corresponding virtual file representing the input document (optional).
   */
  file?: VFile | null | undefined

  /**
   * List of custom hast node types to pass through (as in, keep) (optional).
   *
   * If the passed through nodes have children, those children are expected to
   * be hast again and will be handled.
   */
  passThrough?: Array<string> | null | undefined

  /**
   * Whether to disallow irregular tags in `raw` nodes according to GFM
   * tagfilter
   * (default: `false`).
   *
   * This affects the following tags,
   * grouped by their kind:
   *
   * * `RAWTEXT`: `iframe`, `noembed`, `noframes`, `style`, `xmp`
   * * `RCDATA`: `textarea`, `title`
   * * `SCRIPT_DATA`: `script`
   * * `PLAINTEXT`: `plaintext`
   *
   * When you know that you do not want authors to write these tags,
   * you can enable this option to prevent their use from running amok.
   *
   * See:
   * [*Disallowed Raw HTML* in
   * `cmark-gfm`](https://github.github.com/gfm/#disallowed-raw-html-extension-).
   */
  tagfilter?: boolean | null | undefined
}
