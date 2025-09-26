import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor symbol kind to an LSP symbol kind.
 *
 * @param symbolKind
 *   The Monaco symbol kind to convert.
 * @returns
 *   The symbol kind as an LSP symbol kind.
 */
export declare function fromSymbolKind(symbolKind: monaco.languages.SymbolKind): lsp.SymbolKind;
/**
 * Convert an LSP symbol kind to a Monaco editor symbol kind.
 *
 * @param symbolKind
 *   The LSP symbol kind to convert.
 * @returns
 *   The symbol kind as Monaco editor symbol kind.
 */
export declare function toSymbolKind(symbolKind: lsp.SymbolKind): monaco.languages.SymbolKind;
//# sourceMappingURL=symbolKind.d.ts.map