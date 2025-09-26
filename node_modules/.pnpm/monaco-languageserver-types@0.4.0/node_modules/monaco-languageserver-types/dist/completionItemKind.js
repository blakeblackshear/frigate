/**
 * Convert a Monaco editor completion item kind to an LSP completion item kind.
 *
 * @param kind
 *   The Monaco completion item kind to convert.
 * @returns
 *   The completion item kind as an LSP completion item kind.
 */
export function fromCompletionItemKind(kind) {
    if (kind === 18) {
        return 1;
    }
    if (kind === 0) {
        return 2;
    }
    if (kind === 1) {
        return 3;
    }
    if (kind === 2) {
        return 4;
    }
    if (kind === 3) {
        return 5;
    }
    if (kind === 4) {
        return 6;
    }
    if (kind === 5) {
        return 7;
    }
    if (kind === 7) {
        return 8;
    }
    if (kind === 8) {
        return 9;
    }
    if (kind === 9) {
        return 10;
    }
    if (kind === 12) {
        return 11;
    }
    if (kind === 13) {
        return 12;
    }
    if (kind === 15) {
        return 13;
    }
    if (kind === 17) {
        return 14;
    }
    if (kind === 27) {
        return 15;
    }
    if (kind === 19) {
        return 16;
    }
    if (kind === 20) {
        return 17;
    }
    if (kind === 21) {
        return 18;
    }
    if (kind === 23) {
        return 19;
    }
    if (kind === 16) {
        return 20;
    }
    if (kind === 14) {
        return 21;
    }
    if (kind === 6) {
        return 22;
    }
    if (kind === 10) {
        return 23;
    }
    if (kind === 11) {
        return 24;
    }
    if (kind === 24) {
        return 25;
    }
}
/**
 * Convert an LSP completion item kind to a Monaco editor completion item kind.
 *
 * @param kind
 *   The LSP completion item kind to convert.
 * @returns
 *   The completion item kind as Monaco editor completion item kind.
 */
export function toCompletionItemKind(kind) {
    if (kind === 1) {
        return 18;
    }
    if (kind === 2) {
        return 0;
    }
    if (kind === 3) {
        return 1;
    }
    if (kind === 4) {
        return 2;
    }
    if (kind === 5) {
        return 3;
    }
    if (kind === 6) {
        return 4;
    }
    if (kind === 7) {
        return 5;
    }
    if (kind === 8) {
        return 7;
    }
    if (kind === 9) {
        return 8;
    }
    if (kind === 10) {
        return 9;
    }
    if (kind === 11) {
        return 12;
    }
    if (kind === 12) {
        return 13;
    }
    if (kind === 13) {
        return 15;
    }
    if (kind === 14) {
        return 17;
    }
    if (kind === 15) {
        return 27;
    }
    if (kind === 16) {
        return 19;
    }
    if (kind === 17) {
        return 20;
    }
    if (kind === 18) {
        return 21;
    }
    if (kind === 19) {
        return 23;
    }
    if (kind === 20) {
        return 16;
    }
    if (kind === 21) {
        return 14;
    }
    if (kind === 22) {
        return 6;
    }
    if (kind === 23) {
        return 10;
    }
    if (kind === 24) {
        return 11;
    }
    // Kind === 25
    return 24;
}
//# sourceMappingURL=completionItemKind.js.map