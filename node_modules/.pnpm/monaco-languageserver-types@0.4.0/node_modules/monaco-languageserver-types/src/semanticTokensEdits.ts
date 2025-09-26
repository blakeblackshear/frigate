import type * as monaco from 'monaco-types'
import { type Writable } from 'type-fest'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromSemanticTokensEdit, toSemanticTokensEdit } from './semanticTokensEdit.js'

/**
 * Convert Monaco editsor semantic tokens edits to an LSP semantic tokens delta.
 *
 * @param semanticTokensEdits
 *   The Monaco semantic tokens edits to convert.
 * @returns
 *   The semantic tokens edits as an LSP semantic tokens delta.
 */
export function fromSemanticTokensEdits(
  semanticTokensEdits: monaco.languages.SemanticTokensEdits
): lsp.SemanticTokensDelta {
  const result: Writable<lsp.SemanticTokensDelta> = {
    edits: semanticTokensEdits.edits.map(fromSemanticTokensEdit)
  }

  if (semanticTokensEdits.resultId != null) {
    result.resultId = semanticTokensEdits.resultId
  }

  return result
}

/**
 * Convert an LSP semantic tokens delta to Monaco editsor semantic tokens edits.
 *
 * @param semanticTokensDelta
 *   The LSP semantic tokens delta to convert.
 * @returns
 *   The semantic tokens delta as Monaco editsor semantic tokens edits.
 */
export function toSemanticTokensEdits(
  semanticTokensDelta: lsp.SemanticTokensDelta
): monaco.languages.SemanticTokensEdits {
  const result: Writable<monaco.languages.SemanticTokensEdits> = {
    edits: semanticTokensDelta.edits.map(toSemanticTokensEdit)
  }

  if (semanticTokensDelta.resultId != null) {
    result.resultId = semanticTokensDelta.resultId
  }

  return result
}
