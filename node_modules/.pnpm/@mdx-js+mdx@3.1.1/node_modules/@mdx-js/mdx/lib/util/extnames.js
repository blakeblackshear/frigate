import markdownExtensions from 'markdown-extensions'

export const md = markdownExtensions.map(function (d) {
  return '.' + d
})
export const mdx = ['.mdx']
