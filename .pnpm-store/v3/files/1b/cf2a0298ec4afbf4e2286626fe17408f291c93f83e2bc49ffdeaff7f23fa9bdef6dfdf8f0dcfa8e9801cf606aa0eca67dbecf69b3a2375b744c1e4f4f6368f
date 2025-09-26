import { fromRange, toRange } from './range.js';
/**
 * Convert Monaco editor linked editing ranges to LSP linked editing ranges.
 *
 * @param linkedEditingRanges
 *   The Monaco linked editing ranges to convert.
 * @returns
 *   The linked editing ranges as LSP linked editing ranges.
 */
export function fromLinkedEditingRanges(linkedEditingRanges) {
    const result = {
        ranges: linkedEditingRanges.ranges.map(fromRange)
    };
    if (linkedEditingRanges.wordPattern) {
        result.wordPattern = linkedEditingRanges.wordPattern.source;
    }
    return result;
}
/**
 * Convert LSP linked editing ranges to Monaco editor linked editing ranges.
 *
 * @param linkedEditingRanges
 *   The LSP linked editing ranges to convert.
 * @returns
 *   The linked editing ranges Monaco editor linked editing ranges.
 */
export function toLinkedEditingRanges(linkedEditingRanges) {
    const result = {
        ranges: linkedEditingRanges.ranges.map(toRange)
    };
    if (linkedEditingRanges.wordPattern != null) {
        result.wordPattern = new RegExp(linkedEditingRanges.wordPattern);
    }
    return result;
}
//# sourceMappingURL=linkedEditingRanges.js.map