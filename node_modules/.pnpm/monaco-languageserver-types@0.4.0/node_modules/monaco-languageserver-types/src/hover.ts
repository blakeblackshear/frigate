import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromMarkdownString, toMarkdownString } from './markdownString.js'
import { fromRange, toRange } from './range.js'

/**
 * Convert a Monaco editor hover to an LSP hover.
 *
 * @param hover
 *   The Monaco hover to convert.
 * @returns
 *   The hover as an LSP hover.
 */
export function fromHover(hover: monaco.languages.Hover): lsp.Hover {
  const result: lsp.Hover = {
    contents: fromMarkdownString(hover.contents[0])
  }

  if (hover.range) {
    result.range = fromRange(hover.range)
  }

  return result
}

/**
 * Get value of a marked string.
 *
 * @param value
 *   The marked string to get the value from.
 * @returns
 *   The value of the marked string.
 */
function getDeprecatedMarkupValue(value: lsp.MarkedString): monaco.IMarkdownString {
  if (typeof value === 'string') {
    return { value }
  }

  return { value: `\`\`\`${value.language}\n${value.value}\n\`\`\`` }
}

/**
 * Convert LSP hover item contents to a Monaco markdown string.
 *
 * @param contents
 *   The LSP hover contents to convert.
 * @returns
 *   The hover contents as a Monaco markdown string.
 */
function toHoverContents(
  contents: lsp.MarkedString | lsp.MarkedString[] | lsp.MarkupContent
): monaco.IMarkdownString[] {
  if (typeof contents === 'string' || 'language' in contents) {
    return [getDeprecatedMarkupValue(contents)]
  }

  if (Array.isArray(contents)) {
    return contents.map(getDeprecatedMarkupValue)
  }

  return [toMarkdownString(contents)]
}

/**
 * Convert an LSP hover to a Monaco editor hover.
 *
 * @param hover
 *   The LSP hover to convert.
 * @returns
 *   The hover as Monaco editor hover.
 */
export function toHover(hover: lsp.Hover): monaco.languages.Hover {
  const result: monaco.languages.Hover = {
    contents: toHoverContents(hover.contents)
  }

  if (hover.range) {
    result.range = toRange(hover.range)
  }

  return result
}
