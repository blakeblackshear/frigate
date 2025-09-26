import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor completion item to an LSP completion item.
 *
 * @param completionItem
 *   The Monaco completion item to convert.
 * @returns
 *   The completion item as an LSP completion item.
 */
export declare function fromCompletionItem(completionItem: monaco.languages.CompletionItem): lsp.CompletionItem;
interface ToCompletionItemOptions {
    /**
     * The item defaults of a completion list.
     */
    itemDefaults?: lsp.CompletionList['itemDefaults'] | undefined;
    /**
     * A fallback range to use in case the completion item doesn’t provide one.
     */
    range: monaco.languages.CompletionItem['range'];
}
/**
 * Convert an LSP completion item to a Monaco editor completion item.
 *
 * @param completionItem
 *   The LSP completion item to convert.
 * @param options
 *   Additional options needed to construct the Monaco completion item.
 * @returns
 *   The completion item as Monaco editor completion item.
 */
export declare function toCompletionItem(completionItem: lsp.CompletionItem, options: ToCompletionItemOptions): monaco.languages.CompletionItem;
export {};
//# sourceMappingURL=completionItem.d.ts.map