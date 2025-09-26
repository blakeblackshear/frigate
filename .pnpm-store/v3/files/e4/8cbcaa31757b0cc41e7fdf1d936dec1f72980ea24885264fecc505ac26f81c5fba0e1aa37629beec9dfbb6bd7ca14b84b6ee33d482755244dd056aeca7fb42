/**
 * Convert a Monaco editor completion trigger kind to an LSP completion trigger kind.
 *
 * @param kind
 *   The Monaco completion trigger kind to convert.
 * @returns
 *   The completion trigger kind as an LSP completion trigger kind.
 */
export function fromCompletionTriggerKind(kind) {
    if (kind === 0) {
        return 1;
    }
    if (kind === 1) {
        return 2;
    }
    // Kind === TriggerForIncompleteCompletions.
    return 3;
}
/**
 * Convert an LSP completion trigger kind to a Monaco editor completion trigger kind.
 *
 * @param kind
 *   The LSP completion trigger kind to convert.
 * @returns
 *   The completion trigger kind as Monaco editor completion trigger kind.
 */
export function toCompletionTriggerKind(kind) {
    if (kind === 1) {
        return 0;
    }
    if (kind === 2) {
        return 1;
    }
    // Kind === 3
    return 2;
}
//# sourceMappingURL=completionTriggerKind.js.map