import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromColor, toColor } from './color.js'
import { fromRange, toRange } from './range.js'

/**
 * Convert a Monaco editor color information to an LSP color information.
 *
 * @param colorInformation
 *   The Monaco color information to convert.
 * @returns
 *   The color information as an LSP color information.
 */
export function fromColorInformation(
  colorInformation: monaco.languages.IColorInformation
): lsp.ColorInformation {
  return {
    range: fromRange(colorInformation.range),
    color: fromColor(colorInformation.color)
  }
}

/**
 * Convert an LSP color information to a Monaco editor color information.
 *
 * @param colorInformation
 *   The LSP color information to convert.
 * @returns
 *   The color information as Monaco editor color information.
 */
export function toColorInformation(
  colorInformation: lsp.ColorInformation
): monaco.languages.IColorInformation {
  return {
    range: toRange(colorInformation.range),
    color: toColor(colorInformation.color)
  }
}
