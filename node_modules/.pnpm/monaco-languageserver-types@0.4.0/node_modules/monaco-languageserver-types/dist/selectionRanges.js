import { fromRange, toRange } from './range.js';
/**
 * Convert Monaco editor selection ranges to an LSP selection ranges.
 *
 * @param selectionRanges
 *   The Monaco selections range to convert.
 * @returns
 *   The selection ranges as LSP selection range.
 */
export function fromSelectionRanges(selectionRanges) {
    let result;
    for (let index = selectionRanges.length - 1; index >= 0; index -= 1) {
        const parent = result;
        result = {
            range: fromRange(selectionRanges[index].range)
        };
        if (parent) {
            result.parent = parent;
        }
    }
    return result;
}
/**
 * Convert an LSP selection range to Monaco editor selection ranges.
 *
 * @param selectionRange
 *   The LSP selection range to convert.
 * @returns
 *   The selection range as Monaco editor selection ranges.
 */
export function toSelectionRanges(selectionRange) {
    const result = [];
    let current = selectionRange;
    while (current) {
        result.push({
            range: toRange(current.range)
        });
        current = current.parent;
    }
    return result;
}
//# sourceMappingURL=selectionRanges.js.map