import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'
import { URI } from 'vscode-uri'

import { fromRange, toRange } from './range.js'

/**
 * Convert a Monaco editor link to an LSP document link.
 *
 * @param link
 *   The Monaco link to convert.
 * @returns
 *   The link as an LSP document link.
 */
export function fromLink(link: monaco.languages.ILink): lsp.DocumentLink {
  const result: lsp.DocumentLink = {
    range: fromRange(link.range)
  }

  if (link.tooltip != null) {
    result.tooltip = link.tooltip
  }

  if (link.url != null) {
    result.target = String(link.url)
  }

  return result
}

/**
 * Convert an LSP document link to a Monaco editor link.
 *
 * @param documentLink
 *   The LSP document link to convert.
 * @returns
 *   The document link as Monaco editor link.
 */
export function toLink(documentLink: lsp.DocumentLink): monaco.languages.ILink {
  const result: monaco.languages.ILink = {
    range: toRange(documentLink.range)
  }

  if (documentLink.tooltip != null) {
    result.tooltip = documentLink.tooltip
  }

  if (documentLink.target != null) {
    result.url = URI.parse(documentLink.target)
  }

  return result
}
