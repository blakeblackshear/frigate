import { fromCommand, toCommand } from './command.js';
import { fromCompletionItemKind, toCompletionItemKind } from './completionItemKind.js';
import { fromCompletionItemTag, toCompletionItemTag } from './completionItemTag.js';
import { fromMarkdownString, toMarkdownString } from './markdownString.js';
import { fromRange, toRange } from './range.js';
import { fromSingleEditOperation, toSingleEditOperation } from './singleEditOperation.js';
/**
 * Convert a Monaco editor completion item range to an LSP completion item text edit.
 *
 * @param edit
 *   The Monaco completion item range to convert.
 * @param newText
 *   The text of the text edit.
 * @returns
 *   The completion item range as an LSP completion item text edit.
 */
function fromCompletionItemRange(edit, newText) {
    if ('insert' in edit) {
        return {
            newText,
            insert: fromRange(edit.insert),
            replace: fromRange(edit.replace)
        };
    }
    return {
        newText,
        range: fromRange(edit)
    };
}
/**
 * Convert a Monaco editor completion item to an LSP completion item.
 *
 * @param completionItem
 *   The Monaco completion item to convert.
 * @returns
 *   The completion item as an LSP completion item.
 */
export function fromCompletionItem(completionItem) {
    const result = {
        kind: fromCompletionItemKind(completionItem.kind),
        label: typeof completionItem.label === 'string' ? completionItem.label : completionItem.label.label,
        textEdit: fromCompletionItemRange(completionItem.range, completionItem.insertText)
    };
    if (completionItem.additionalTextEdits) {
        result.additionalTextEdits = completionItem.additionalTextEdits.map(fromSingleEditOperation);
    }
    if (completionItem.command) {
        result.command = fromCommand(completionItem.command);
    }
    if (completionItem.commitCharacters) {
        result.commitCharacters = completionItem.commitCharacters;
    }
    if (completionItem.detail != null) {
        result.detail = completionItem.detail;
    }
    if (typeof completionItem.documentation === 'string') {
        result.documentation = completionItem.documentation;
    }
    else if (completionItem.documentation) {
        result.documentation = fromMarkdownString(completionItem.documentation);
    }
    if (completionItem.filterText != null) {
        result.filterText = completionItem.filterText;
    }
    if (completionItem.insertTextRules ===
        4) {
        result.insertTextFormat = 2;
    }
    else if (completionItem.insertTextRules ===
        1) {
        result.insertTextMode = 2;
    }
    if (completionItem.preselect != null) {
        result.preselect = completionItem.preselect;
    }
    if (completionItem.sortText != null) {
        result.sortText = completionItem.sortText;
    }
    if (completionItem.tags) {
        result.tags = completionItem.tags.map(fromCompletionItemTag);
    }
    return result;
}
/**
 * Convert an LSP completion item text edit to a Monaco editor range.
 *
 * @param edit
 *   The LSP completion item text edit to convert.
 * @returns
 *   The completion item text edit as Monaco editor range.
 */
function toCompletionItemRange(edit) {
    if ('range' in edit) {
        return toRange(edit.range);
    }
    if ('insert' in edit && 'replace' in edit) {
        return {
            insert: toRange(edit.insert),
            replace: toRange(edit.replace)
        };
    }
    return toRange(edit);
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
export function toCompletionItem(completionItem, options) {
    var _a, _b, _c, _d, _e;
    const itemDefaults = (_a = options.itemDefaults) !== null && _a !== void 0 ? _a : {};
    const textEdit = (_b = completionItem.textEdit) !== null && _b !== void 0 ? _b : itemDefaults.editRange;
    const commitCharacters = (_c = completionItem.commitCharacters) !== null && _c !== void 0 ? _c : itemDefaults.commitCharacters;
    const insertTextFormat = (_d = completionItem.insertTextFormat) !== null && _d !== void 0 ? _d : itemDefaults.insertTextFormat;
    const insertTextMode = (_e = completionItem.insertTextMode) !== null && _e !== void 0 ? _e : itemDefaults.insertTextMode;
    let text = completionItem.insertText;
    let range;
    if (textEdit) {
        range = toCompletionItemRange(textEdit);
        if ('newText' in textEdit) {
            text = textEdit.newText;
        }
    }
    else {
        range = { ...options.range };
    }
    const result = {
        insertText: text !== null && text !== void 0 ? text : completionItem.label,
        kind: completionItem.kind == null
            ? 18
            : toCompletionItemKind(completionItem.kind),
        label: completionItem.label,
        range
    };
    if (completionItem.additionalTextEdits) {
        result.additionalTextEdits = completionItem.additionalTextEdits.map(toSingleEditOperation);
    }
    if (completionItem.command) {
        result.command = toCommand(completionItem.command);
    }
    if (commitCharacters) {
        result.commitCharacters = commitCharacters;
    }
    if (completionItem.detail != null) {
        result.detail = completionItem.detail;
    }
    if (typeof completionItem.documentation === 'string') {
        result.documentation = completionItem.documentation;
    }
    else if (completionItem.documentation) {
        result.documentation = toMarkdownString(completionItem.documentation);
    }
    if (completionItem.filterText != null) {
        result.filterText = completionItem.filterText;
    }
    if (insertTextFormat === 2) {
        result.insertTextRules =
            4;
    }
    else if (insertTextMode === 2) {
        result.insertTextRules =
            1;
    }
    if (completionItem.preselect != null) {
        result.preselect = completionItem.preselect;
    }
    if (completionItem.sortText != null) {
        result.sortText = completionItem.sortText;
    }
    if (completionItem.tags) {
        result.tags = completionItem.tags.map(toCompletionItemTag);
    }
    return result;
}
//# sourceMappingURL=completionItem.js.map