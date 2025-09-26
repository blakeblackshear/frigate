import { fromCompletionItem, toCompletionItem } from './completionItem.js';
/**
 * Convert a Monaco editor completion list to an LSP completion list.
 *
 * @param completionList
 *   The Monaco completion list to convert.
 * @returns
 *   The completion list as an LSP completion list.
 */
export function fromCompletionList(completionList) {
    return {
        isIncomplete: Boolean(completionList.incomplete),
        items: completionList.suggestions.map(fromCompletionItem)
    };
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
export function toCompletionList(completionList, options) {
    return {
        incomplete: Boolean(completionList.isIncomplete),
        suggestions: completionList.items.map((item) => toCompletionItem(item, { range: options.range, itemDefaults: completionList.itemDefaults }))
    };
}
//# sourceMappingURL=completionList.js.map