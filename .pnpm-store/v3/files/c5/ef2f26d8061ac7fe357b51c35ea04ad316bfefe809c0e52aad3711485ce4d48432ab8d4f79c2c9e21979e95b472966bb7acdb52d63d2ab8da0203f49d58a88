import { fromRange, toRange } from './range.js';
/**
 * Convert a Monaco editor text edit to an LSP text edit.
 *
 * @param textEdit
 *   The Monaco text edit to convert.
 * @returns
 *   The text edit as an LSP text edit.
 */
export function fromTextEdit(textEdit) {
    return {
        range: fromRange(textEdit.range),
        newText: textEdit.text
    };
}
/**
 * Convert an LSP text edit to a Monaco editor text edit.
 *
 * @param textEdit
 *   The LSP text edit to convert.
 * @returns
 *   The text edit as Monaco editor text edit.
 */
export function toTextEdit(textEdit) {
    return {
        range: toRange(textEdit.range),
        text: textEdit.newText
    };
}
//# sourceMappingURL=textEdit.js.map