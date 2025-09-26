import { fromSemanticTokensEdit, toSemanticTokensEdit } from './semanticTokensEdit.js';
/**
 * Convert Monaco editsor semantic tokens edits to an LSP semantic tokens delta.
 *
 * @param semanticTokensEdits
 *   The Monaco semantic tokens edits to convert.
 * @returns
 *   The semantic tokens edits as an LSP semantic tokens delta.
 */
export function fromSemanticTokensEdits(semanticTokensEdits) {
    const result = {
        edits: semanticTokensEdits.edits.map(fromSemanticTokensEdit)
    };
    if (semanticTokensEdits.resultId != null) {
        result.resultId = semanticTokensEdits.resultId;
    }
    return result;
}
/**
 * Convert an LSP semantic tokens delta to Monaco editsor semantic tokens edits.
 *
 * @param semanticTokensDelta
 *   The LSP semantic tokens delta to convert.
 * @returns
 *   The semantic tokens delta as Monaco editsor semantic tokens edits.
 */
export function toSemanticTokensEdits(semanticTokensDelta) {
    const result = {
        edits: semanticTokensDelta.edits.map(toSemanticTokensEdit)
    };
    if (semanticTokensDelta.resultId != null) {
        result.resultId = semanticTokensDelta.resultId;
    }
    return result;
}
//# sourceMappingURL=semanticTokensEdits.js.map