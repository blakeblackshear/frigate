/**
 * Create an extension for `mdast-util-from-markdown` to enable GFM tables in
 * markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable GFM tables.
 */
export function gfmTableFromMarkdown(): FromMarkdownExtension
/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM tables in
 * markdown.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable GFM tables.
 */
export function gfmTableToMarkdown(
  options?: Options | null | undefined
): ToMarkdownExtension
export type InlineCode = import('mdast').InlineCode
export type Table = import('mdast').Table
export type TableCell = import('mdast').TableCell
export type TableRow = import('mdast').TableRow
export type MarkdownTableOptions = import('markdown-table').Options
export type CompileContext = import('mdast-util-from-markdown').CompileContext
export type FromMarkdownExtension = import('mdast-util-from-markdown').Extension
export type FromMarkdownHandle = import('mdast-util-from-markdown').Handle
export type ToMarkdownExtension = import('mdast-util-to-markdown').Options
export type ToMarkdownHandle = import('mdast-util-to-markdown').Handle
export type State = import('mdast-util-to-markdown').State
export type Info = import('mdast-util-to-markdown').Info
/**
 * Configuration.
 */
export type Options = {
  /**
   * Whether to add a space of padding between delimiters and cells (default:
   * `true`).
   */
  tableCellPadding?: boolean | null | undefined
  /**
   * Whether to align the delimiters (default: `true`).
   */
  tablePipeAlign?: boolean | null | undefined
  /**
   * Function to detect the length of table cell content, used when aligning
   * the delimiters between cells (optional).
   */
  stringLength?: MarkdownTableOptions['stringLength'] | null | undefined
}
