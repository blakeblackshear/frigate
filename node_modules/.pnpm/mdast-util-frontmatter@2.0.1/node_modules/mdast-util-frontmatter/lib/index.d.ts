/**
 * Create an extension for `mdast-util-from-markdown`.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown`.
 */
export function frontmatterFromMarkdown(options?: Options | null | undefined): FromMarkdownExtension;
/**
 * Create an extension for `mdast-util-to-markdown`.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown`.
 */
export function frontmatterToMarkdown(options?: Options | null | undefined): ToMarkdownExtension;
export type Literal = import('mdast').Literal;
export type CompileContext = import('mdast-util-from-markdown').CompileContext;
export type FromMarkdownExtension = import('mdast-util-from-markdown').Extension;
export type FromMarkdownHandle = import('mdast-util-from-markdown').Handle;
export type ToMarkdownExtension = import('mdast-util-to-markdown').Options;
export type Info = import('micromark-extension-frontmatter').Info;
export type Matter = import('micromark-extension-frontmatter').Matter;
export type Options = import('micromark-extension-frontmatter').Options;
