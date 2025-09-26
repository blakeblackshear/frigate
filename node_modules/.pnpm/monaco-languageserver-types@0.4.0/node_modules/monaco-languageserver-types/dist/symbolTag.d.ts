import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor symbol tag to an LSP symbol tag.
 *
 * @param symbolTag
 *   The Monaco symbol tag to convert.
 * @returns
 *   The symbol tag as an LSP symbol tag.
 */
export declare function fromSymbolTag(symbolTag: monaco.languages.SymbolTag): lsp.SymbolTag;
/**
 * Convert an LSP symbol tag to a Monaco editor symbol tag.
 *
 * @param symbolTag
 *   The LSP symbol tag to convert.
 * @returns
 *   The symbol tag as Monaco editor symbol tag.
 */
export declare function toSymbolTag(symbolTag: lsp.SymbolTag): monaco.languages.SymbolTag;
//# sourceMappingURL=symbolTag.d.ts.map