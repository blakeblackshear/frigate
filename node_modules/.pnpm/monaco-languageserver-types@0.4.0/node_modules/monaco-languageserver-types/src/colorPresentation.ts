import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromTextEdit, toTextEdit } from './textEdit.js'

/**
 * Convert a Monaco editor color presentation to an LSP color presentation.
 *
 * @param colorPresentation
 *   The Monaco color presentation to convert.
 * @returns
 *   The color presentation as an LSP color presentation.
 */
export function fromColorPresentation(
  colorPresentation: monaco.languages.IColorPresentation
): lsp.ColorPresentation {
  const result: lsp.ColorPresentation = {
    label: colorPresentation.label
  }

  if (colorPresentation.textEdit) {
    result.textEdit = fromTextEdit(colorPresentation.textEdit)
  }

  if (colorPresentation.additionalTextEdits) {
    result.additionalTextEdits = colorPresentation.additionalTextEdits.map(fromTextEdit)
  }

  return result
}

/**
 * Convert an LSP color presentation to a Monaco editor color presentation.
 *
 * @param colorPresentation
 *   The LSP color presentation to convert.
 * @returns
 *   The color presentation as Monaco editor color presentation.
 */
export function toColorPresentation(
  colorPresentation: lsp.ColorPresentation
): monaco.languages.IColorPresentation {
  const result: monaco.languages.IColorPresentation = {
    label: colorPresentation.label
  }

  if (colorPresentation.textEdit) {
    result.textEdit = toTextEdit(colorPresentation.textEdit)
  }

  if (colorPresentation.additionalTextEdits) {
    result.additionalTextEdits = colorPresentation.additionalTextEdits.map(toTextEdit)
  }

  return result
}
