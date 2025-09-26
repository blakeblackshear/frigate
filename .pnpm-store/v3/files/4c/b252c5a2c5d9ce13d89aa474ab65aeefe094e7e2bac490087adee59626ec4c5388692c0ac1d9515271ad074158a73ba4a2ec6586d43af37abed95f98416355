import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromRange, toRange } from './range.js'
import { fromSymbolKind, toSymbolKind } from './symbolKind.js'
import { fromSymbolTag, toSymbolTag } from './symbolTag.js'

/**
 * Convert a Monaco editor document symbol to an LSP document symbol.
 *
 * @param documentSymbol
 *   The Monaco document symbol to convert.
 * @returns
 *   The document symbol as an LSP document symbol.
 */
export function fromDocumentSymbol(
  documentSymbol: monaco.languages.DocumentSymbol
): lsp.DocumentSymbol {
  const result: lsp.DocumentSymbol = {
    detail: documentSymbol.detail,
    kind: fromSymbolKind(documentSymbol.kind),
    name: documentSymbol.name,
    range: fromRange(documentSymbol.range),
    selectionRange: fromRange(documentSymbol.selectionRange),
    tags: documentSymbol.tags.map(fromSymbolTag)
  }

  if (documentSymbol.children) {
    result.children = documentSymbol.children.map(fromDocumentSymbol)
  }

  return result
}

/**
 * Convert an LSP document symbol to a Monaco editor document symbol.
 *
 * @param documentSymbol
 *   The LSP document symbol to convert.
 * @returns
 *   The document symbol as Monaco editor document symbol.
 */
export function toDocumentSymbol(
  documentSymbol: lsp.DocumentSymbol
): monaco.languages.DocumentSymbol {
  const result: monaco.languages.DocumentSymbol = {
    detail: documentSymbol.detail ?? '',
    kind: toSymbolKind(documentSymbol.kind),
    name: documentSymbol.name,
    range: toRange(documentSymbol.range),
    selectionRange: toRange(documentSymbol.selectionRange),
    tags: documentSymbol.tags?.map(toSymbolTag) ?? []
  }

  if (documentSymbol.children) {
    result.children = documentSymbol.children.map(toDocumentSymbol)
  }

  return result
}
