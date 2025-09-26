export default function remarkComment(
  options?: void | Options | undefined
):
  | void
  | import('unified').Transformer<import('mdast').Root, import('mdast').Root>

export const comment: Extension
export const commentHtml: HtmlExtension
export const commentFromMarkdown: FromMarkdownExtension
export function commentToMarkdown(
  options?: Options | undefined
): ToMarkdownExtension

export type Options = { emit?: boolean }
export type Root = import('mdast').Root
export type Extension = import('micromark-util-types').Extension
export type HtmlExtension = import('micromark-util-types').HtmlExtension
export type FromMarkdownExtension = import('mdast-util-from-markdown').Extension
export type ToMarkdownExtension = import('mdast-util-to-markdown').Options
