import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor completion list to an LSP completion list.
 *
 * @param completionList
 *   The Monaco completion list to convert.
 * @returns
 *   The completion list as an LSP completion list.
 */
export declare function fromCompletionList(completionList: monaco.languages.CompletionList): lsp.CompletionList;
interface ToCompletionListOptions {
    /**
     * A fallback range to use in case a completion item doesn’t provide one.
     */
    range: monaco.IRange;
}
/**
 * Convert an LSP completion list to a Monaco editor completion list.
 *
 * @param completionList
 *   The LSP completion list to convert.
 * @param options
 *   Additional options needed to construct the Monaco completion list.
 * @returns
 *   The completion list as Monaco editor completion list.
 */
export declare function toCompletionList(completionList: lsp.CompletionList, options: ToCompletionListOptions): monaco.languages.CompletionList;
export {};
//# sourceMappingURL=completionList.d.ts.map