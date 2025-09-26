import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor document highlight kind to an LSP document highlight kind.
 *
 * @param kind
 *   The Monaco document highlight kind to convert.
 * @returns
 *   The document highlight kind as an LSP document highlight kind.
 */
export function fromDocumentHighlightKind(
  kind: monaco.languages.DocumentHighlightKind
): lsp.DocumentHighlightKind {
  if (kind === (1 satisfies monaco.languages.DocumentHighlightKind.Read)) {
    return 2 satisfies typeof lsp.DocumentHighlightKind.Read
  }
  if (kind === (2 satisfies monaco.languages.DocumentHighlightKind.Write)) {
    return 3 satisfies typeof lsp.DocumentHighlightKind.Write
  }
  return 1
}

/**
 * Convert an LSP document highlight kind to a Monaco editor document highlight kind.
 *
 * @param kind
 *   The LSP document highlight kind to convert.
 * @returns
 *   The document highlight kind as Monaco editor document highlight kind.
 */
export function toDocumentHighlightKind(
  kind: lsp.DocumentHighlightKind
): monaco.languages.DocumentHighlightKind {
  if (kind === (2 satisfies typeof lsp.DocumentHighlightKind.Read)) {
    return 1 satisfies monaco.languages.DocumentHighlightKind.Read
  }
  if (kind === (3 satisfies typeof lsp.DocumentHighlightKind.Write)) {
    return 2 satisfies monaco.languages.DocumentHighlightKind.Write
  }
  return 0 satisfies monaco.languages.DocumentHighlightKind.Text
}
