import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor marker tag to an LSP diagnostic tag.
 *
 * @param tag
 *   The Monaco marker tag to convert.
 * @returns
 *   The marker tag as an LSP diagnostic tag.
 */
export function fromMarkerTag(tag: monaco.MarkerTag): lsp.DiagnosticTag {
  return tag
}

/**
 * Convert an LSP diagnostic tag to a Monaco editor marker tag.
 *
 * @param tag
 *   The LSP diagnostic tag to convert.
 * @returns
 *   The diagnostic tag as Monaco editor marker tag.
 */
export function toMarkerTag(tag: lsp.DiagnosticTag): monaco.MarkerTag {
  return tag
}
