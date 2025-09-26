/**
 * Convert Monaco editor semantic tokens to LSP semantic tokens.
 *
 * @param semanticTokensEdit
 *   The Monaco semantic tokens to convert.
 * @returns
 *   The semantic tokens as LSP semantic tokens.
 */
export function fromSemanticTokensEdit(semanticTokensEdit) {
    const result = {
        deleteCount: semanticTokensEdit.deleteCount,
        start: semanticTokensEdit.start
    };
    if (semanticTokensEdit.data) {
        result.data = [...semanticTokensEdit.data];
    }
    return result;
}
/**
 * Convert LSP semantic tokens to Monaco editor semantic tokens.
 *
 * @param semanticTokensEdit
 *   The LSP semantic tokens to convert.
 * @returns
 *   The semantic tokens as Monaco editor semantic tokens.
 */
export function toSemanticTokensEdit(semanticTokensEdit) {
    const result = {
        deleteCount: semanticTokensEdit.deleteCount,
        start: semanticTokensEdit.start
    };
    if (semanticTokensEdit.data) {
        result.data = Uint32Array.from(semanticTokensEdit.data);
    }
    return result;
}
//# sourceMappingURL=semanticTokensEdit.js.map