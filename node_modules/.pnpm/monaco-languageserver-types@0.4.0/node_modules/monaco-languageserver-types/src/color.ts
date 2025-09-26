import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor color to an LSP color.
 *
 * @param color
 *   The Monaco color to convert.
 * @returns
 *   The color as an LSP color.
 */
export function fromColor(color: monaco.languages.IColor): lsp.Color {
  return {
    red: color.red,
    blue: color.blue,
    green: color.green,
    alpha: color.alpha
  }
}

/**
 * Convert an LSP color to a Monaco editor color.
 *
 * @param color
 *   The LSP color to convert.
 * @returns
 *   The color as Monaco editor color.
 */
export function toColor(color: lsp.Color): monaco.languages.IColor {
  return {
    red: color.red,
    blue: color.blue,
    green: color.green,
    alpha: color.alpha
  }
}
