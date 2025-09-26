import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor document highlight kind to an LSP document highlight kind.
 *
 * @param kind
 *   The Monaco document highlight kind to convert.
 * @returns
 *   The document highlight kind as an LSP document highlight kind.
 */
export declare function fromDocumentHighlightKind(kind: monaco.languages.DocumentHighlightKind): lsp.DocumentHighlightKind;
/**
 * Convert an LSP document highlight kind to a Monaco editor document highlight kind.
 *
 * @param kind
 *   The LSP document highlight kind to convert.
 * @returns
 *   The document highlight kind as Monaco editor document highlight kind.
 */
export declare function toDocumentHighlightKind(kind: lsp.DocumentHighlightKind): monaco.languages.DocumentHighlightKind;
//# sourceMappingURL=documentHighlightKind.d.ts.map