import type * as monaco from 'monaco-types'
import { type Writable } from 'type-fest'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert Monaco editor semantic tokens to LSP semantic tokens.
 *
 * @param semanticTokensEdit
 *   The Monaco semantic tokens to convert.
 * @returns
 *   The semantic tokens as LSP semantic tokens.
 */
export function fromSemanticTokensEdit(
  semanticTokensEdit: monaco.languages.SemanticTokensEdit
): lsp.SemanticTokensEdit {
  const result: lsp.SemanticTokensEdit = {
    deleteCount: semanticTokensEdit.deleteCount,
    start: semanticTokensEdit.start
  }

  if (semanticTokensEdit.data) {
    result.data = [...semanticTokensEdit.data]
  }

  return result
}

/**
 * Convert LSP semantic tokens to Monaco editor semantic tokens.
 *
 * @param semanticTokensEdit
 *   The LSP semantic tokens to convert.
 * @returns
 *   The semantic tokens as Monaco editor semantic tokens.
 */
export function toSemanticTokensEdit(
  semanticTokensEdit: lsp.SemanticTokensEdit
): monaco.languages.SemanticTokensEdit {
  const result: Writable<monaco.languages.SemanticTokensEdit> = {
    deleteCount: semanticTokensEdit.deleteCount,
    start: semanticTokensEdit.start
  }

  if (semanticTokensEdit.data) {
    result.data = Uint32Array.from(semanticTokensEdit.data)
  }

  return result
}
