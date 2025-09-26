/**
 * Convert a Monaco editor folding range to an LSP folding range.
 *
 * @param foldingRange
 *   The Monaco folding range to convert.
 * @returns
 *   The folding range as an LSP folding range.
 */
export function fromFoldingRange(foldingRange) {
    const result = {
        startLine: foldingRange.start - 1,
        endLine: foldingRange.end - 1
    };
    if (foldingRange.kind != null) {
        result.kind = foldingRange.kind.value;
    }
    return result;
}
/**
 * Convert an LSP folding range to a Monaco editor folding range.
 *
 * @param foldingRange
 *   The LSP folding range to convert.
 * @returns
 *   The folding range as Monaco editor folding range.
 */
export function toFoldingRange(foldingRange) {
    const result = {
        start: foldingRange.startLine + 1,
        end: foldingRange.endLine + 1
    };
    if (foldingRange.kind != null) {
        result.kind = { value: foldingRange.kind };
    }
    return result;
}
//# sourceMappingURL=foldingRange.js.map