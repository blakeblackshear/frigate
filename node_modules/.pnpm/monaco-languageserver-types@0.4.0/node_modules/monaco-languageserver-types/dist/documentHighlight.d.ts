import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor document highlight to an LSP document highlight.
 *
 * @param documentHighlight
 *   The Monaco document highlight to convert.
 * @returns
 *   The document highlight as an LSP document highlight.
 */
export declare function fromDocumentHighlight(documentHighlight: monaco.languages.DocumentHighlight): lsp.DocumentHighlight;
/**
 * Convert an LSP document highlight to a Monaco editor document highlight.
 *
 * @param documentHighlight
 *   The LSP document highlight to convert.
 * @returns
 *   The document highlight as Monaco editor document highlight.
 */
export declare function toDocumentHighlight(documentHighlight: lsp.DocumentHighlight): monaco.languages.DocumentHighlight;
//# sourceMappingURL=documentHighlight.d.ts.map