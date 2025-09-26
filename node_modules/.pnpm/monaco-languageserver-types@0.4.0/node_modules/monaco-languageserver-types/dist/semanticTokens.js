/**
 * Convert Monaco editor semantic tokens to LSP semantic tokens.
 *
 * @param semanticTokens
 *   The Monaco semantic tokens to convert.
 * @returns
 *   The semantic tokens as LSP semantic tokens.
 */
export function fromSemanticTokens(semanticTokens) {
    const result = {
        data: [...semanticTokens.data]
    };
    if (semanticTokens.resultId != null) {
        result.resultId = semanticTokens.resultId;
    }
    return result;
}
/**
 * Convert LSP semantic tokens to Monaco editor semantic tokens.
 *
 * @param semanticTokens
 *   The LSP semantic tokens to convert.
 * @returns
 *   The semantic tokens as Monaco editor semantic tokens.
 */
export function toSemanticTokens(semanticTokens) {
    const result = {
        data: Uint32Array.from(semanticTokens.data)
    };
    if (semanticTokens.resultId != null) {
        result.resultId = semanticTokens.resultId;
    }
    return result;
}
//# sourceMappingURL=semanticTokens.js.map