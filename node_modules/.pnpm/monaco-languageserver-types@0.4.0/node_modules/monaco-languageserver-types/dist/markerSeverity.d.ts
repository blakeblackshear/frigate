import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor marker severity to an LSP diagnostic severity.
 *
 * @param severity
 *   The Monaco marker severity to convert.
 * @returns
 *   The marker severity as an LSP diagnostic severity.
 */
export declare function fromMarkerSeverity(severity: monaco.MarkerSeverity): lsp.DiagnosticSeverity;
/**
 * Convert an LSP diagnostic severity to a Monaco editor marker severity.
 *
 * @param severity
 *   The LSP diagnostic severity to convert.
 * @returns
 *   The diagnostic severity as Monaco editor marker severity.
 */
export declare function toMarkerSeverity(severity: lsp.DiagnosticSeverity): monaco.MarkerSeverity;
//# sourceMappingURL=markerSeverity.d.ts.map