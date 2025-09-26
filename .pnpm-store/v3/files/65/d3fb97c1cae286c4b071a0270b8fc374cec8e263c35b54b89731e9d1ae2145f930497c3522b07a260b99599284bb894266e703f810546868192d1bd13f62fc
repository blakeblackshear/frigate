import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromRange, toRange } from './range.js'

/**
 * Convert a Monaco editor single edit operation to an LSP text edit.
 *
 * @param singleEditOperation
 *   The Monaco single edit operation to convert.
 * @returns
 *   The single edit operation as an LSP text edit.
 */
export function fromSingleEditOperation(
  singleEditOperation: monaco.editor.ISingleEditOperation
): lsp.TextEdit {
  return {
    newText: singleEditOperation.text ?? '',
    range: fromRange(singleEditOperation.range)
  }
}

/**
 * Convert an LSP text edit to a Monaco editor single edit operation.
 *
 * @param textEdit
 *   The LSP text edit to convert.
 * @returns
 *   The text edit as Monaco editor single edit operation.
 */
export function toSingleEditOperation(textEdit: lsp.TextEdit): monaco.editor.ISingleEditOperation {
  return {
    range: toRange(textEdit.range),
    text: textEdit.newText
  }
}
