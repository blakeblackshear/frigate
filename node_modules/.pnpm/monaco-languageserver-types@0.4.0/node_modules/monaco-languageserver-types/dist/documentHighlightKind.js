/**
 * Convert a Monaco editor document highlight kind to an LSP document highlight kind.
 *
 * @param kind
 *   The Monaco document highlight kind to convert.
 * @returns
 *   The document highlight kind as an LSP document highlight kind.
 */
export function fromDocumentHighlightKind(kind) {
    if (kind === 1) {
        return 2;
    }
    if (kind === 2) {
        return 3;
    }
    return 1;
}
/**
 * Convert an LSP document highlight kind to a Monaco editor document highlight kind.
 *
 * @param kind
 *   The LSP document highlight kind to convert.
 * @returns
 *   The document highlight kind as Monaco editor document highlight kind.
 */
export function toDocumentHighlightKind(kind) {
    if (kind === 2) {
        return 1;
    }
    if (kind === 3) {
        return 2;
    }
    return 0;
}
//# sourceMappingURL=documentHighlightKind.js.map