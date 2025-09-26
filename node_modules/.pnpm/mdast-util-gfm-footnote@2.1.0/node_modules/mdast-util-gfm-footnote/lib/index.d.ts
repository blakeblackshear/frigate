/**
 * Create an extension for `mdast-util-from-markdown` to enable GFM footnotes
 * in markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown`.
 */
export function gfmFootnoteFromMarkdown(): FromMarkdownExtension;
/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM footnotes
 * in markdown.
 *
 * @param {ToMarkdownOptions | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown`.
 */
export function gfmFootnoteToMarkdown(options?: ToMarkdownOptions | null | undefined): ToMarkdownExtension;
import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { ToMarkdownOptions } from 'mdast-util-gfm-footnote';
import type { Options as ToMarkdownExtension } from 'mdast-util-to-markdown';
//# sourceMappingURL=index.d.ts.map