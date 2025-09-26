/**
 * Create an HTML extension for `micromark` to support GitHubs weird and
 * useless tagfilter when serializing to HTML.
 *
 * @returns {HtmlExtension}
 *   Extension for `micromark` that can be passed in `htmlExtensions` to support
 *   GitHubs weird and useless tagfilter when serializing to HTML.
 */
export function gfmTagfilterHtml(): HtmlExtension
export type CompileContext = import('micromark-util-types').CompileContext
export type HtmlExtension = import('micromark-util-types').HtmlExtension
export type Token = import('micromark-util-types').Token
