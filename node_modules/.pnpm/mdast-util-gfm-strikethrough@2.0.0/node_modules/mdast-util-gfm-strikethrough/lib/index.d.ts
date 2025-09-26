/**
 * Create an extension for `mdast-util-from-markdown` to enable GFM
 * strikethrough in markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable GFM strikethrough.
 */
export function gfmStrikethroughFromMarkdown(): FromMarkdownExtension
/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM
 * strikethrough in markdown.
 *
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable GFM strikethrough.
 */
export function gfmStrikethroughToMarkdown(): ToMarkdownExtension
export type Delete = import('mdast').Delete
export type CompileContext = import('mdast-util-from-markdown').CompileContext
export type FromMarkdownExtension = import('mdast-util-from-markdown').Extension
export type FromMarkdownHandle = import('mdast-util-from-markdown').Handle
export type ConstructName = import('mdast-util-to-markdown').ConstructName
export type ToMarkdownHandle = import('mdast-util-to-markdown').Handle
export type ToMarkdownExtension = import('mdast-util-to-markdown').Options
