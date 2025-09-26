import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor marker severity to an LSP diagnostic severity.
 *
 * @param severity
 *   The Monaco marker severity to convert.
 * @returns
 *   The marker severity as an LSP diagnostic severity.
 */
export function fromMarkerSeverity(severity: monaco.MarkerSeverity): lsp.DiagnosticSeverity {
  if (severity === (1 satisfies monaco.MarkerSeverity.Hint)) {
    return 4 satisfies typeof lsp.DiagnosticSeverity.Hint
  }
  if (severity === (2 satisfies monaco.MarkerSeverity.Info)) {
    return 3 satisfies typeof lsp.DiagnosticSeverity.Information
  }
  if (severity === (4 satisfies monaco.MarkerSeverity.Warning)) {
    return 2 satisfies typeof lsp.DiagnosticSeverity.Warning
  }
  return 1 satisfies typeof lsp.DiagnosticSeverity.Error
}

/**
 * Convert an LSP diagnostic severity to a Monaco editor marker severity.
 *
 * @param severity
 *   The LSP diagnostic severity to convert.
 * @returns
 *   The diagnostic severity as Monaco editor marker severity.
 */
export function toMarkerSeverity(severity: lsp.DiagnosticSeverity): monaco.MarkerSeverity {
  if (severity === (4 satisfies typeof lsp.DiagnosticSeverity.Hint)) {
    return 1 satisfies monaco.MarkerSeverity.Hint
  }
  if (severity === (3 satisfies typeof lsp.DiagnosticSeverity.Information)) {
    return 2 satisfies monaco.MarkerSeverity.Info
  }
  if (severity === (2 satisfies typeof lsp.DiagnosticSeverity.Warning)) {
    return 4 satisfies monaco.MarkerSeverity.Warning
  }
  return 8 satisfies monaco.MarkerSeverity.Error
}
