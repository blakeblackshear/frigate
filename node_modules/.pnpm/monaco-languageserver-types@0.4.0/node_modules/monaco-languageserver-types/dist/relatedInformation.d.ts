import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor related information to an LSP diagnostic related information.
 *
 * @param relatedInformation
 *   The Monaco related information to convert.
 * @returns
 *   The related information as an LSP diagnostic related information.
 */
export declare function fromRelatedInformation(relatedInformation: monaco.editor.IRelatedInformation): lsp.DiagnosticRelatedInformation;
/**
 * Convert an LSP diagnostic related information to a Monaco editor related information.
 *
 * @param relatedInformation
 *   The LSP diagnostic related information to convert.
 * @returns
 *   The diagnostic related information as Monaco editor related information.
 */
export declare function toRelatedInformation(relatedInformation: lsp.DiagnosticRelatedInformation): monaco.editor.IRelatedInformation;
//# sourceMappingURL=relatedInformation.d.ts.map