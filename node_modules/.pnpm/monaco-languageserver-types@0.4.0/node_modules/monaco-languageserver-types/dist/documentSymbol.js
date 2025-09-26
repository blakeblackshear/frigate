import { fromRange, toRange } from './range.js';
import { fromSymbolKind, toSymbolKind } from './symbolKind.js';
import { fromSymbolTag, toSymbolTag } from './symbolTag.js';
/**
 * Convert a Monaco editor document symbol to an LSP document symbol.
 *
 * @param documentSymbol
 *   The Monaco document symbol to convert.
 * @returns
 *   The document symbol as an LSP document symbol.
 */
export function fromDocumentSymbol(documentSymbol) {
    const result = {
        detail: documentSymbol.detail,
        kind: fromSymbolKind(documentSymbol.kind),
        name: documentSymbol.name,
        range: fromRange(documentSymbol.range),
        selectionRange: fromRange(documentSymbol.selectionRange),
        tags: documentSymbol.tags.map(fromSymbolTag)
    };
    if (documentSymbol.children) {
        result.children = documentSymbol.children.map(fromDocumentSymbol);
    }
    return result;
}
/**
 * Convert an LSP document symbol to a Monaco editor document symbol.
 *
 * @param documentSymbol
 *   The LSP document symbol to convert.
 * @returns
 *   The document symbol as Monaco editor document symbol.
 */
export function toDocumentSymbol(documentSymbol) {
    var _a, _b, _c;
    const result = {
        detail: (_a = documentSymbol.detail) !== null && _a !== void 0 ? _a : '',
        kind: toSymbolKind(documentSymbol.kind),
        name: documentSymbol.name,
        range: toRange(documentSymbol.range),
        selectionRange: toRange(documentSymbol.selectionRange),
        tags: (_c = (_b = documentSymbol.tags) === null || _b === void 0 ? void 0 : _b.map(toSymbolTag)) !== null && _c !== void 0 ? _c : []
    };
    if (documentSymbol.children) {
        result.children = documentSymbol.children.map(toDocumentSymbol);
    }
    return result;
}
//# sourceMappingURL=documentSymbol.js.map